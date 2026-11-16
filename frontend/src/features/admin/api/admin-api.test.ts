import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';
import {
  deleteAdminProductImage,
  getAdminProductImages,
  reorderAdminProductImages,
  updateAdminProductImage,
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

    expect(postSpy).toHaveBeenCalledWith(
      '/admin/products/42/images',
      formData,
    );
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
