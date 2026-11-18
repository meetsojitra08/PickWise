import type { ProductDetail } from '@/features/catalog/types/catalog-api';

function formatSpecValue(value: ProductDetail['specs'][number]['value']) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === '') return 'Not specified';
  return String(value);
}

export function ProductSpecifications({ specs }: Pick<ProductDetail, 'specs'>) {
  return (
    <section className="mt-12" aria-labelledby="specifications-heading">
      <div className="mb-4">
        <p className="text-sm font-medium text-primary">Product details</p>
        <h2
          id="specifications-heading"
          className="mt-1 font-heading text-2xl font-semibold tracking-tight"
        >
          Specifications
        </h2>
      </div>
      {specs.length ? (
        <div className="overflow-hidden rounded-card border border-border bg-card">
          <table className="block w-full border-collapse text-left text-sm sm:table">
            <caption className="sr-only">
              Product technical specifications
            </caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Specification</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody className="block sm:table-row-group">
              {specs.map((spec) => (
                <tr
                  key={spec.key}
                  className="flex flex-col gap-0.5 border-t border-border px-4 py-3 first:border-t-0 sm:table-row sm:p-0"
                >
                  <th
                    scope="row"
                    className="block p-0 text-xs font-medium text-muted-foreground sm:table-cell sm:w-2/5 sm:px-6 sm:py-3 sm:text-sm"
                  >
                    {spec.label}
                  </th>
                  <td className="block p-0 text-foreground sm:table-cell sm:px-6 sm:py-3">
                    <span className="break-words">
                      {formatSpecValue(spec.value)}
                    </span>
                    {spec.unit ? (
                      <span className="ml-1 text-muted-foreground">
                        {spec.unit}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-card border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
          Specifications are not available for this product yet.
        </p>
      )}
    </section>
  );
}
