import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { isApiError } from '@/lib/api-error';

const LOGIN_CREDENTIAL_MESSAGES = new Set([
  'Email or password is incorrect.',
  'Your account has been deactivated.',
]);

const FALLBACK_ERROR_MESSAGE =
  'Unable to complete your request. Please try again.';

export function handleAuthFormError<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  allowedFields: readonly FieldPath<TFieldValues>[],
  options: { treatCredentialErrorsAsFormAlert?: boolean } = {},
): string | null {
  if (!isApiError(error)) {
    return FALLBACK_ERROR_MESSAGE;
  }

  if (error.status === 422) {
    const fieldErrors = error.getFieldErrors();
    const emailMessage = fieldErrors.email?.[0] ?? '';

    if (
      options.treatCredentialErrorsAsFormAlert &&
      (LOGIN_CREDENTIAL_MESSAGES.has(error.message) ||
        LOGIN_CREDENTIAL_MESSAGES.has(emailMessage))
    ) {
      return emailMessage || error.message;
    }

    let appliedFieldError = false;

    for (const field of allowedFields) {
      const messages = fieldErrors[field];
      const firstMessage = messages?.[0];

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

  return error.message || FALLBACK_ERROR_MESSAGE;
}
