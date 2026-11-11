import { BrowserRouter } from 'react-router';
import { AppRoutes } from '@/app/AppRoutes';
import { AppProviders } from '@/app/providers';

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
