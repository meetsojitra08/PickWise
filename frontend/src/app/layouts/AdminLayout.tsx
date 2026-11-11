import { useState } from 'react';
import { ArrowLeft, LayoutDashboard, Menu } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router';
import { PickwiseLogo } from '@/components/shared/PickwiseLogo';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { UserMenu } from '@/components/shared/UserMenu';
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
import { cn } from '@/lib/utils';

const ADMIN_NAV_ITEMS = [
  { label: 'Overview', to: '/admin', icon: LayoutDashboard },
] as const;

function adminNavLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'flex min-h-11 items-center gap-2.5 rounded-control px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:min-h-10',
    isActive
      ? 'bg-sidebar-accent text-sidebar-primary'
      : 'text-sidebar-foreground hover:bg-sidebar-accent/70',
  );
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function closeSidebar(): void {
    setSidebarOpen(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-control focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-float"
      >
        Skip to admin content
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  className="lg:hidden"
                  aria-label="Open admin navigation"
                  aria-expanded={sidebarOpen}
                >
                  <Menu
                    className="size-5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="gap-0 bg-sidebar">
                <SheetHeader className="border-b border-sidebar-border py-4">
                  <SheetTitle>
                    <PickwiseLogo
                      to="/admin"
                      labelSuffix="Admin"
                      onClick={closeSidebar}
                    />
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Admin navigation menu
                  </SheetDescription>
                </SheetHeader>

                <nav
                  aria-label="Mobile admin navigation"
                  className="flex flex-1 flex-col gap-1 p-4"
                >
                  {ADMIN_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;

                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end
                        onClick={closeSidebar}
                        className={adminNavLinkClass}
                      >
                        <Icon
                          className="size-4"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                        {item.label}
                      </NavLink>
                    );
                  })}

                  <Separator className="my-3" />

                  <Link
                    to="/"
                    onClick={closeSidebar}
                    className="flex min-h-11 items-center gap-2.5 rounded-control px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <ArrowLeft
                      className="size-4"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    Back to storefront
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>

            <PickwiseLogo to="/admin" labelSuffix="Admin" />
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="hidden min-h-11 px-3 sm:inline-flex"
            >
              <Link to="/">
                <ArrowLeft
                  className="size-4"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                Storefront
              </Link>
            </Button>

            <ThemeToggle />

            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar p-4 lg:flex lg:flex-col">
          <nav
            aria-label="Admin navigation"
            className="flex flex-1 flex-col gap-1"
          >
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={adminNavLinkClass}
                >
                  <Icon
                    className="size-4"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <Separator className="my-3" />

          <Link
            to="/"
            className="flex min-h-10 items-center gap-2.5 rounded-control px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowLeft
              className="size-4"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            Back to storefront
          </Link>
        </aside>

        <main
          id="admin-main-content"
          tabIndex={-1}
          className="flex-1 p-4 outline-none sm:p-6"
        >
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
