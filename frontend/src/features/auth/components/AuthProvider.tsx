import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { setUnauthorizedHandler } from '@/lib/api-client';
import { isApiError } from '@/lib/api-error';
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from '../api/auth-api';
import { authKeys } from '../api/auth-keys';
import { AuthContext, type AuthContextValue } from '../hooks/auth-context';
import type {
  AuthStatus,
  LoginPayload,
  RegisterPayload,
  User,
} from '../types/auth';

interface AuthProviderProps {
  children: ReactNode;
}

const AUTH_STALE_TIME_MS = 5 * 60 * 1000;

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: authKeys.me(),
    queryFn: getCurrentUser,
    retry: false,
    staleTime: AUTH_STALE_TIME_MS,
  });

  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.setQueryData(authKeys.me(), null);
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [queryClient]);

  const { mutateAsync: mutateLogin } = useMutation({
    mutationFn: (payload: LoginPayload) => loginRequest(payload),
    onSuccess: (authenticatedUser) => {
      queryClient.setQueryData(authKeys.me(), authenticatedUser);
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== authKeys.all[0],
      });
    },
  });

  const { mutateAsync: mutateRegister } = useMutation({
    mutationFn: (payload: RegisterPayload) => registerRequest(payload),
    onSuccess: (registeredUser) => {
      queryClient.setQueryData(authKeys.me(), registeredUser);
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== authKeys.all[0],
      });
    },
  });

  const { mutateAsync: mutateLogout } = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryClient.setQueryData(authKeys.me(), null);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== authKeys.all[0],
      });
    },
  });

  const login = useCallback(
    (payload: LoginPayload): Promise<User> => mutateLogin(payload),
    [mutateLogin],
  );

  const register = useCallback(
    (payload: RegisterPayload): Promise<User> => mutateRegister(payload),
    [mutateRegister],
  );

  const logout = useCallback(
    (): Promise<void> => mutateLogout(),
    [mutateLogout],
  );

  const { refetch } = meQuery;
  const refetchUser = useCallback(async (): Promise<User | null> => {
    const result = await refetch();
    return result.data ?? null;
  }, [refetch]);

  const user = meQuery.data ?? null;
  const isLoading = meQuery.isPending;
  const isAuthenticated = Boolean(user && user.is_active);
  const isAdmin = Boolean(user && user.is_active && user.role === 'admin');
  const status: AuthStatus = isLoading
    ? 'loading'
    : isAuthenticated
      ? 'authenticated'
      : 'unauthenticated';
  const authError = isApiError(meQuery.error) ? meQuery.error : null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isLoading,
      isAuthenticated,
      isAdmin,
      authError,
      login,
      register,
      logout,
      refetchUser,
    }),
    [
      user,
      status,
      isLoading,
      isAuthenticated,
      isAdmin,
      authError,
      login,
      register,
      logout,
      refetchUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
