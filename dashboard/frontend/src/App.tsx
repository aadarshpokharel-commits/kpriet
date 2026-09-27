import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/router';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

