import { useCallback, useState } from 'react';
import { Heart, LogOut, Menu, Shield, User as UserIcon } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useLogoutAction } from '@/features/auth/hooks/use-logout-action';
import { cn } from '@/lib/utils';
import { PickwiseLogo } from './PickwiseLogo';
import { PRIMARY_NAV_ITEMS } from './navigation';

function mobileNavLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'flex min-h-11 items-center gap-3 rounded-control px-3 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    isActive
      ? 'bg-muted text-primary'
      : 'text-foreground hover:bg-muted/70 hover:text-foreground',
  );
}

export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, isLoading } = useAuth();

  const closeDrawer = useCallback((): void => {
    setOpen(false);
  }, []);

  const { isLoggingOut, handleLogout } = useLogoutAction(closeDrawer);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="md:hidden"
          aria-label="Open navigation menu"
          aria-expanded={open}
        >
          <Menu className="size-5" strokeWidth={1.5} aria-hidden="true" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="gap-0">
        <SheetHeader className="border-b border-border py-4">
          <SheetTitle>
            <PickwiseLogo onClick={closeDrawer} />
          </SheetTitle>
          <SheetDescription className="sr-only">
            Main navigation and account options
          </SheetDescription>
        </SheetHeader>

        <nav
          aria-label="Mobile navigation"
          className="flex flex-1 flex-col gap-1 overflow-y-auto p-4"
        >
          <NavLink
            to="/"
            end
            className={mobileNavLinkClass}
            onClick={closeDrawer}
          >
            Home
          </NavLink>

          {PRIMARY_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={mobileNavLinkClass}
              onClick={closeDrawer}
            >
              {item.label}
            </NavLink>
          ))}

          <Link
            to="/account?tab=wishlist"
            onClick={closeDrawer}
            className="flex min-h-11 items-center gap-3 rounded-control px-3 text-base font-medium text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Heart className="size-4" strokeWidth={1.5} aria-hidden="true" />
            Wishlist
          </Link>

          <Separator className="my-3" />

          {isLoading ? (
            <div
              aria-hidden="true"
              className="h-11 animate-pulse rounded-control bg-muted"
            />
          ) : isAuthenticated && user ? (
            <div className="flex flex-col gap-1">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>

              <Link
                to="/account"
                onClick={closeDrawer}
                className="flex min-h-11 items-center gap-3 rounded-control px-3 text-base font-medium text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <UserIcon
                  className="size-4"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                Account
              </Link>

              {isAdmin ? (
                <Link
                  to="/admin"
                  onClick={closeDrawer}
                  className="flex min-h-11 items-center gap-3 rounded-control px-3 text-base font-medium text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Shield
                    className="size-4"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  Admin
                </Link>
              ) : null}

              <Button
                type="button"
                variant="destructive"
                size="lg"
                disabled={isLoggingOut}
                onClick={() => {
                  void handleLogout();
                }}
                className="mt-2 w-full justify-start"
              >
                <LogOut
                  className="size-4"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {isLoggingOut ? 'Logging out…' : 'Log out'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <Button asChild size="lg" className="w-full">
                <Link to="/login" onClick={closeDrawer}>
                  Log in
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link to="/register" onClick={closeDrawer}>
                  Create account
                </Link>
              </Button>
            </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
