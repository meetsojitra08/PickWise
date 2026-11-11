import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from './use-auth';

const PROTECTED_ROUTE_PREFIXES = ['/account', '/admin'];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function useLogoutAction(onComplete?: () => void) {
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = useCallback(async (): Promise<void> => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      if (isProtectedPath(location.pathname)) {
        // Leave guarded routes before clearing auth state so RequireAuth does not bounce to /login.
        navigate('/', { replace: true });
      }

      await logout();
      onComplete?.();
    } catch {
      // Auth state remains intact if logout fails; user can retry.
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, location.pathname, logout, navigate, onComplete]);

  return { isLoggingOut, handleLogout };
}
