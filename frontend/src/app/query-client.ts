import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/lib/api-error';

const DEFAULT_STALE_TIME_MS = 60_000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (isApiError(error) && error.status >= 400 && error.status < 500) {
            return false;
          }

          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
