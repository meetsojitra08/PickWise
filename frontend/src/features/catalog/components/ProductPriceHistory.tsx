import { EmptyState } from '@/components/shared/EmptyState';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCatalogProductPriceHistory } from '@/features/catalog/hooks/use-catalog-data';
import type { ProductPriceHistoryPoint } from '@/features/catalog/types/catalog-api';
import { formatPrice } from '@/lib/format-price';

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatAxisDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function amountOf(point: ProductPriceHistoryPoint) {
  return Number(point.price.amount);
}

export function ProductPriceHistory({ slug }: { slug: string }) {
  const historyQuery = useCatalogProductPriceHistory(slug);

  if (historyQuery.isPending) {
    return (
      <section className="mt-12" aria-labelledby="price-history-heading">
        <h2
          id="price-history-heading"
          className="mb-4 font-heading text-2xl font-semibold tracking-tight"
        >
          Price history
        </h2>
        <div
          className="h-64 animate-pulse rounded-card border border-border bg-muted"
          aria-label="Loading price history"
        />
      </section>
    );
  }

  if (historyQuery.isError) {
    return (
      <section className="mt-12" aria-labelledby="price-history-heading">
        <h2
          id="price-history-heading"
          className="mb-4 font-heading text-2xl font-semibold tracking-tight"
        >
          Price history
        </h2>
        <EmptyState
          title="Price history could not load"
          description="Check your connection and try again."
          actionLabel="Try again"
          onAction={() => void historyQuery.refetch()}
        />
      </section>
    );
  }

  const { currency, points } = historyQuery.data.data;
  if (points.length === 0) {
    return (
      <section className="mt-12" aria-labelledby="price-history-heading">
        <h2
          id="price-history-heading"
          className="mb-4 font-heading text-2xl font-semibold tracking-tight"
        >
          Price history
        </h2>
        <p className="rounded-card border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
          Price history is not available for this product yet.
        </p>
      </section>
    );
  }

  const values = points.map(amountOf);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.max(max * 0.08, 1);
  const chartMin = min - range * 0.18;
  const chartMax = max + range * 0.18;
  const chartWidth = 900;
  const chartHeight = 168;
  const plotLeft = 112;
  const plotRight = 888;
  const plotTop = 14;
  const plotBottom = 122;
  const chartRange = chartMax - chartMin;
  const chartPoints = points.map((point, index) => {
    const x =
      points.length === 1
        ? (plotLeft + plotRight) / 2
        : plotLeft + (index / (points.length - 1)) * (plotRight - plotLeft);
    const y =
      min === max
        ? (plotTop + plotBottom) / 2
        : plotBottom -
          ((amountOf(point) - chartMin) / chartRange) * (plotBottom - plotTop);
    return { point, x, y };
  });
  const middle = (min + max) / 2;
  const priceTicks =
    min === max
      ? [{ value: min, y: (plotTop + plotBottom) / 2 }]
      : [
          {
            value: max,
            y:
              plotBottom -
              ((max - chartMin) / chartRange) * (plotBottom - plotTop),
          },
          {
            value: middle,
            y:
              plotBottom -
              ((middle - chartMin) / chartRange) * (plotBottom - plotTop),
          },
          {
            value: min,
            y:
              plotBottom -
              ((min - chartMin) / chartRange) * (plotBottom - plotTop),
          },
        ];
  const dateTickIndexes = Array.from(
    new Set(
      Array.from({ length: Math.min(points.length, 5) }, (_, index) =>
        Math.round(
          (index * (points.length - 1)) / (Math.min(points.length, 5) - 1 || 1),
        ),
      ),
    ),
  );

  return (
    <section className="mt-12" aria-labelledby="price-history-heading">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2
              id="price-history-heading"
              className="font-heading text-2xl font-semibold tracking-tight"
            >
              Price history
            </h2>
          </CardTitle>
          <CardDescription>
            {points.length === 1
              ? 'One recorded price so far.'
              : `${points.length} recorded prices over time.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Lowest</span>{' '}
              <strong className="ml-1 tabular-nums">
                {formatPrice({ amount: String(min.toFixed(2)), currency })}
              </strong>
            </p>
            <p>
              <span className="text-muted-foreground">Highest</span>{' '}
              <strong className="ml-1 tabular-nums">
                {formatPrice({ amount: String(max.toFixed(2)), currency })}
              </strong>
            </p>
          </div>
          <div
            className="overflow-hidden rounded-control bg-muted/20 px-2 py-3 sm:px-4"
            role="img"
            aria-label={`Price history from ${formatDate(points[0].recorded_at)} to ${formatDate(points[points.length - 1].recorded_at)}. Lowest ${formatPrice({ amount: String(min.toFixed(2)), currency })}; highest ${formatPrice({ amount: String(max.toFixed(2)), currency })}.`}
          >
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="block h-auto w-full text-primary"
              aria-hidden="true"
            >
              {priceTicks.map(({ value, y }, index) => (
                <g key={`${value}-${index}`}>
                  <line
                    x1={plotLeft}
                    x2={plotRight}
                    y1={y}
                    y2={y}
                    className="text-border"
                    stroke="currentColor"
                    strokeDasharray="4 6"
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={plotLeft - 12}
                    y={y + 4}
                    textAnchor="end"
                    className="text-muted-foreground"
                    fill="currentColor"
                    fontSize="12"
                  >
                    {formatPrice({ amount: value.toFixed(2), currency })}
                  </text>
                </g>
              ))}
              <polyline
                points={chartPoints.map(({ x, y }) => `${x},${y}`).join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {chartPoints.map(({ point, x, y }, index) => {
                const isExtreme =
                  amountOf(point) === min || amountOf(point) === max;

                return (
                  <circle
                    key={`${point.recorded_at}-${index}`}
                    cx={x}
                    cy={y}
                    r={isExtreme ? '5' : '3.5'}
                    strokeWidth={isExtreme ? '2' : '0'}
                    className={
                      isExtreme ? 'fill-accent stroke-primary' : 'fill-primary'
                    }
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>{`${formatDate(point.recorded_at)}: ${formatPrice(point.price)}`}</title>
                  </circle>
                );
              })}
              {dateTickIndexes.map((index) => {
                const { x } = chartPoints[index];
                const anchor =
                  index === 0
                    ? 'start'
                    : index === points.length - 1
                      ? 'end'
                      : 'middle';

                return (
                  <text
                    key={`${points[index].recorded_at}-${index}`}
                    x={x}
                    y={156}
                    textAnchor={anchor}
                    className="text-muted-foreground"
                    fill="currentColor"
                    fontSize="12"
                  >
                    {formatAxisDate(points[index].recorded_at)}
                  </text>
                );
              })}
            </svg>
          </div>
          <div
            className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
            aria-hidden="true"
          >
            <span className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-accent ring-1 ring-primary" />
              Lowest / highest
            </span>
            <span>Prices are recorded over time</span>
          </div>
          <div className="mt-2 overflow-x-auto rounded-control border border-border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Recorded prices and dates</caption>
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Date
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {points.map((point, index) => (
                  <tr
                    key={`${point.recorded_at}-${index}`}
                    className="border-t border-border"
                  >
                    <th scope="row" className="px-3 py-2 font-medium">
                      {formatDate(point.recorded_at)}
                    </th>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatPrice(point.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
