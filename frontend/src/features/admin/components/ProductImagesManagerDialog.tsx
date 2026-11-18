import { useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api-client';
import {
  deleteAdminProductImage,
  reorderAdminProductImages,
  updateAdminProductImage,
  uploadAdminProductImage,
  useAdminProductImages,
} from '../api/admin-api';
import type { AdminProduct, AdminProductImage } from '../types';

interface ProductImagesManagerDialogProps {
  product: AdminProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImagesChanged?: () => void;
}

export function ProductImagesManagerDialog({
  product,
  open,
  onOpenChange,
  onImagesChanged,
}: ProductImagesManagerDialogProps) {
  const productId = product?.id ?? 0;
  const {
    data: images = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useAdminProductImages(productId);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [isPrimaryUpload, setIsPrimaryUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<number | null>(null);

  function resetUploadForm(): void {
    setSelectedFile(null);
    setAltText('');
    setIsPrimaryUpload(false);
    setUploadError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Only JPEG, PNG, and WebP images are allowed.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size cannot exceed 5 MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    if (!altText) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setAltText(`${product?.name ?? 'Product'} - ${baseName}`);
    }
  }

  async function handleUpload(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please choose an image file to upload.');
      return;
    }
    if (!altText.trim() || altText.trim().length < 2) {
      setUploadError(
        'Alt text must be at least 2 characters for accessibility.',
      );
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('alt_text', altText.trim());
    if (isPrimaryUpload || images.length === 0) {
      formData.append('is_primary', '1');
    }

    try {
      await uploadAdminProductImage(productId, formData);
      toast.success('Image uploaded successfully.');
      resetUploadForm();
      await refetch();
      onImagesChanged?.();
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors = err.getFieldErrors();
        const firstErr = Object.values(fieldErrors)[0]?.[0];
        setUploadError(firstErr || err.message);
      } else if (err instanceof Error) {
        setUploadError(err.message);
      } else {
        setUploadError('Failed to upload image. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSetPrimary(image: AdminProductImage): Promise<void> {
    if (image.is_primary) return;
    setMutatingId(image.id);
    try {
      await updateAdminProductImage(productId, image.id, { is_primary: true });
      toast.success('Primary image updated.');
      await refetch();
      onImagesChanged?.();
    } catch {
      toast.error('Failed to update primary image.');
    } finally {
      setMutatingId(null);
    }
  }

  async function handleMove(
    index: number,
    direction: 'up' | 'down',
  ): Promise<void> {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const newOrder = [...images];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    setMutatingId(moved.id);
    try {
      await reorderAdminProductImages(productId, {
        image_ids: newOrder.map((img) => img.id),
      });
      toast.success('Image order updated.');
      await refetch();
      onImagesChanged?.();
    } catch {
      toast.error('Failed to update image order.');
    } finally {
      setMutatingId(null);
    }
  }

  async function handleDelete(image: AdminProductImage): Promise<void> {
    setMutatingId(image.id);
    try {
      await deleteAdminProductImage(productId, image.id);
      toast.success('Image deleted.');
      await refetch();
      onImagesChanged?.();
    } catch {
      toast.error('Failed to delete image.');
    } finally {
      setMutatingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="size-5 text-primary" />
            <DialogTitle>Manage product images</DialogTitle>
          </div>
          <DialogDescription>
            Upload, set primary, and reorder images for{' '}
            <strong className="text-foreground">{product?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Existing Images Gallery */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Gallery ({images.length})
            </span>
            {isFetching && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : isError ? (
            <div className="rounded-control border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive text-center">
              Failed to load gallery images.
            </div>
          ) : images.length === 0 ? (
            <div className="rounded-control border border-dashed border-border p-6 text-center">
              <ImageIcon
                className="mx-auto size-8 text-muted-foreground/60"
                strokeWidth={1.5}
              />
              <p className="mt-2 text-xs font-medium text-foreground">
                No images uploaded yet
              </p>
              <p className="text-[11px] text-muted-foreground">
                Upload your first image below. The first image becomes the
                primary catalog photo.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-control border border-border">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className="flex flex-col gap-2.5 p-3 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded border border-border bg-muted/40">
                      {image.url ? (
                        <img
                          src={image.url}
                          alt={image.alt_text}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="size-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-medium text-foreground truncate"
                          title={image.alt_text}
                        >
                          {image.alt_text}
                        </span>
                        {image.is_primary && (
                          <Badge
                            variant="default"
                            className="text-[10px] px-1.5 py-0"
                          >
                            Primary
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Position #{index + 1}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!image.is_primary && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handleSetPrimary(image)}
                        disabled={mutatingId === image.id}
                        className="gap-1 text-xs"
                      >
                        <Star className="size-3.5" />
                        Set primary
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0 || mutatingId !== null}
                      aria-label="Move image up"
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleMove(index, 'down')}
                      disabled={
                        index === images.length - 1 || mutatingId !== null
                      }
                      aria-label="Move image down"
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(image)}
                      disabled={mutatingId === image.id}
                      aria-label="Delete image"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Form */}
        <form
          onSubmit={handleUpload}
          className="space-y-3 rounded-control border border-border/80 bg-muted/20 p-4"
        >
          <div className="flex items-center gap-2">
            <Upload className="size-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              Upload new image
            </span>
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 rounded-control border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="image-file-input">Select image file</Label>
            <input
              id="image-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isUploading}
              className="flex w-full text-xs text-muted-foreground file:mr-3 file:rounded-control file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
            />
            <p className="text-[11px] text-muted-foreground">
              JPEG, PNG, or WebP. Maximum size 5 MB.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="image-alt-text">Alternative text (required)</Label>
            <Input
              id="image-alt-text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="e.g. Front angled view in Cosmic Grey"
              disabled={isUploading}
              className="h-8 text-xs"
            />
          </div>

          {images.length > 0 && (
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="upload-as-primary"
                checked={isPrimaryUpload}
                onCheckedChange={(checked) =>
                  setIsPrimaryUpload(Boolean(checked))
                }
                disabled={isUploading}
              />
              <Label
                htmlFor="upload-as-primary"
                className="text-xs cursor-pointer font-normal"
              >
                Make this the primary catalog image
              </Label>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={isUploading || !selectedFile || !altText.trim()}
              className="gap-1.5"
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  Upload image
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
