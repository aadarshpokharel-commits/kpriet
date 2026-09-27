import { QueryClient } from '@tanstack/react-query';
import { isAppApiError } from './api/AppApiError';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retrying a 4xx never helps; retry network blips and 5xx twice.
      retry: (failureCount, error) => {
        if (isAppApiError(error) && error.isClientError) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});
