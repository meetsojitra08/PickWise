import {
  ApiError,
  normalizeHttpError,
  normalizeNetworkError,
} from '@/lib/api-error';

const API_BASE_URL = '/api/v1';
const SANCTUM_CSRF_ENDPOINT = '/sanctum/csrf-cookie';
const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type QueryParamPrimitive = string | number | boolean | null | undefined;
export type QueryParamValue =
  QueryParamPrimitive | readonly (string | number | boolean)[];

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, QueryParamValue>;
  headers?: HeadersInit;
  signal?: AbortSignal;
  skipCsrf?: boolean;
  skipUnauthorizedHandler?: boolean;
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let csrfRefreshPromise: Promise<void> | null = null;

export function setUnauthorizedHandler(
  handler: UnauthorizedHandler | null,
): void {
  unauthorizedHandler = handler;
}

export function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined' || document.cookie === '') {
    return null;
  }

  const prefix = `${name}=`;
  const cookies = document.cookie.split(';');

  for (const rawCookie of cookies) {
    const trimmed = rawCookie.trim();

    if (trimmed.startsWith(prefix)) {
      const rawValue = trimmed.slice(prefix.length);

      try {
        return decodeURIComponent(rawValue);
      } catch {
        return rawValue;
      }
    }
  }

  return null;
}

export async function ensureCsrfCookie(force = false): Promise<void> {
  if (!force && getCookieValue(XSRF_COOKIE_NAME) !== null) {
    return;
  }

  if (csrfRefreshPromise) {
    return csrfRefreshPromise;
  }

  csrfRefreshPromise = (async () => {
    let response: Response;

    try {
      response = await fetch(SANCTUM_CSRF_ENDPOINT, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
    } catch (error: unknown) {
      throw normalizeNetworkError(error);
    }

    if (!response.ok) {
      const payload = await parseJsonSafely(response);
      throw normalizeHttpError(response, payload);
    }
  })();

  try {
    await csrfRefreshPromise;
  } finally {
    csrfRefreshPromise = null;
  }
}

function buildApiUrl(
  path: string,
  params?: Record<string, QueryParamValue>,
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const basePath = normalizedPath.startsWith(API_BASE_URL)
    ? normalizedPath
    : `${API_BASE_URL}${normalizedPath}`;

  if (!params) {
    return basePath;
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      const arrayKey = key.endsWith('[]') ? key : `${key}[]`;

      for (const item of value) {
        searchParams.append(arrayKey, String(item));
      }

      continue;
    }

    searchParams.append(key, String(value));
  }

  const query = searchParams.toString();

  return query.length > 0 ? `${basePath}?${query}` : basePath;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const rawText = await response.text();

  if (rawText.trim() === '') {
    return null;
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return null;
  }
}

function buildRequestInit(
  method: string,
  options: ApiRequestOptions,
): RequestInit {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  headers.set('X-Requested-With', 'XMLHttpRequest');

  if (MUTATING_METHODS.has(method) && !options.skipCsrf) {
    const xsrfToken = getCookieValue(XSRF_COOKIE_NAME);

    if (xsrfToken !== null) {
      headers.set('X-XSRF-TOKEN', xsrfToken);
    }
  }

  let body: BodyInit | undefined;

  if (options.body !== undefined && options.body !== null) {
    if (
      options.body instanceof FormData ||
      options.body instanceof Blob ||
      options.body instanceof URLSearchParams ||
      typeof options.body === 'string'
    ) {
      body = options.body;
    } else {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      body = JSON.stringify(options.body);
    }
  }

  return {
    method,
    credentials: 'include',
    headers,
    body,
    signal: options.signal,
  };
}

async function executeRequest<T>(
  path: string,
  options: ApiRequestOptions,
  hasRetriedCsrf: boolean,
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const requiresCsrf = MUTATING_METHODS.has(method) && !options.skipCsrf;

  if (requiresCsrf) {
    await ensureCsrfCookie();
  }

  const url = buildApiUrl(path, options.params);
  const init = buildRequestInit(method, options);

  let response: Response;

  try {
    response = await fetch(url, init);
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    throw normalizeNetworkError(error);
  }

  if (response.status === 419 && requiresCsrf && !hasRetriedCsrf) {
    await ensureCsrfCookie(true);
    return executeRequest<T>(path, options, true);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    if (response.status === 401 && !options.skipUnauthorizedHandler) {
      unauthorizedHandler?.();
    }

    throw normalizeHttpError(response, payload);
  }

  if (payload === null) {
    throw new ApiError({
      status: response.status,
      code: 'unknown_error',
      message: 'Received an empty or invalid JSON response from the server.',
      requestId: response.headers.get('X-Request-Id'),
    });
  }

  return payload as T;
}

export const apiClient = {
  request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    return executeRequest<T>(path, options, false);
  },

  get<T>(
    path: string,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {},
  ): Promise<T> {
    return executeRequest<T>(path, { ...options, method: 'GET' }, false);
  },

  post<T>(
    path: string,
    body?: unknown,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {},
  ): Promise<T> {
    return executeRequest<T>(path, { ...options, method: 'POST', body }, false);
  },

  put<T>(
    path: string,
    body?: unknown,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {},
  ): Promise<T> {
    return executeRequest<T>(path, { ...options, method: 'PUT', body }, false);
  },

  patch<T>(
    path: string,
    body?: unknown,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {},
  ): Promise<T> {
    return executeRequest<T>(
      path,
      { ...options, method: 'PATCH', body },
      false,
    );
  },

  delete<T>(
    path: string,
    options: Omit<ApiRequestOptions, 'method'> = {},
  ): Promise<T> {
    return executeRequest<T>(path, { ...options, method: 'DELETE' }, false);
  },
};
