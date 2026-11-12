import { ArrowRight, Columns3, MessageSquareText, Search } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const PILLARS = [
  {
    title: 'Structured catalog & Value Score',
    description:
      'Filter by budget, ratings, and category specs with transparent value scoring.',
    to: '/products',
    cta: 'Browse catalog',
    icon: Search,
  },
  {
    title: 'Side-by-side comparison',
    description:
      'Line up two to four products in a spec matrix with clear row winners and trade-offs.',
    to: '/compare',
    cta: 'Open compare',
    icon: Columns3,
  },
  {
    title: 'Budget-grounded assistant',
    description:
      'Describe what you need and get picks strictly from real, in-budget catalog entries.',
    to: '/assistant',
    cta: 'Ask the assistant',
    icon: MessageSquareText,
  },
] as const;

export function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Decide what to buy, with the homework done.
        </h1>
        <p className="mt-4 max-w-prose text-lg text-muted-foreground">
          Pickwise helps you cut through noisy spec sheets and endless tabs.
          Search verified products, compare options side by side, and ask for
          grounded recommendations within your budget.
        </p>

        <form
          action="/products"
          method="get"
          className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="home-search" className="sr-only">
            Search products
          </label>
          <Input
            id="home-search"
            type="search"
            name="q"
            placeholder="Search products by name, brand, or category"
            className="h-12 flex-1"
          />
          <Button type="submit" size="lg">
            <Search className="size-4" strokeWidth={1.5} aria-hidden="true" />
            Search products
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="lg">
            <Link to="/products">
              Browse catalog
              <ArrowRight
                className="size-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/assistant">Ask the assistant</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/compare">Compare products</Link>
          </Button>
        </div>
      </section>

      <section aria-label="How Pickwise helps" className="mt-12 sm:mt-16">
        <div className="grid gap-6 md:grid-cols-3">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;

            return (
              <Card key={pillar.to} className="justify-between">
                <CardHeader>
                  <CardTitle>
                    <h2 className="flex items-center gap-2.5 text-xl font-semibold text-foreground">
                      <Icon
                        className="size-4 shrink-0 text-primary"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span>{pillar.title}</span>
                    </h2>
                  </CardTitle>
                  <CardDescription>{pillar.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  <Link
                    to={pillar.to}
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {pillar.cta}
                    <ArrowRight
                      className="size-4"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
