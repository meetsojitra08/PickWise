import { useId, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Star } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { FormStatusBanner } from '@/components/shared/FormStatusBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  reviewFormSchema,
  type ReviewFormValues,
} from '@/features/reviews/schemas/review-schema';
import type { ReviewPayload } from '@/features/reviews/types/reviews';
import { isApiError } from '@/lib/api-error';
import { applyApiFormErrors } from '@/lib/form-errors';
import { cn } from '@/lib/utils';

const STAR_VALUES = [1, 2, 3, 4, 5] as const;
const REVIEW_FIELDS = ['rating', 'title', 'body'] as const;
const TITLE_MAX_LENGTH = 150;
const BODY_MAX_LENGTH = 2000;

const DEFAULT_VALUES: ReviewFormValues = {
  rating: 0,
  title: '',
  body: '',
};

interface ReviewFormProps {
  mode?: 'create' | 'edit';
  initialValues?: ReviewPayload;
  onSubmit: (payload: ReviewPayload) => Promise<void>;
  onCancel?: () => void;
}

export function ReviewForm({
  mode = 'create',
  initialValues,
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const formId = useId();
  const ratingHintId = `${formId}-rating-hint`;
  const titleCountId = `${formId}-title-count`;
  const bodyCountId = `${formId}-body-count`;
  const [formError, setFormError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: initialValues ?? DEFAULT_VALUES,
  });

  const ratingValue = useWatch({ control, name: 'rating' });
  const titleValue = useWatch({ control, name: 'title' });
  const bodyValue = useWatch({ control, name: 'body' });

  async function submitReview(values: ReviewFormValues): Promise<void> {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setFormError(null);

    try {
      await onSubmit({
        rating: values.rating,
        title: values.title,
        body: values.body,
      });
    } catch (error: unknown) {
      if (isApiError(error)) {
        const duplicateMessage = error.getFirstFieldError('review');

        if (duplicateMessage) {
          setFormError(duplicateMessage);
          return;
        }
      }

      setFormError(applyApiFormErrors(error, setError, REVIEW_FIELDS));
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void handleSubmit(submitReview)(event);
      }}
      className="flex flex-col gap-4"
    >
      <FormStatusBanner variant="error" message={formError} />

      <fieldset
        aria-describedby={
          errors.rating
            ? `${ratingHintId} ${formId}-rating-error`
            : ratingHintId
        }
      >
        <legend className="mb-1.5 text-sm font-medium text-foreground">
          Your rating
        </legend>
        <Controller
          name="rating"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-1">
              {STAR_VALUES.map((star) => {
                const isSelected = star <= ratingValue;

                return (
                  <label
                    key={star}
                    className={cn(
                      'inline-flex size-11 cursor-pointer items-center justify-center rounded-control border border-transparent transition-colors hover:bg-muted/60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                      isSelected
                        ? 'text-warning dark:text-accent'
                        : 'text-muted-foreground/45',
                    )}
                  >
                    <input
                      ref={field.ref}
                      type="radio"
                      name={field.name}
                      value={star}
                      checked={field.value === star}
                      onChange={() => field.onChange(star)}
                      onBlur={field.onBlur}
                      disabled={isSubmitting}
                      aria-label={`${star} star${star === 1 ? '' : 's'}`}
                      className="sr-only"
                    />
                    <Star
                      className={cn('size-7', isSelected && 'fill-accent')}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </label>
                );
              })}
            </div>
          )}
        />
        <p id={ratingHintId} className="mt-1 text-xs text-muted-foreground">
          Tap a star to rate this product.
        </p>
        {errors.rating && (
          <p
            id={`${formId}-rating-error`}
            className="mt-1 text-sm text-negative"
          >
            {errors.rating.message}
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor={`${formId}-title`}>Title</Label>
          <span
            id={titleCountId}
            className="text-xs text-muted-foreground tabular-nums"
          >
            {titleValue.length} / {TITLE_MAX_LENGTH}
          </span>
        </div>
        <Input
          id={`${formId}-title`}
          placeholder="Sum it up in one line"
          maxLength={TITLE_MAX_LENGTH}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={
            errors.title
              ? `${titleCountId} ${formId}-title-error`
              : titleCountId
          }
          {...register('title')}
        />
        {errors.title && (
          <p id={`${formId}-title-error`} className="text-sm text-negative">
            {errors.title.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor={`${formId}-body`}>Review</Label>
          <span
            id={bodyCountId}
            className="text-xs text-muted-foreground tabular-nums"
          >
            {bodyValue.length} / {BODY_MAX_LENGTH}
          </span>
        </div>
        <Textarea
          id={`${formId}-body`}
          rows={6}
          maxLength={BODY_MAX_LENGTH}
          placeholder="What worked well? What should another shopper know before buying?"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.body)}
          aria-describedby={
            errors.body ? `${bodyCountId} ${formId}-body-error` : bodyCountId
          }
          {...register('body')}
        />
        {errors.body && (
          <p id={`${formId}-body-error`} className="text-sm text-negative">
            {errors.body.message}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2
                className="size-4 animate-spin"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              {mode === 'edit' ? 'Saving changes…' : 'Submitting…'}
            </>
          ) : mode === 'edit' ? (
            'Save changes'
          ) : (
            'Submit review'
          )}
        </Button>

        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
