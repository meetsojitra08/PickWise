import { useId, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resolveSafeRedirectPath } from '@/lib/safe-redirect';
import { useAuth } from '../hooks/use-auth';
import { handleAuthFormError } from '../lib/auth-form-errors';
import { loginSchema, type LoginFormValues } from '../schemas/auth-schemas';
import { AuthFormAlert } from '../components/AuthFormAlert';
import { AuthPageShell } from '../components/AuthPageShell';

const LOGIN_FIELDS = ['email', 'password'] as const;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const emailId = useId();
  const passwordId = useId();
  const rememberId = useId();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });

  async function onSubmit(values: LoginFormValues): Promise<void> {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setFormError(null);

    try {
      const user = await login(values);

      if (user.is_active) {
        const destination = resolveSafeRedirectPath(location.state, '/');
        navigate(destination, { replace: true });
      }
    } catch (error: unknown) {
      setFormError(
        handleAuthFormError(error, setError, LOGIN_FIELDS, {
          treatCredentialErrorsAsFormAlert: true,
        }),
      );
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <AuthPageShell
      title="Log in to Pickwise"
      description="Access your wishlist, saved comparisons, and assistant history."
      footer={
        <p className="text-center">
          New to Pickwise?{' '}
          <Link
            to="/register"
            state={location.state}
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Create an account
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
            autoComplete="current-password"
            placeholder="Enter your password"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? `${passwordId}-error` : undefined
            }
            {...register('password')}
          />
          {errors.password && (
            <p id={`${passwordId}-error`} className="text-sm text-negative">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex min-h-11 items-center gap-2.5">
          <Controller
            name="remember"
            control={control}
            render={({ field }) => (
              <Checkbox
                id={rememberId}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                onBlur={field.onBlur}
                disabled={isSubmitting}
              />
            )}
          />
          <Label
            htmlFor={rememberId}
            className="cursor-pointer font-normal text-foreground"
          >
            Keep me logged in
          </Label>
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
              Logging in…
            </>
          ) : (
            'Log in'
          )}
        </Button>
      </form>
    </AuthPageShell>
  );
}
