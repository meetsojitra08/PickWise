import type {
  CompareMatrixResponse,
  CompareVerdictRequestPayload,
  CompareVerdictResponse,
} from '@/features/compare/types/compare';
import { apiClient } from '@/lib/api-client';

/**
 * Ask the backend for the spec matrix of two to four products. The endpoint is
 * public but lives behind the same CSRF/stateful middleware as every API POST.
 */
export function postCompareMatrix(productIds: number[], signal?: AbortSignal) {
  return apiClient.post<CompareMatrixResponse>(
    '/compare',
    { product_ids: productIds },
    { signal },
  );
}

/**
 * Request an AI verdict explaining strengths, weaknesses, and a recommendation
 * across two to four compared products.
 */
export function postCompareVerdict(
  payload: CompareVerdictRequestPayload,
  signal?: AbortSignal,
) {
  return apiClient.post<CompareVerdictResponse>('/compare/verdict', payload, {
    signal,
  });
}
