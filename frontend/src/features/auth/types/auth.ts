export type UserRole = 'customer' | 'admin';

export interface UserPreferences {
  budget_default?: number | null;
  favourite_categories?: string[];
  priorities?: string[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  preferences: UserPreferences | null;
  is_active: boolean;
  email_verified_at: string | null;
  created_at: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
