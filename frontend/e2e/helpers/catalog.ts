import type { APIRequestContext } from '@playwright/test';

export interface E2eProductSummary {
  id: number;
  name: string;
  slug: string;
  summary: string;
  price: {
    amount: string;
    currency: string;
    formatted: string;
  };
  availability: string;
  availability_label: string;
  rating_avg: number;
  rating_count: number;
  value_score: number | null;
  brand: {
    id: number;
    name: string;
    slug: string;
  } | null;
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
  primary_image: {
    id: number;
    url: string;
    alt_text: string;
  } | null;
}

interface ProductsResponse {
  data: E2eProductSummary[];
}

export async function fetchCatalogProducts(
  request: APIRequestContext,
  params: Record<string, string> = {},
): Promise<E2eProductSummary[]> {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/api/v1/products?${query}` : '/api/v1/products';
  const response = await request.get(url);

  if (!response.ok()) {
    throw new Error(
      `Failed to fetch catalog products from ${url}: HTTP ${response.status()}`,
    );
  }

  const body = (await response.json()) as ProductsResponse;
  return body.data;
}
