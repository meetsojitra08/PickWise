import { Heart, Search } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MobileNavDrawer } from './MobileNavDrawer';
import { PickwiseLogo } from './PickwiseLogo';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { PRIMARY_NAV_ITEMS } from './navigation';

function desktopNavLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'inline-flex min-h-11 items-center rounded-control px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    isActive
      ? 'bg-muted text-primary'
      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <PickwiseLogo />

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 md:flex"
          >
            {PRIMARY_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={desktopNavLinkClass}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon-lg">
            <Link to="/products" aria-label="Search products">
              <Search className="size-4" strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            size="icon-lg"
            className="hidden sm:inline-flex"
          >
            <Link to="/account?tab=wishlist" aria-label="Wishlist">
              <Heart className="size-4" strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </Button>

          <ThemeToggle />

          <div className="hidden items-center md:flex">
            <UserMenu />
          </div>

          <MobileNavDrawer />
        </div>
      </div>
    </header>
  );
}
