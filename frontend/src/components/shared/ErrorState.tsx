import type { ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title?: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  icon?: ReactNode;
  variant?: 'card' | 'inline';
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  retryLabel = 'Try again',
  onRetry,
  actionLabel,
  actionTo,
  onAction,
  icon,
  variant = 'card',
  className,
}: ErrorStateProps) {
  const IconElement = icon ?? (
    <AlertCircle
      className="size-5 text-negative"
      strokeWidth={1.75}
      aria-hidden="true"
    />
  );

  if (variant === 'inline') {
    return (
      <div
        role="alert"
        className={cn(
          'flex flex-col gap-3 rounded-xl border border-negative/30 bg-negative/10 p-4 text-xs text-foreground shadow-2xs sm:flex-row sm:items-center sm:justify-between',
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0 text-negative">{IconElement}</div>
          <div>
            {title && (
              <h3 className="font-heading font-semibold text-foreground text-sm">
                {title}
              </h3>
            )}
            <p className="mt-0.5 text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actionLabel &&
            (actionTo || onAction) &&
            (actionTo ? (
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                <Link to={actionTo}>{actionLabel}</Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onAction}
                className="h-8 text-xs"
              >
                {actionLabel}
              </Button>
            ))}
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-8 gap-1.5 rounded-full text-xs font-semibold"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              <span>{retryLabel}</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card
      role="alert"
      className={cn(
        'border-l-4 border-l-negative bg-card shadow-xs transition-colors',
        className,
      )}
    >
      <CardHeader>
        <div className="mb-1 flex size-10 items-center justify-center rounded-control border border-negative/25 bg-negative/10 text-negative">
          {IconElement}
        </div>
        <CardTitle>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        </CardTitle>
        <CardDescription className="max-w-prose text-base leading-relaxed text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>

      {(onRetry || (actionLabel && (actionTo || onAction))) && (
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            {onRetry && (
              <Button
                type="button"
                size="lg"
                onClick={onRetry}
                className="gap-2"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                <span>{retryLabel}</span>
              </Button>
            )}

            {actionLabel &&
              (actionTo || onAction) &&
              (actionTo ? (
                <Button asChild variant="outline" size="lg">
                  <Link to={actionTo}>{actionLabel}</Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={onAction}
                >
                  {actionLabel}
                </Button>
              ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
