import { useId, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { FormStatusBanner } from '@/components/shared/FormStatusBanner';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { applyApiFormErrors } from '@/lib/form-errors';
import { useUpdatePasswordMutation } from '../hooks/use-account-mutations';
import {
  updatePasswordSchema,
  type UpdatePasswordFormValues,
} from '../schemas/account-schemas';

const PASSWORD_FIELDS = [
  'current_password',
  'password',
  'password_confirmation',
] as const;

export function ChangePasswordForm() {
  const { mutateAsync: submitPassword } = useUpdatePasswordMutation();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const currentPasswordId = useId();
  const newPasswordId = useId();
  const newPasswordHintId = useId();
  const confirmPasswordId = useId();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      current_password: '',
      password: '',
      password_confirmation: '',
    },
  });

  async function onSubmit(values: UpdatePasswordFormValues): Promise<void> {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setFormError(null);
    setStatusMessage(null);

    try {
      const message = await submitPassword(values);
      reset();
      setStatusMessage(message || 'Password updated.');
    } catch (error: unknown) {
      setFormError(applyApiFormErrors(error, setError, PASSWORD_FIELDS));
    } finally {
      submittingRef.current = false;
    }
  }

  const newPasswordDescribedBy = errors.password
    ? `${newPasswordHintId} ${newPasswordId}-error`
    : newPasswordHintId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-xl font-semibold text-foreground">
            Change password
          </h2>
        </CardTitle>
        <CardDescription>
          Enter your current password before choosing a new one.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          noValidate
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
          className="flex max-w-lg flex-col gap-4"
        >
          <FormStatusBanner variant="success" message={statusMessage} />
          <FormStatusBanner variant="error" message={formError} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={currentPasswordId}>Current password</Label>
            <PasswordInput
              id={currentPasswordId}
              autoComplete="current-password"
              showLabel="Show current password"
              hideLabel="Hide current password"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.current_password)}
              aria-describedby={
                errors.current_password
                  ? `${currentPasswordId}-error`
                  : undefined
              }
              {...register('current_password')}
            />
            {errors.current_password && (
              <p
                id={`${currentPasswordId}-error`}
                className="text-sm text-negative"
              >
                {errors.current_password.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={newPasswordId}>New password</Label>
            <PasswordInput
              id={newPasswordId}
              autoComplete="new-password"
              showLabel="Show new password"
              hideLabel="Hide new password"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={newPasswordDescribedBy}
              {...register('password')}
            />
            <p id={newPasswordHintId} className="text-xs text-muted-foreground">
              At least 8 characters and different from your current password.
            </p>
            {errors.password && (
              <p
                id={`${newPasswordId}-error`}
                className="text-sm text-negative"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={confirmPasswordId}>Confirm new password</Label>
            <PasswordInput
              id={confirmPasswordId}
              autoComplete="new-password"
              showLabel="Show confirm password"
              hideLabel="Hide confirm password"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.password_confirmation)}
              aria-describedby={
                errors.password_confirmation
                  ? `${confirmPasswordId}-error`
                  : undefined
              }
              {...register('password_confirmation')}
            />
            {errors.password_confirmation && (
              <p
                id={`${confirmPasswordId}-error`}
                className="text-sm text-negative"
              >
                {errors.password_confirmation.message}
              </p>
            )}
          </div>

          <div className="pt-1">
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
                  Updating password…
                </>
              ) : (
                'Update password'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
