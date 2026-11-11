import { createContext } from 'react';
import type { ApiError } from '@/lib/api-error';
import type {
  AuthStatus,
  LoginPayload,
  RegisterPayload,
  User,
} from '../types/auth';

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  authError: ApiError | null;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<User | null>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
