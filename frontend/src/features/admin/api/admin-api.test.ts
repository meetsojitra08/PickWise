import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';
import {
  bulkUpdateAdminProductStatus,
  createAdminProduct,
  deleteAdminProduct,
  deleteAdminProductImage,
  getAdminBrands,
  getAdminProduct,
  getAdminProductImages,
  getAdminProducts,
  getAdminUsers,
  reorderAdminProductImages,
  updateAdminProduct,
  updateAdminProductImage,
  updateAdminUser,
  uploadAdminProductImage,
} from './admin-api';

describe('Admin Product Image API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches product gallery images via GET', async () => {
    const mockImages = [
      {
        id: 1,
        url: '/storage/products/one.webp',
        alt_text: 'Hero view',
        sort_order: 0,
        is_primary: true,
      },
    ];

    const getSpy = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ data: mockImages });

    const result = await getAdminProductImages(42);

    expect(getSpy).toHaveBeenCalledWith('/admin/products/42/images', {
      signal: undefined,
    });
    expect(result).toEqual(mockImages);
  });

  it('uploads a product image with FormData via POST', async () => {
    const mockImage = {
      id: 5,
      url: '/storage/products/five.webp',
      alt_text: 'Side angle',
      sort_order: 1,
      is_primary: false,
    };

    const postSpy = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValueOnce({ data: mockImage });

    const formData = new FormData();
    formData.append('alt_text', 'Side angle');

    const result = await uploadAdminProductImage(42, formData);

    expect(postSpy).toHaveBeenCalledWith('/admin/products/42/images', formData);
    expect(result).toEqual(mockImage);
  });

  it('reorders product images via PATCH', async () => {
    const mockReordered = [
      {
        id: 3,
        url: '/storage/products/three.webp',
        alt_text: 'Three',
        sort_order: 0,
        is_primary: true,
      },
      {
        id: 1,
        url: '/storage/products/one.webp',
        alt_text: 'One',
        sort_order: 1,
        is_primary: false,
      },
    ];

    const patchSpy = vi
      .spyOn(apiClient, 'patch')
      .mockResolvedValueOnce({ data: mockReordered });

    const payload = { image_ids: [3, 1], primary_id: 3 };
    const result = await reorderAdminProductImages(42, payload);

    expect(patchSpy).toHaveBeenCalledWith(
      '/admin/products/42/images/reorder',
      payload,
    );
    expect(result).toEqual(mockReordered);
  });

  it('updates an image alt text and primary status via PATCH', async () => {
    const mockUpdated = {
      id: 2,
      url: '/storage/products/two.webp',
      alt_text: 'Updated alt',
      sort_order: 0,
      is_primary: true,
    };

    const patchSpy = vi
      .spyOn(apiClient, 'patch')
      .mockResolvedValueOnce({ data: mockUpdated });

    const payload = { alt_text: 'Updated alt', is_primary: true };
    const result = await updateAdminProductImage(42, 2, payload);

    expect(patchSpy).toHaveBeenCalledWith(
      '/admin/products/42/images/2',
      payload,
    );
    expect(result).toEqual(mockUpdated);
  });

  it('deletes a product image via DELETE', async () => {
    const deleteSpy = vi
      .spyOn(apiClient, 'delete')
      .mockResolvedValueOnce(undefined);

    await deleteAdminProductImage(42, 7);

    expect(deleteSpy).toHaveBeenCalledWith('/admin/products/42/images/7');
  });
});

describe('Admin Product & Brand API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('queries products with filter params via GET', async () => {
    const mockResponse = {
      data: [],
      meta: { current_page: 1, last_page: 1, total: 0, per_page: 25 },
    };

    const getSpy = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValueOnce(mockResponse);

    const result = await getAdminProducts({
      search: 'macbook',
      category_id: 2,
      is_published: true,
      page: 1,
      per_page: 25,
    });

    expect(getSpy).toHaveBeenCalledWith(
      '/admin/products?search=macbook&category_id=2&is_published=1&page=1&per_page=25',
      { signal: undefined },
    );
    expect(result).toEqual(mockResponse);
  });

  it('fetches a single product by id via GET', async () => {
    const mockProduct = { id: 10, name: 'Laptop Pro' };
    const getSpy = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ data: mockProduct });

    const result = await getAdminProduct(10);

    expect(getSpy).toHaveBeenCalledWith('/admin/products/10', {
      signal: undefined,
    });
    expect(result).toEqual(mockProduct);
  });

  it('creates a new product via POST', async () => {
    const mockProduct = { id: 10, name: 'New Laptop', slug: 'new-laptop' };
    const postSpy = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValueOnce({ data: mockProduct });

    const payload = {
      name: 'New Laptop',
      category_id: 1,
      brand_id: 2,
      summary: 'Summary text',
      description: 'Long description',
      price: 1299,
      availability: 'in_stock' as const,
      is_published: true,
    };

    const result = await createAdminProduct(payload);

    expect(postSpy).toHaveBeenCalledWith('/admin/products', payload);
    expect(result).toEqual(mockProduct);
  });

  it('updates an existing product via PATCH', async () => {
    const mockProduct = { id: 10, name: 'Updated Laptop' };
    const patchSpy = vi
      .spyOn(apiClient, 'patch')
      .mockResolvedValueOnce({ data: mockProduct });

    const payload = { price: 1199 };
    const result = await updateAdminProduct(10, payload);

    expect(patchSpy).toHaveBeenCalledWith('/admin/products/10', payload);
    expect(result).toEqual(mockProduct);
  });

  it('soft-deletes a product via DELETE', async () => {
    const deleteSpy = vi
      .spyOn(apiClient, 'delete')
      .mockResolvedValueOnce(undefined);

    await deleteAdminProduct(10);

    expect(deleteSpy).toHaveBeenCalledWith('/admin/products/10');
  });

  it('bulk-updates product status via PATCH', async () => {
    const patchSpy = vi
      .spyOn(apiClient, 'patch')
      .mockResolvedValueOnce(undefined);

    await bulkUpdateAdminProductStatus({
      product_ids: [1, 2, 3],
      is_published: true,
    });

    expect(patchSpy).toHaveBeenCalledWith('/admin/products/bulk-status', {
      product_ids: [1, 2, 3],
      is_published: true,
    });
  });

  it('queries brands via GET', async () => {
    const mockBrands = {
      data: [{ id: 1, name: 'Apple', slug: 'apple', products_count: 5 }],
      meta: { current_page: 1, last_page: 1, total: 1, per_page: 25 },
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockBrands);

    const result = await getAdminBrands({ search: 'App' });

    expect(getSpy).toHaveBeenCalledWith('/admin/brands?search=App', {
      signal: undefined,
    });
    expect(result).toEqual(mockBrands);
  });

  it('queries users with filters via GET', async () => {
    const mockUsers = {
      data: [
        {
          id: 1,
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'admin',
          is_active: true,
          reviews_count: 3,
          created_at: '2026-11-01T00:00:00Z',
        },
      ],
      meta: { current_page: 1, last_page: 1, total: 1, per_page: 25 },
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockUsers);

    const result = await getAdminUsers({
      search: 'Jane',
      role: 'admin',
      is_active: true,
    });

    expect(getSpy).toHaveBeenCalledWith(
      '/admin/users?search=Jane&role=admin&is_active=1',
      { signal: undefined },
    );
    expect(result).toEqual(mockUsers);
  });

  it('updates user status and role via PATCH', async () => {
    const mockUpdated = {
      data: {
        id: 5,
        name: 'Bob',
        email: 'bob@example.com',
        role: 'customer',
        is_active: false,
        reviews_count: 0,
        created_at: '2026-11-01T00:00:00Z',
      },
    };

    const patchSpy = vi
      .spyOn(apiClient, 'patch')
      .mockResolvedValueOnce(mockUpdated);

    const result = await updateAdminUser(5, { is_active: false });

    expect(patchSpy).toHaveBeenCalledWith('/admin/users/5', {
      is_active: false,
    });
    expect(result).toEqual(mockUpdated);
  });
});
