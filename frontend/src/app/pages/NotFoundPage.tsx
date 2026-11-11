import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Page not found
            </h1>
          </CardTitle>
          <CardDescription className="text-base">
            The page you requested does not exist or may have moved.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button asChild size="lg">
            <Link to="/">Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
