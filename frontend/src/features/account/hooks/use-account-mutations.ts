import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/features/auth/api/auth-keys';
import {
  updatePassword,
  updatePreferences,
  updateProfile,
} from '../api/account-api';
import type {
  UpdatePasswordPayload,
  UpdatePreferencesPayload,
  UpdateProfilePayload,
} from '../types/account';

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(authKeys.me(), updatedUser);
    },
  });
}

export function useUpdatePasswordMutation() {
  return useMutation({
    mutationFn: (payload: UpdatePasswordPayload) => updatePassword(payload),
  });
}

export function useUpdatePreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePreferencesPayload) =>
      updatePreferences(payload),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(authKeys.me(), updatedUser);
    },
  });
}
