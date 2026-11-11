import { AlertCircle } from 'lucide-react';

interface AuthFormAlertProps {
  message: string | null;
}

export function AuthFormAlert({ message }: AuthFormAlertProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-control border border-negative/30 bg-negative-subtle px-3.5 py-3 text-sm text-negative"
    >
      <AlertCircle
        className="mt-0.5 size-4 shrink-0"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <span>{message}</span>
    </div>
  );
}
