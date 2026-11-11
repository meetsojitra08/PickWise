export function AuthGuardFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-[50vh] place-items-center bg-background px-4 py-12 text-foreground"
    >
      <div className="flex items-center gap-3 rounded-card border border-border bg-card px-5 py-4">
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-border border-t-primary"
        />
        <span className="text-sm text-muted-foreground">
          Checking your session…
        </span>
      </div>
    </div>
  );
}
