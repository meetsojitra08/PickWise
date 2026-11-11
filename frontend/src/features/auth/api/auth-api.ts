import { apiClient } from '@/lib/api-client';
import { isApiError } from '@/lib/api-error';
import type { ApiMessageResponse, ApiSuccessResponse } from '@/types/api';
import type { LoginPayload, RegisterPayload, User } from '../types/auth';

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await apiClient.get<ApiSuccessResponse<User>>('/auth/me', {
      skipUnauthorizedHandler: true,
    });

    return response.data;
  } catch (error: unknown) {
    if (isApiError(error) && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function login(payload: LoginPayload): Promise<User> {
  const response = await apiClient.post<ApiSuccessResponse<User>>(
    '/auth/login',
    payload,
    { skipUnauthorizedHandler: true },
  );

  return response.data;
}

export async function register(payload: RegisterPayload): Promise<User> {
  const response = await apiClient.post<ApiSuccessResponse<User>>(
    '/auth/register',
    payload,
    { skipUnauthorizedHandler: true },
  );

  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post<ApiMessageResponse>('/auth/logout', undefined, {
      skipUnauthorizedHandler: true,
    });
  } catch (error: unknown) {
    // If the session has already expired server-side, treat logout as complete.
    if (isApiError(error) && error.status === 401) {
      return;
    }

    throw error;
  }
}
