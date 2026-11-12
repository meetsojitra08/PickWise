import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '@/hooks/use-theme';

export function Toaster() {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      theme={theme}
      position="bottom-right"
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:border-border group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:shadow-float',
          description: 'group-[.toaster]:text-muted-foreground',
          actionButton:
            'group-[.toaster]:bg-primary group-[.toaster]:text-primary-foreground',
          cancelButton:
            'group-[.toaster]:bg-muted group-[.toaster]:text-muted-foreground',
          closeButton:
            'group-[.toaster]:border-border group-[.toaster]:bg-card group-[.toaster]:text-foreground',
        },
      }}
    />
  );
}
