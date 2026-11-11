export type ApiErrorCode =
  | 'bad_request'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'method_not_allowed'
  | 'conflict'
  | 'csrf_token_mismatch'
  | 'validation_failed'
  | 'rate_limited'
  | 'ai_quota_exceeded'
  | 'internal_error'
  | 'service_unavailable'
  | 'ai_unavailable'
  | 'network_error'
  | 'unknown_error'
  | (string & {});

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface PaginationLinks {
  first?: string | null;
  last?: string | null;
  prev?: string | null;
  next?: string | null;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  links: PaginationLinks;
}

export interface ApiMessageResponse {
  data: {
    message: string;
  };
}

export interface ApiErrorPayload {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
  request_id?: string;
}

export interface ApiErrorEnvelope {
  error: ApiErrorPayload;
}
