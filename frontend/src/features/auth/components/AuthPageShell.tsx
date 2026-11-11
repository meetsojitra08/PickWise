import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AuthPageShellProps {
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
}

export function AuthPageShell({
  title,
  description,
  footer,
  children,
}: AuthPageShellProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground sm:py-16">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex justify-center">
          <Link
            to="/"
            className="rounded-control px-2 py-1 font-heading text-2xl font-semibold tracking-tight text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Pickwise
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>

          <CardContent>{children}</CardContent>

          <CardFooter className="justify-center border-t border-border text-sm text-muted-foreground">
            {footer}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
