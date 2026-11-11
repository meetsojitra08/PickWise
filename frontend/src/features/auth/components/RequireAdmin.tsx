import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../hooks/use-auth';
import { AuthGuardFallback } from './AuthGuardFallback';

interface RequireAdminProps {
  children?: ReactNode;
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthGuardFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
