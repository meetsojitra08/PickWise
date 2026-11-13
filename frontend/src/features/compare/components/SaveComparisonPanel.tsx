import { useState, type FormEvent } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { toast } from 'sonner';
import { FormStatusBanner } from '@/components/shared/FormStatusBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCreateComparison } from '@/features/compare/hooks/use-saved-comparisons';
import { isApiError } from '@/lib/api-error';

interface SaveComparisonPanelProps {
  productIds: number[];
}

export function SaveComparisonPanel({ productIds }: SaveComparisonPanelProps) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [name, setName] = useState('');
  const saveComparison = useCreateComparison();
  const trimmedName = name.trim();
  const errorMessage = isApiError(saveComparison.error)
    ? (saveComparison.error.getFirstFieldError('product_ids') ??
      saveComparison.error.message)
    : saveComparison.isError
      ? "We couldn't save this comparison. Try again."
      : null;

  if (!isAuthenticated) {
    return (
      <div className="mb-6 flex flex-col gap-3 rounded-card border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Sign in to save this comparison and come back to it later.
        </p>
        <Button asChild variant="outline">
          <Link to="/login" state={{ from: location }}>
            Sign in to save
          </Link>
        </Button>
      </div>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (trimmedName === '' || productIds.length < 2) {
      return;
    }

    saveComparison.mutate(
      { name: trimmedName, productIds },
      {
        onSuccess: () => {
          setName('');
          toast.success('Comparison saved.');
        },
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-card border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="comparison-name" className="mb-1.5 block">
            Name this comparison
          </Label>
          <Input
            id="comparison-name"
            value={name}
            maxLength={100}
            placeholder="e.g. Laptops for video editing"
            onChange={(event) => setName(event.target.value)}
            aria-describedby="comparison-name-hint"
          />
        </div>
        <Button
          type="submit"
          disabled={trimmedName === '' || saveComparison.isPending}
        >
          <BookmarkPlus aria-hidden="true" />
          {saveComparison.isPending ? 'Saving…' : 'Save comparison'}
        </Button>
      </div>

      <p
        id="comparison-name-hint"
        className="mt-2 text-xs text-muted-foreground"
      >
        Saved comparisons live in your account, where you can share a read-only
        link or reopen them.
      </p>

      {errorMessage ? (
        <div className="mt-3">
          <FormStatusBanner variant="error" message={errorMessage} />
        </div>
      ) : null}

      {saveComparison.isSuccess ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Saved.{' '}
          <Link
            to="/account?tab=comparisons"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            View your saved comparisons
          </Link>
        </p>
      ) : null}
    </form>
  );
}
