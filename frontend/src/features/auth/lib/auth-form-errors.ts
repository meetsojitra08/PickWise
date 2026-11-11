import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { isApiError } from '@/lib/api-error';
import { applyApiFormErrors } from '@/lib/form-errors';

const LOGIN_CREDENTIAL_MESSAGES = new Set([
  'Email or password is incorrect.',
  'Your account has been deactivated.',
]);

export function handleAuthFormError<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  allowedFields: readonly FieldPath<TFieldValues>[],
  options: { treatCredentialErrorsAsFormAlert?: boolean } = {},
): string | null {
  if (
    isApiError(error) &&
    error.status === 422 &&
    options.treatCredentialErrorsAsFormAlert
  ) {
    const emailMessage = error.getFirstFieldError('email') ?? '';

    if (
      LOGIN_CREDENTIAL_MESSAGES.has(error.message) ||
      LOGIN_CREDENTIAL_MESSAGES.has(emailMessage)
    ) {
      return emailMessage || error.message;
    }
  }

  return applyApiFormErrors(error, setError, allowedFields);
}
