import { useState } from 'react';
import { Package, Trash2, X } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { useCompare } from '@/features/compare/hooks/use-compare';
import { MAX_COMPARE_ITEMS } from '@/features/compare/lib/compare-storage';
import type { CompareItem } from '@/features/compare/types/compare';

interface TrayItemProps {
  item: CompareItem;
  onRemove: () => void;
}

function TrayItem({ item, onRemove }: TrayItemProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = item.primary_image?.url ?? null;
  const showImage = imageUrl !== null && !imageFailed;

  return (
    <li className="flex shrink-0 items-center gap-2 rounded-control border border-border bg-background p-0.5">
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted/50">
        {showImage ? (
          <img
            src={imageUrl}
            alt=""
            width={40}
            height={40}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="size-10 object-cover"
          />
        ) : (
          <Package
            className="size-4 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        )}
      </span>

      <span className="hidden max-w-36 truncate text-xs font-medium text-foreground sm:block">
        {item.name}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        aria-label={`Remove ${item.name} from comparison`}
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" strokeWidth={1.5} aria-hidden="true" />
      </Button>
    </li>
  );
}

export function CompareTray() {
  const { items, count, canCompare, remove, clear } = useCompare();

  if (count === 0) {
    return null;
  }

  return (
    <aside aria-label="Compare tray" className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto max-w-7xl px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="rounded-surface border border-border bg-card p-2.5 shadow-float sm:p-3">
          <div className="flex items-center justify-between gap-3 pb-2">
            <p aria-live="polite" className="text-xs text-muted-foreground">
              {canCompare
                ? `${count} of ${MAX_COMPARE_ITEMS} selected`
                : 'Pick at least two products to compare.'}
            </p>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Clear comparison"
              onClick={clear}
              className="h-11 px-2 text-xs sm:px-3"
            >
              <Trash2 className="size-4" strokeWidth={1.5} aria-hidden="true" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <ul
              aria-label="Selected products"
              className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5"
            >
              {items.map((item) => (
                <TrayItem
                  key={item.id}
                  item={item}
                  onRemove={() => remove(item.id)}
                />
              ))}
            </ul>

            {canCompare ? (
              <Button asChild size="lg" className="shrink-0">
                <Link to="/compare">Compare</Link>
              </Button>
            ) : (
              <Button type="button" size="lg" className="shrink-0" disabled>
                Compare
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
