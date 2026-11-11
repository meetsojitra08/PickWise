import { useQuery } from '@tanstack/react-query';
import {
  getCatalogCategories,
  getCatalogFacets,
  getCatalogProduct,
  getCatalogProducts,
} from '@/features/catalog/api/catalog-api';

export const catalogKeys = {
  all: ['catalog'] as const,
  categories: () => [...catalogKeys.all, 'categories'] as const,
  facets: (category: string) =>
    [...catalogKeys.all, 'facets', category] as const,
  products: (params: string) =>
    [...catalogKeys.all, 'products', params] as const,
  product: (slug: string) => [...catalogKeys.all, 'product', slug] as const,
};

export function useCatalogCategories() {
  return useQuery({
    queryKey: catalogKeys.categories(),
    queryFn: ({ signal }) => getCatalogCategories(signal),
  });
}

export function useCatalogProduct(slug: string) {
  return useQuery({
    queryKey: catalogKeys.product(slug),
    queryFn: ({ signal }) => getCatalogProduct(slug, signal),
    enabled: slug !== '',
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
