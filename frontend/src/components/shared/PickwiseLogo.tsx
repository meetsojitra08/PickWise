import { Link } from 'react-router';
import { cn } from '@/lib/utils';

interface PickwiseLogoProps {
  to?: string;
  labelSuffix?: string;
  className?: string;
  onClick?: () => void;
}

export function PickwiseLogo({
  to = '/',
  labelSuffix,
  className,
  onClick,
}: PickwiseLogoProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center gap-2.5 rounded-control px-1.5 py-1 text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary text-accent"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none">
          <path d="M12 3L20 12L12 21L4 12L12 3Z" fill="currentColor" />
          <path
            d="M12 7.5L15.5 12L12 16.5L8.5 12L12 7.5Z"
            className="fill-primary-foreground"
          />
        </svg>
      </span>
      <span className="font-heading text-xl font-semibold tracking-tight">
        Pickwise
      </span>
      {labelSuffix ? (
        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {labelSuffix}
        </span>
      ) : null}
    </Link>
  );
}
