'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            refetchOnMount: false,
            retry: 1,
            staleTime: 1000 * 60 * 3, // 3 minutos de frescor
            gcTime: 1000 * 60 * 15, // Mantém dados inativos em cache por 15 minutos evitando refetches ao navegar
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
