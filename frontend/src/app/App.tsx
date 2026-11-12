import { BrowserRouter } from 'react-router';
import { AppRoutes } from '@/app/AppRoutes';
import { AppProviders } from '@/app/providers';
import { Toaster } from '@/components/ui/sonner';

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Toaster />
    </AppProviders>
  );
}
