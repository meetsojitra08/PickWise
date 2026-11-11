import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function App() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );

  function toggleTheme() {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    setIsDark(next);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12 text-foreground">
      <section className="w-full max-w-xl rounded-card border border-border bg-card p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Pickwise</h1>
            <p className="mt-2 max-w-prose text-base text-muted-foreground">
              Decide what to buy, with the homework done.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </Button>
        </div>

        <div className="mt-6 rounded-card border border-border border-l-4 border-l-accent bg-verdict-surface p-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-heading text-base font-medium text-foreground">
              Design system ready
            </span>
            <span className="text-sm font-medium text-positive tabular-nums">
              ₹89,999 · 87/100 fit
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Bricolage Grotesque headings, Figtree body text, and semantic light
            and dark tokens are active.
          </p>
        </div>
      </section>
    </main>
  );
}
