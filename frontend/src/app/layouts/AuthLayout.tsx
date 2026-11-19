import { Outlet } from 'react-router';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

export function AuthLayout() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <a
        href="#auth-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-control focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-float"
      >
        Skip to auth content
      </a>
      <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>
      <Outlet />
    </div>
  );
}
