import { Link } from 'react-router';
import { PriceTag } from '@/components/shared/PriceTag';
import { RatingStars } from '@/components/shared/RatingStars';
import type { ProductSummary } from '@/features/catalog/types/catalog';

/** Sticky column header for one compared product: name, price and rating. */
export function CompareProductHeaderCell({
  product,
}: {
  product: ProductSummary;
}) {
  return (
    <th
      scope="col"
      className="min-w-44 bg-card px-4 py-4 align-top font-medium sm:px-5 lg:sticky lg:top-16 lg:z-30"
    >
      <Link
        to={`/products/${product.slug}`}
        className="line-clamp-2 text-base font-semibold text-foreground hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {product.name}
      </Link>
      <PriceTag price={product.price} size="sm" className="mt-2" />
      <RatingStars
        rating={product.rating_avg}
        count={product.rating_count}
        size="sm"
        className="mt-1.5"
      />
    </th>
  );
}
