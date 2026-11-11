import { useQuery } from '@tanstack/react-query';
import {
  getCatalogCategories,
  getCatalogFacets,
  getCatalogProducts,
} from '@/features/catalog/api/catalog-api';

export const catalogKeys = {
  all: ['catalog'] as const,
  categories: () => [...catalogKeys.all, 'categories'] as const,
  facets: (category: string) =>
    [...catalogKeys.all, 'facets', category] as const,
  products: (params: string) =>
    [...catalogKeys.all, 'products', params] as const,
};

export function useCatalogCategories() {
  return useQuery({
    queryKey: catalogKeys.categories(),
    queryFn: ({ signal }) => getCatalogCategories(signal),
  });
}

export function useCatalogFacets(category: string) {
  return useQuery({
    queryKey: catalogKeys.facets(category),
    queryFn: ({ signal }) => getCatalogFacets(category, signal),
    enabled: category !== '',
  });
}

export function useCatalogProducts(
  params: Record<string, string | string[]>,
  queryKey: string,
) {
  return useQuery({
    queryKey: catalogKeys.products(queryKey),
    queryFn: ({ signal }) => getCatalogProducts(params, signal),
  });
}
