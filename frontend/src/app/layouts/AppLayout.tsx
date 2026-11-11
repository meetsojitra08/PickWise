import { Outlet } from 'react-router';
import { SiteFooter } from '@/components/shared/SiteFooter';
import { SiteHeader } from '@/components/shared/SiteHeader';

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-control focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-float"
      >
        Skip to main content
      </a>

      <SiteHeader />

      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  );
}
