import { useId, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resolveSafeRedirectPath } from '@/lib/safe-redirect';
import { useAuth } from '../hooks/use-auth';
import { handleAuthFormError } from '../lib/auth-form-errors';
import {
  registerSchema,
  type RegisterFormValues,
} from '../schemas/auth-schemas';
import { AuthFormAlert } from '../components/AuthFormAlert';
import { AuthPageShell } from '../components/AuthPageShell';

const REGISTER_FIELDS = [
  'name',
  'email',
  'password',
  'password_confirmation',
] as const;

export function RegisterPage() {
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const passwordHintId = useId();
  const confirmPasswordId = useId();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
    },
  });

  async function onSubmit(values: RegisterFormValues): Promise<void> {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setFormError(null);

    try {
      const user = await registerAccount(values);

      if (user.is_active) {
        const destination = resolveSafeRedirectPath(location.state, '/');
        navigate(destination, { replace: true });
      }
    } catch (error: unknown) {
      setFormError(handleAuthFormError(error, setError, REGISTER_FIELDS));
    } finally {
      submittingRef.current = false;
    }
  }

  const passwordDescribedBy = errors.password
    ? `${passwordHintId} ${passwordId}-error`
    : passwordHintId;

  return (
    <AuthPageShell
      title="Create your account"
      description="Save products, compare picks side by side, and keep your assistant history."
      footer={
        <p className="text-center">
          Already have an account?{' '}
          <Link
            to="/login"
            state={location.state}
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Log in
          </Link>
        </p>
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        className="flex flex-col gap-4"
      >
        <AuthFormAlert message={formError} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={nameId}>Name</Label>
          <Input
            id={nameId}
            type="text"
            autoComplete="name"
            placeholder="Asha Verma"
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
            placeholder="you@example.com"
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={passwordId}>Password</Label>
          <PasswordInput
            id={passwordId}
            autoComplete="new-password"
            placeholder="Create a password"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={passwordDescribedBy}
            {...register('password')}
          />
          <p id={passwordHintId} className="text-xs text-muted-foreground">
            At least 8 characters.
          </p>
          {errors.password && (
            <p id={`${passwordId}-error`} className="text-sm text-negative">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={confirmPasswordId}>Confirm password</Label>
          <PasswordInput
            id={confirmPasswordId}
            autoComplete="new-password"
            placeholder="Re-enter your password"
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

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="mt-1 w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2
                className="size-4 animate-spin"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Creating account…
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>
    </AuthPageShell>
  );
}
