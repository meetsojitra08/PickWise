import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface RoutePlaceholderPageProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
}

export function RoutePlaceholderPage({
  title,
  description,
  actionLabel = 'Back to home',
  actionTo = '/',
}: RoutePlaceholderPageProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
          </CardTitle>
          <CardDescription className="max-w-prose text-base">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link to={actionTo}>{actionLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
