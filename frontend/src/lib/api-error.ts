import type { ApiErrorCode } from '@/types/api';

export interface ApiErrorOptions {
  status: number;
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown> | null;
  requestId?: string | null;
  retryAfterSeconds?: number | null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: Record<string, unknown> | null;
  readonly requestId: string | null;
  readonly retryAfterSeconds: number | null;

  constructor({
    status,
    code,
    message,
    details = null,
    requestId = null,
    retryAfterSeconds = null,
  }: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  getFieldErrors(): Record<string, string[]> {
    if (!this.details) {
      return {};
    }

    const fieldErrors: Record<string, string[]> = {};

    for (const [field, value] of Object.entries(this.details)) {
      if (Array.isArray(value)) {
        const messages = value.filter(
          (item): item is string => typeof item === 'string' && item.length > 0,
        );

        if (messages.length > 0) {
          fieldErrors[field] = messages;
        }
      }
    }

    return fieldErrors;
  }

  getFirstFieldError(field: string): string | undefined {
    return this.getFieldErrors()[field]?.[0];
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function mapStatusToErrorCode(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'bad_request';
    case 401:
      return 'unauthenticated';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 405:
      return 'method_not_allowed';
    case 409:
      return 'conflict';
    case 419:
      return 'csrf_token_mismatch';
    case 422:
      return 'validation_failed';
    case 429:
      return 'rate_limited';
    case 503:
      return 'service_unavailable';
    default:
      return status >= 500 ? 'internal_error' : 'unknown_error';
  }
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'The request could not be processed.';
    case 401:
      return 'Please log in to continue.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 419:
      return 'Your session expired. Please try again.';
    case 422:
      return 'Please check the highlighted fields and try again.';
    case 429:
      return 'Too many attempts. Please try again shortly.';
    case 503:
      return 'The service is temporarily unavailable. Please try again shortly.';
    default:
      return status >= 500
        ? 'Something went wrong on our side. Please try again.'
        : 'An unexpected error occurred.';
  }
}

function parseRetryAfter(headerValue: string | null): number | null {
  if (!headerValue) {
    return null;
  }

  const trimmed = headerValue.trim();

  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  const timestamp = Date.parse(trimmed);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}

export function normalizeHttpError(
  response: Response,
  payload: unknown,
): ApiError {
  const headerRequestId = response.headers.get('X-Request-Id');
  const retryAfterSeconds = parseRetryAfter(
    response.headers.get('Retry-After'),
  );

  if (isRecord(payload) && isRecord(payload.error)) {
    const rawError = payload.error;
    const code =
      typeof rawError.code === 'string' && rawError.code.length > 0
        ? rawError.code
        : mapStatusToErrorCode(response.status);
    const message =
      typeof rawError.message === 'string' && rawError.message.length > 0
        ? rawError.message
        : defaultMessageForStatus(response.status);
    const details = isRecord(rawError.details) ? rawError.details : null;
    const requestId =
      typeof rawError.request_id === 'string' && rawError.request_id.length > 0
        ? rawError.request_id
        : headerRequestId;

    return new ApiError({
      status: response.status,
      code,
      message,
      details,
      requestId,
      retryAfterSeconds,
    });
  }

  return new ApiError({
    status: response.status,
    code: mapStatusToErrorCode(response.status),
    message: defaultMessageForStatus(response.status),
    requestId: headerRequestId,
    retryAfterSeconds,
  });
}

export function normalizeNetworkError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError({
    status: 0,
    code: 'network_error',
    message: 'Unable to reach the server. Check your connection and try again.',
  });
}
