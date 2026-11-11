import {
  ChevronDown,
  Heart,
  LogOut,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useLogoutAction } from '@/features/auth/hooks/use-logout-action';

function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'U';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function UserMenu() {
  const { user, isAuthenticated, isAdmin, isLoading } = useAuth();
  const { isLoggingOut, handleLogout } = useLogoutAction();

  if (isLoading) {
    return (
      <div
        aria-hidden="true"
        className="h-11 w-24 animate-pulse rounded-control bg-muted"
      />
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Button asChild variant="outline" className="min-h-11 px-4">
        <Link to="/login">Log in</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`Account menu for ${user.name}`}
          className="min-h-11 gap-2 pr-3 pl-2"
        >
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          >
            {getUserInitials(user.name)}
          </span>
          <span className="max-w-28 truncate text-sm font-medium text-foreground">
            {user.name}
          </span>
          <ChevronDown
            className="size-4 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span className="truncate text-sm font-medium text-foreground">
            {user.name}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/account">
            <UserIcon strokeWidth={1.5} aria-hidden="true" />
            Account
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/account?tab=wishlist">
            <Heart strokeWidth={1.5} aria-hidden="true" />
            Wishlist
          </Link>
        </DropdownMenuItem>

        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <Shield strokeWidth={1.5} aria-hidden="true" />
              Admin
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={isLoggingOut}
          onSelect={() => {
            void handleLogout();
          }}
        >
          <LogOut strokeWidth={1.5} aria-hidden="true" />
          {isLoggingOut ? 'Logging out…' : 'Log out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
