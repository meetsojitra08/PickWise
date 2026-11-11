import { apiClient } from '@/lib/api-client';
import type { User } from '@/features/auth/types/auth';
import type { ApiMessageResponse, ApiSuccessResponse } from '@/types/api';
import type {
  UpdatePasswordPayload,
  UpdatePreferencesPayload,
  UpdateProfilePayload,
} from '../types/account';

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<User> {
  const response = await apiClient.patch<ApiSuccessResponse<User>>(
    '/account/profile',
    payload,
  );

  return response.data;
}

export async function updatePassword(
  payload: UpdatePasswordPayload,
): Promise<string> {
  const response = await apiClient.put<ApiMessageResponse>(
    '/account/password',
    payload,
  );

  return response.data.message;
}

export async function updatePreferences(
  payload: UpdatePreferencesPayload,
): Promise<User> {
  const response = await apiClient.put<ApiSuccessResponse<User>>(
    '/account/preferences',
    payload,
  );

  return response.data;
}
