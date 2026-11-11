import { useId, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { FormStatusBanner } from '@/components/shared/FormStatusBanner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User } from '@/features/auth/types/auth';
import { applyApiFormErrors } from '@/lib/form-errors';
import { useUpdateProfileMutation } from '../hooks/use-account-mutations';
import {
  updateProfileSchema,
  type UpdateProfileFormValues,
} from '../schemas/account-schemas';

const PROFILE_FIELDS = ['name', 'email'] as const;

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const { mutateAsync: submitProfile } = useUpdateProfileMutation();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const nameId = useId();
  const emailId = useId();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
    },
  });

  async function onSubmit(values: UpdateProfileFormValues): Promise<void> {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setFormError(null);
    setStatusMessage(null);

    try {
      const updatedUser = await submitProfile(values);
      reset({ name: updatedUser.name, email: updatedUser.email });
      setStatusMessage('Profile updated.');
    } catch (error: unknown) {
      setFormError(applyApiFormErrors(error, setError, PROFILE_FIELDS));
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-xl font-semibold text-foreground">
            Profile details
          </h2>
        </CardTitle>
        <CardDescription>
          Update the name and email address used on your Pickwise account.
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
            <Label htmlFor={nameId}>Name</Label>
            <Input
              id={nameId}
              type="text"
              autoComplete="name"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? `${nameId}-error` : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p id={`${nameId}-error`} className="text-sm text-negative">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={emailId}>Email</Label>
            <Input
              id={emailId}
              type="email"
              inputMode="email"
              autoComplete="email"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${emailId}-error` : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p id={`${emailId}-error`} className="text-sm text-negative">
                {errors.email.message}
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
                  Saving profile…
                </>
              ) : (
                'Save profile'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
