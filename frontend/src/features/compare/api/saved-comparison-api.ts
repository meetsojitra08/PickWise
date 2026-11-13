import type {
  ComparisonListResponse,
  ComparisonResponse,
  ShareTokenResponse,
  SharedComparisonResponse,
  UpdateComparisonPayload,
} from '@/features/compare/types/saved-comparison';
import { apiClient } from '@/lib/api-client';

export const COMPARISONS_PER_PAGE = 12;

export function getComparisons(page: number, signal?: AbortSignal) {
  return apiClient.get<ComparisonListResponse>('/comparisons', {
    params: { page, per_page: COMPARISONS_PER_PAGE },
    signal,
  });
}

export function createComparison(name: string, productIds: number[]) {
  return apiClient.post<ComparisonResponse>('/comparisons', {
    name,
    product_ids: productIds,
  });
}

export function getComparison(comparisonId: number, signal?: AbortSignal) {
  return apiClient.get<ComparisonResponse>(
    `/comparisons/${encodeURIComponent(comparisonId)}`,
    { signal },
  );
}

export function updateComparison(
  comparisonId: number,
  payload: UpdateComparisonPayload,
) {
  return apiClient.patch<ComparisonResponse>(
    `/comparisons/${encodeURIComponent(comparisonId)}`,
    payload,
  );
}

export function deleteComparison(comparisonId: number) {
  return apiClient.delete<void>(
    `/comparisons/${encodeURIComponent(comparisonId)}`,
  );
}

export function shareComparison(comparisonId: number) {
  return apiClient.post<ShareTokenResponse>(
    `/comparisons/${encodeURIComponent(comparisonId)}/share`,
  );
}

export function stopSharingComparison(comparisonId: number) {
  return apiClient.delete<void>(
    `/comparisons/${encodeURIComponent(comparisonId)}/share`,
  );
}

export function getSharedComparison(token: string, signal?: AbortSignal) {
  return apiClient.get<SharedComparisonResponse>(
    `/shared/comparisons/${encodeURIComponent(token)}`,
    { signal },
  );
}
