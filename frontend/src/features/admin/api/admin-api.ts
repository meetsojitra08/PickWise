import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ApiPaginatedResponse, ApiSuccessResponse } from '@/types/api';
import type {
  AdminCategory,
  AdminCategoryFormData,
  AdminDashboardData,
  AdminProductImage,
  AdminProductImageReorderPayload,
  AdminProductImageUpdatePayload,
  AdminSpecDefinition,
  AdminSpecDefinitionFormData,
} from '../types';

export const adminKeys = {
  all: ['admin'] as const,
  dashboard: () => [...adminKeys.all, 'dashboard'] as const,
  categories: () => [...adminKeys.all, 'categories'] as const,
  categoryList: (filters?: Record<string, unknown>) =>
    [...adminKeys.categories(), 'list', filters] as const,
  categorySpecs: (categoryId: number, search?: string) =>
    [...adminKeys.categories(), categoryId, 'specs', search] as const,
  productImages: (productId: number) =>
    [...adminKeys.all, 'products', productId, 'images'] as const,
};

export async function getAdminDashboard(
  signal?: AbortSignal,
): Promise<AdminDashboardData> {
  const response = await apiClient.get<ApiSuccessResponse<AdminDashboardData>>(
    '/admin/dashboard',
    { signal },
  );

  return response.data;
}

export function useAdminDashboard() {
  return useQuery<AdminDashboardData>({
    queryKey: adminKeys.dashboard(),
    queryFn: ({ signal }) => getAdminDashboard(signal),
    staleTime: 30_000,
  });
}

export interface AdminCategoryFilters {
  search?: string;
  is_active?: boolean;
  parent_id?: number | 'null';
  page?: number;
  per_page?: number;
}

export async function getAdminCategories(
  filters?: AdminCategoryFilters,
  signal?: AbortSignal,
): Promise<ApiPaginatedResponse<AdminCategory>> {
  const params = new URLSearchParams();

  if (filters?.search) {
    params.set('search', filters.search);
  }
  if (typeof filters?.is_active === 'boolean') {
    params.set('is_active', filters.is_active ? '1' : '0');
  }
  if (filters?.parent_id !== undefined) {
    params.set('parent_id', String(filters.parent_id));
  }
  if (filters?.page) {
    params.set('page', String(filters.page));
  }
  if (filters?.per_page) {
    params.set('per_page', String(filters.per_page));
  }

  const queryString = params.toString();
  const url = queryString
    ? `/admin/categories?${queryString}`
    : '/admin/categories';

  return apiClient.get<ApiPaginatedResponse<AdminCategory>>(url, { signal });
}

export function useAdminCategories(filters?: AdminCategoryFilters) {
  return useQuery<ApiPaginatedResponse<AdminCategory>>({
    queryKey: adminKeys.categoryList(filters as Record<string, unknown>),
    queryFn: ({ signal }) => getAdminCategories(filters, signal),
  });
}

export async function createAdminCategory(
  data: AdminCategoryFormData,
): Promise<AdminCategory> {
  const response = await apiClient.post<ApiSuccessResponse<AdminCategory>>(
    '/admin/categories',
    data,
  );
  return response.data;
}

export async function updateAdminCategory(
  id: number,
  data: Partial<AdminCategoryFormData>,
): Promise<AdminCategory> {
  const response = await apiClient.patch<ApiSuccessResponse<AdminCategory>>(
    `/admin/categories/${id}`,
    data,
  );
  return response.data;
}

export async function deleteAdminCategory(id: number): Promise<void> {
  await apiClient.delete<void>(`/admin/categories/${id}`);
}

export async function getAdminCategorySpecs(
  categoryId: number,
  search?: string,
  signal?: AbortSignal,
): Promise<AdminSpecDefinition[]> {
  const params = new URLSearchParams();
  if (search) {
    params.set('search', search);
  }
  const queryString = params.toString();
  const url = queryString
    ? `/admin/categories/${categoryId}/specs?${queryString}`
    : `/admin/categories/${categoryId}/specs`;

  const response = await apiClient.get<
    ApiSuccessResponse<AdminSpecDefinition[]>
  >(url, { signal });

  return response.data;
}

export function useAdminCategorySpecs(categoryId: number, search?: string) {
  return useQuery<AdminSpecDefinition[]>({
    queryKey: adminKeys.categorySpecs(categoryId, search),
    queryFn: ({ signal }) => getAdminCategorySpecs(categoryId, search, signal),
    enabled: categoryId > 0,
  });
}

export async function createAdminSpecDefinition(
  categoryId: number,
  data: AdminSpecDefinitionFormData,
): Promise<AdminSpecDefinition> {
  const response = await apiClient.post<
    ApiSuccessResponse<AdminSpecDefinition>
  >(`/admin/categories/${categoryId}/specs`, data);
  return response.data;
}

export async function updateAdminSpecDefinition(
  categoryId: number,
  specId: number,
  data: Partial<AdminSpecDefinitionFormData>,
): Promise<AdminSpecDefinition> {
  const response = await apiClient.patch<
    ApiSuccessResponse<AdminSpecDefinition>
  >(`/admin/categories/${categoryId}/specs/${specId}`, data);
  return response.data;
}

export async function deleteAdminSpecDefinition(
  categoryId: number,
  specId: number,
): Promise<void> {
  await apiClient.delete<void>(
    `/admin/categories/${categoryId}/specs/${specId}`,
  );
}

export async function getAdminProductImages(
  productId: number,
  signal?: AbortSignal,
): Promise<AdminProductImage[]> {
  const response = await apiClient.get<ApiSuccessResponse<AdminProductImage[]>>(
    `/admin/products/${productId}/images`,
    { signal },
  );
  return response.data;
}

export function useAdminProductImages(productId: number) {
  return useQuery<AdminProductImage[]>({
    queryKey: adminKeys.productImages(productId),
    queryFn: ({ signal }) => getAdminProductImages(productId, signal),
    enabled: productId > 0,
  });
}

export async function uploadAdminProductImage(
  productId: number,
  formData: FormData,
): Promise<AdminProductImage> {
  const response = await apiClient.post<ApiSuccessResponse<AdminProductImage>>(
    `/admin/products/${productId}/images`,
    formData,
  );
  return response.data;
}

export async function reorderAdminProductImages(
  productId: number,
  payload: AdminProductImageReorderPayload,
): Promise<AdminProductImage[]> {
  const response = await apiClient.patch<
    ApiSuccessResponse<AdminProductImage[]>
  >(`/admin/products/${productId}/images/reorder`, payload);
  return response.data;
}

export async function updateAdminProductImage(
  productId: number,
  imageId: number,
  payload: AdminProductImageUpdatePayload,
): Promise<AdminProductImage> {
  const response = await apiClient.patch<ApiSuccessResponse<AdminProductImage>>(
    `/admin/products/${productId}/images/${imageId}`,
    payload,
  );
  return response.data;
}

export async function deleteAdminProductImage(
  productId: number,
  imageId: number,
): Promise<void> {
  await apiClient.delete<void>(`/admin/products/${productId}/images/${imageId}`);
}
