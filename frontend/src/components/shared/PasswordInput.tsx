import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PasswordInputProps extends Omit<
  React.ComponentProps<'input'>,
  'type'
> {
  showLabel?: string;
  hideLabel?: string;
}

export function PasswordInput({
  className,
  disabled,
  showLabel = 'Show password',
  hideLabel = 'Hide password',
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        type={isVisible ? 'text' : 'password'}
        disabled={disabled}
        className={cn('pr-11', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setIsVisible((prev) => !prev)}
        disabled={disabled}
        aria-label={isVisible ? hideLabel : showLabel}
        aria-pressed={isVisible}
        className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-control text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
      >
        {isVisible ? (
          <EyeOff className="size-4" strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <Eye className="size-4" strokeWidth={1.5} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
