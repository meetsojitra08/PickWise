import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ApiPaginatedResponse, ApiSuccessResponse } from '@/types/api';
import type {
  AdminBrand,
  AdminBrandFilters,
  AdminBulkStatusPayload,
  AdminCategory,
  AdminCategoryFormData,
  AdminDashboardData,
  AdminProduct,
  AdminProductFilters,
  AdminProductFormData,
  AdminProductImage,
  AdminProductImageReorderPayload,
  AdminProductImageUpdatePayload,
  AdminSpecDefinition,
  AdminSpecDefinitionFormData,
  AdminUser,
  AdminUserFilters,
  BulkModerateReviewsPayload,
  BulkModerateReviewsResponse,
  ModerateReviewPayload,
  RegenerateSummaryResponse,
  AdminReview,
  AdminReviewFilters,
  UpdateAdminUserPayload,
} from '../types';

export const adminKeys = {
  all: ['admin'] as const,
  dashboard: () => [...adminKeys.all, 'dashboard'] as const,
  categories: () => [...adminKeys.all, 'categories'] as const,
  categoryList: (filters?: Record<string, unknown>) =>
    [...adminKeys.categories(), 'list', filters] as const,
  categorySpecs: (categoryId: number, search?: string) =>
    [...adminKeys.categories(), categoryId, 'specs', search] as const,
  products: () => [...adminKeys.all, 'products'] as const,
  productList: (filters?: Record<string, unknown>) =>
    [...adminKeys.products(), 'list', filters] as const,
  productDetail: (id: number) =>
    [...adminKeys.products(), 'detail', id] as const,
  productImages: (productId: number) =>
    [...adminKeys.all, 'products', productId, 'images'] as const,
  brands: () => [...adminKeys.all, 'brands'] as const,
  brandList: (filters?: Record<string, unknown>) =>
    [...adminKeys.brands(), 'list', filters] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  userList: (filters?: Record<string, unknown>) =>
    [...adminKeys.users(), 'list', filters] as const,
  reviews: () => [...adminKeys.all, 'reviews'] as const,
  reviewList: (filters?: Record<string, unknown>) =>
    [...adminKeys.reviews(), 'list', filters] as const,
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
  await apiClient.delete<void>(
    `/admin/products/${productId}/images/${imageId}`,
  );
}

export async function getAdminProducts(
  filters?: AdminProductFilters,
  signal?: AbortSignal,
): Promise<ApiPaginatedResponse<AdminProduct>> {
  const params = new URLSearchParams();

  if (filters?.search) {
    params.set('search', filters.search);
  }
  if (filters?.category_id !== undefined) {
    params.set('category_id', String(filters.category_id));
  }
  if (filters?.brand_id !== undefined) {
    params.set('brand_id', String(filters.brand_id));
  }
  if (typeof filters?.is_published === 'boolean') {
    params.set('is_published', filters.is_published ? '1' : '0');
  }
  if (filters?.availability) {
    params.set('availability', filters.availability);
  }
  if (filters?.trashed) {
    params.set('trashed', filters.trashed);
  }
  if (filters?.sort) {
    params.set('sort', filters.sort);
  }
  if (filters?.page) {
    params.set('page', String(filters.page));
  }
  if (filters?.per_page) {
    params.set('per_page', String(filters.per_page));
  }

  const queryString = params.toString();
  const url = queryString
    ? `/admin/products?${queryString}`
    : '/admin/products';

  return apiClient.get<ApiPaginatedResponse<AdminProduct>>(url, { signal });
}

export function useAdminProducts(filters?: AdminProductFilters) {
  return useQuery<ApiPaginatedResponse<AdminProduct>>({
    queryKey: adminKeys.productList(filters as Record<string, unknown>),
    queryFn: ({ signal }) => getAdminProducts(filters, signal),
  });
}

export async function getAdminProduct(
  id: number,
  signal?: AbortSignal,
): Promise<AdminProduct> {
  const response = await apiClient.get<ApiSuccessResponse<AdminProduct>>(
    `/admin/products/${id}`,
    { signal },
  );
  return response.data;
}

export function useAdminProduct(id: number) {
  return useQuery<AdminProduct>({
    queryKey: adminKeys.productDetail(id),
    queryFn: ({ signal }) => getAdminProduct(id, signal),
    enabled: id > 0,
  });
}

export async function createAdminProduct(
  data: AdminProductFormData,
): Promise<AdminProduct> {
  const response = await apiClient.post<ApiSuccessResponse<AdminProduct>>(
    '/admin/products',
    data,
  );
  return response.data;
}

export async function updateAdminProduct(
  id: number,
  data: Partial<AdminProductFormData>,
): Promise<AdminProduct> {
  const response = await apiClient.patch<ApiSuccessResponse<AdminProduct>>(
    `/admin/products/${id}`,
    data,
  );
  return response.data;
}

export async function deleteAdminProduct(id: number): Promise<void> {
  await apiClient.delete<void>(`/admin/products/${id}`);
}

export async function bulkUpdateAdminProductStatus(
  payload: AdminBulkStatusPayload,
): Promise<void> {
  await apiClient.patch<void>('/admin/products/bulk-status', payload);
}

export async function getAdminBrands(
  filters?: AdminBrandFilters,
  signal?: AbortSignal,
): Promise<ApiPaginatedResponse<AdminBrand>> {
  const params = new URLSearchParams();

  if (filters?.search) {
    params.set('search', filters.search);
  }
  if (filters?.sort) {
    params.set('sort', filters.sort);
  }
  if (filters?.page) {
    params.set('page', String(filters.page));
  }
  if (filters?.per_page) {
    params.set('per_page', String(filters.per_page));
  }

  const queryString = params.toString();
  const url = queryString ? `/admin/brands?${queryString}` : '/admin/brands';

  return apiClient.get<ApiPaginatedResponse<AdminBrand>>(url, { signal });
}

export function useAdminBrands(filters?: AdminBrandFilters) {
  return useQuery<ApiPaginatedResponse<AdminBrand>>({
    queryKey: adminKeys.brandList(filters as Record<string, unknown>),
    queryFn: ({ signal }) => getAdminBrands(filters, signal),
  });
}

export async function getAdminUsers(
  filters?: AdminUserFilters,
  signal?: AbortSignal,
): Promise<ApiPaginatedResponse<AdminUser>> {
  const params = new URLSearchParams();

  if (filters?.search) {
    params.set('search', filters.search);
  }
  if (filters?.role) {
    params.set('role', filters.role);
  }
  if (typeof filters?.is_active === 'boolean') {
    params.set('is_active', filters.is_active ? '1' : '0');
  }
  if (filters?.sort) {
    params.set('sort', filters.sort);
  }
  if (filters?.page) {
    params.set('page', String(filters.page));
  }
  if (filters?.per_page) {
    params.set('per_page', String(filters.per_page));
  }

  const queryString = params.toString();
  const url = queryString ? `/admin/users?${queryString}` : '/admin/users';

  return apiClient.get<ApiPaginatedResponse<AdminUser>>(url, { signal });
}

export function useAdminUsers(filters?: AdminUserFilters) {
  return useQuery<ApiPaginatedResponse<AdminUser>>({
    queryKey: adminKeys.userList(filters as Record<string, unknown>),
    queryFn: ({ signal }) => getAdminUsers(filters, signal),
  });
}

export async function updateAdminUser(
  userId: number,
  payload: UpdateAdminUserPayload,
): Promise<ApiSuccessResponse<AdminUser>> {
  return apiClient.patch<ApiSuccessResponse<AdminUser>>(
    `/admin/users/${userId}`,
    payload,
  );
}

export async function getAdminReviews(
  filters?: AdminReviewFilters,
  signal?: AbortSignal,
): Promise<ApiPaginatedResponse<AdminReview>> {
  const params = new URLSearchParams();

  if (filters?.status && filters.status !== 'all') {
    params.set('status', filters.status);
  } else if (filters?.status === 'all') {
    params.set('status', 'all');
  }
  if (filters?.search) {
    params.set('search', filters.search);
  }
  if (typeof filters?.rating === 'number' && filters.rating > 0) {
    params.set('rating', String(filters.rating));
  }
  if (typeof filters?.product_id === 'number' && filters.product_id > 0) {
    params.set('product_id', String(filters.product_id));
  }
  if (filters?.sort) {
    params.set('sort', filters.sort);
  }
  if (filters?.page) {
    params.set('page', String(filters.page));
  }
  if (filters?.per_page) {
    params.set('per_page', String(filters.per_page));
  }

  const queryString = params.toString();
  const url = queryString ? `/admin/reviews?${queryString}` : '/admin/reviews';

  return apiClient.get<ApiPaginatedResponse<AdminReview>>(url, { signal });
}

export function useAdminReviews(filters?: AdminReviewFilters) {
  return useQuery<ApiPaginatedResponse<AdminReview>>({
    queryKey: adminKeys.reviewList(filters as Record<string, unknown>),
    queryFn: ({ signal }) => getAdminReviews(filters, signal),
  });
}

export async function moderateAdminReview(
  reviewId: number,
  payload: ModerateReviewPayload,
): Promise<ApiSuccessResponse<AdminReview>> {
  return apiClient.patch<ApiSuccessResponse<AdminReview>>(
    `/admin/reviews/${reviewId}`,
    payload,
  );
}

export async function bulkModerateAdminReviews(
  payload: BulkModerateReviewsPayload,
): Promise<ApiSuccessResponse<BulkModerateReviewsResponse>> {
  return apiClient.patch<ApiSuccessResponse<BulkModerateReviewsResponse>>(
    '/admin/reviews/bulk-status',
    payload,
  );
}

export async function deleteAdminReview(reviewId: number): Promise<void> {
  await apiClient.delete<void>(`/admin/reviews/${reviewId}`);
}

export async function regenerateProductReviewSummary(
  productId: number,
): Promise<ApiSuccessResponse<RegenerateSummaryResponse>> {
  return apiClient.post<ApiSuccessResponse<RegenerateSummaryResponse>>(
    `/admin/products/${productId}/regenerate-summary`,
  );
}
