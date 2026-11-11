import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <Card>
      <CardHeader>
        {icon ? (
          <div className="mb-1 flex size-10 items-center justify-center rounded-control border border-border bg-muted/50 text-muted-foreground">
            {icon}
          </div>
        ) : null}
        <CardTitle>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        </CardTitle>
        <CardDescription className="max-w-prose text-base">
          {description}
        </CardDescription>
      </CardHeader>

      {actionLabel && (actionTo || onAction) ? (
        <CardContent>
          <div>
            {actionTo ? (
              <Button asChild size="lg">
                <Link to={actionTo}>{actionLabel}</Link>
              </Button>
            ) : (
              <Button type="button" size="lg" onClick={onAction}>
                {actionLabel}
              </Button>
            )}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
