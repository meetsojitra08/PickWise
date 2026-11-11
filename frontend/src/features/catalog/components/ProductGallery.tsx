import { useState } from 'react';
import { Package } from 'lucide-react';
import type { ProductDetailImage } from '@/features/catalog/types/catalog-api';

interface ProductGalleryProps {
  name: string;
  images: ProductDetailImage[];
}

export function ProductGallery({ name, images }: ProductGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [failedImageIds, setFailedImageIds] = useState<number[]>([]);
  const selectedImage = images[selectedImageIndex] ?? images[0] ?? null;
  const showImage =
    selectedImage?.url !== null &&
    selectedImage?.url !== undefined &&
    !failedImageIds.includes(selectedImage.id);

  return (
    <section aria-label="Product gallery" className="min-w-0">
      <div className="flex aspect-4/3 items-center justify-center overflow-hidden rounded-surface border border-border bg-card">
        {showImage && selectedImage ? (
          <img
            src={selectedImage.url ?? undefined}
            alt={selectedImage.alt_text.trim() || name}
            width={1200}
            height={900}
            fetchPriority="high"
            onError={() =>
              setFailedImageIds((failed) =>
                failed.includes(selectedImage.id)
                  ? failed
                  : [...failed, selectedImage.id],
              )
            }
            className="size-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Package className="size-12" strokeWidth={1.5} aria-hidden="true" />
            <span className="text-sm">No photo available</span>
          </div>
        )}
      </div>
      {images.length > 1 ? (
        <div
          className="mt-3 flex gap-3 overflow-x-auto pb-1"
          aria-label="Product photos"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-label={`Show photo ${index + 1}`}
              aria-pressed={index === selectedImageIndex}
              onClick={() => setSelectedImageIndex(index)}
              className={`size-16 shrink-0 overflow-hidden rounded-control border bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${index === selectedImageIndex ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
            >
              {image.url && !failedImageIds.includes(image.id) ? (
                <img
                  src={image.url}
                  alt=""
                  loading="lazy"
                  onError={() =>
                    setFailedImageIds((failed) => [...failed, image.id])
                  }
                  className="size-full object-cover"
                />
              ) : (
                <Package
                  className="mx-auto size-5 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
