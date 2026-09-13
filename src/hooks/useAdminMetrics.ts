'use client';

import { useQuery } from '@tanstack/react-query';
import { getAdminMetrics } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/query-keys';

export function useAdminMetrics(range = '7d') {
  const { token } = useAuth();

  return useQuery({
    queryKey: queryKeys.admin.metrics(range),
    queryFn: () => getAdminMetrics(range, token || undefined),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}
