import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/app/query-client';
import { AuthProvider } from '@/features/auth/components/AuthProvider';

interface AppProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

export function AppProviders({ children, queryClient }: AppProvidersProps) {
  const [defaultClient] = useState(createQueryClient);
  const activeClient = queryClient ?? defaultClient;

  return (
    <QueryClientProvider client={activeClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
