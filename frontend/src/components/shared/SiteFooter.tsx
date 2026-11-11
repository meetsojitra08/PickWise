import { Link } from 'react-router';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { PickwiseLogo } from './PickwiseLogo';
import { PRIMARY_NAV_ITEMS } from './navigation';

const FOOTER_LINK_CLASS =
  'inline-flex min-h-11 items-center rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:min-h-8';

export function SiteFooter() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-12">
          <div className="flex flex-col gap-3 lg:col-span-6">
            <div>
              <PickwiseLogo />
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Decide what to buy, with the homework done. Compare specs side by
              side, read review summaries, and explore budget-aware picks.
            </p>
          </div>

          <nav
            aria-label="Explore links"
            className="flex flex-col gap-1 lg:col-span-3"
          >
            <h2 className="mb-1 text-sm font-semibold text-foreground">
              Explore
            </h2>
            <Link to="/" className={FOOTER_LINK_CLASS}>
              Home
            </Link>
            {PRIMARY_NAV_ITEMS.map((item) => (
              <Link key={item.to} to={item.to} className={FOOTER_LINK_CLASS}>
                {item.label}
              </Link>
            ))}
          </nav>

          <nav
            aria-label="Account links"
            className="flex flex-col gap-1 lg:col-span-3"
          >
            <h2 className="mb-1 text-sm font-semibold text-foreground">
              Account
            </h2>
            <Link to="/account" className={FOOTER_LINK_CLASS}>
              Account
            </Link>
            <Link to="/account?tab=wishlist" className={FOOTER_LINK_CLASS}>
              Wishlist
            </Link>
            {!isLoading && !isAuthenticated ? (
              <>
                <Link to="/login" className={FOOTER_LINK_CLASS}>
                  Log in
                </Link>
                <Link to="/register" className={FOOTER_LINK_CLASS}>
                  Create account
                </Link>
              </>
            ) : null}
            {isAdmin ? (
              <Link to="/admin" className={FOOTER_LINK_CLASS}>
                Admin
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Pickwise is a shopping decision tool, not a store. Outbound links
            open external retailers.
          </p>
          <p>© {currentYear} Pickwise</p>
        </div>
      </div>
    </footer>
  );
}
