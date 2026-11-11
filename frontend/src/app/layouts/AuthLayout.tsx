import { Outlet } from 'react-router';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

export function AuthLayout() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>
      <Outlet />
    </div>
  );
}
