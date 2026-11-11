import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { resolveSafeRedirectPath } from '@/lib/safe-redirect';
import { useAuth } from '../hooks/use-auth';
import { AuthGuardFallback } from './AuthGuardFallback';

interface RequireGuestProps {
  children?: ReactNode;
}

export function RequireGuest({ children }: RequireGuestProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthGuardFallback />;
  }

  if (isAuthenticated) {
    const destination = resolveSafeRedirectPath(location.state, '/');
    return <Navigate to={destination} replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
