import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { isApiError } from '@/lib/api-error';

const DEFAULT_FALLBACK_ERROR_MESSAGE =
  'Unable to complete your request. Please try again.';

export function applyApiFormErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  allowedFields: readonly FieldPath<TFieldValues>[],
): string | null {
  if (!isApiError(error)) {
    return DEFAULT_FALLBACK_ERROR_MESSAGE;
  }

  if (error.status === 422) {
    const fieldErrors = error.getFieldErrors();
    let appliedFieldError = false;

    for (const field of allowedFields) {
      const firstMessage = fieldErrors[field]?.[0];

      if (firstMessage) {
        setError(field, { type: 'server', message: firstMessage });
        appliedFieldError = true;
      }
    }

    if (appliedFieldError) {
      return null;
    }

    return error.message;
  }

  if (error.status === 429) {
    return error.message || 'Too many attempts. Try again in a minute.';
  }

  return error.message || DEFAULT_FALLBACK_ERROR_MESSAGE;
}
