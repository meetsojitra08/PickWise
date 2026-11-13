import { useState } from 'react';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CompareProductHeaderCell } from '@/features/compare/components/CompareProductHeaderCell';
import {
  formatCompareValue,
  rowHasDifferences,
} from '@/features/compare/lib/compare-matrix';
import type {
  CompareMatrixData,
  CompareRow,
  CompareValue,
} from '@/features/compare/types/compare';
import { cn } from '@/lib/utils';

function compareCellValue(row: CompareRow, productId: number): CompareValue {
  return (
    row.values.find((entry) => entry.product_id === productId)?.value ?? null
  );
}

export function CompareMatrix({ matrix }: { matrix: CompareMatrixData }) {
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const differenceCount = matrix.rows.filter(rowHasDifferences).length;
  const visibleRows = differencesOnly
    ? matrix.rows.filter(rowHasDifferences)
    : matrix.rows;
  const specCountLabel = matrix.rows.length === 1 ? 'spec' : 'specs';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {matrix.category.name} · {matrix.rows.length} {specCountLabel}{' '}
          compared
        </p>

        <div className="flex items-center gap-2">
          <Checkbox
            id="compare-differences-only"
            checked={differencesOnly}
            onCheckedChange={(checked) => setDifferencesOnly(checked === true)}
          />
          <Label
            htmlFor="compare-differences-only"
            className="cursor-pointer font-normal"
          >
            Show only differences
            <span className="tabular-nums text-muted-foreground">
              ({differenceCount})
            </span>
          </Label>
        </div>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-card lg:overflow-visible">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            Comparison of {matrix.products.length} products in{' '}
            {matrix.category.name}
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="sticky left-0 z-20 min-w-40 bg-card px-4 py-4 align-bottom text-xs font-medium text-muted-foreground sm:px-5 lg:top-16 lg:z-40"
              >
                Specification
              </th>

              {matrix.products.map((product) => (
                <CompareProductHeaderCell key={product.id} product={product} />
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.key} className="border-t border-border">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-card px-4 py-3 align-top font-medium text-muted-foreground sm:px-5"
                >
                  {row.label}
                </th>

                {matrix.products.map((product) => {
                  const value = compareCellValue(row, product.id);
                  const isWinner = row.winner_product_id === product.id;

                  return (
                    <td
                      key={product.id}
                      className={cn(
                        'px-4 py-3 align-top text-foreground sm:px-5',
                        isWinner && 'bg-verdict-surface',
                      )}
                    >
                      <span
                        className={cn(
                          'break-words tabular-nums',
                          value === null && 'text-muted-foreground',
                        )}
                      >
                        {formatCompareValue(value)}
                      </span>
                      {row.unit && value !== null ? (
                        <span className="ml-1 text-muted-foreground">
                          {row.unit}
                        </span>
                      ) : null}

                      {isWinner ? (
                        <Badge variant="accent" className="mt-1.5">
                          <Check strokeWidth={2} aria-hidden="true" />
                          Best
                        </Badge>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}

            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={matrix.products.length + 1}
                  className="px-4 py-6 text-muted-foreground sm:px-5"
                >
                  These products match on every listed spec. Turn off “Show only
                  differences” to see all of them.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        “Best” marks the strongest value in a row. Ties and text-only specs stay
        unmarked.
      </p>
    </div>
  );
}
