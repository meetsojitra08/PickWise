import { apiClient } from '@/lib/api-client';
import type {
  CatalogCategoriesResponse,
  CatalogFacetsResponse,
  CatalogProductsResponse,
  ProductDetailResponse,
} from '@/features/catalog/types/catalog-api';

export function getCatalogCategories(signal?: AbortSignal) {
  return apiClient.get<CatalogCategoriesResponse>('/categories', { signal });
}

export function getCatalogFacets(category: string, signal?: AbortSignal) {
  return apiClient.get<CatalogFacetsResponse>(
    `/categories/${encodeURIComponent(category)}/filters`,
    { signal },
  );
}

export function getCatalogProducts(
  params: Record<string, string | string[]>,
  signal?: AbortSignal,
) {
  return apiClient.get<CatalogProductsResponse>('/products', {
    params,
    signal,
  });
}

export function getCatalogProduct(slug: string, signal?: AbortSignal) {
  return apiClient.get<ProductDetailResponse>(
    `/products/${encodeURIComponent(slug)}`,
    { signal },
  );
}
