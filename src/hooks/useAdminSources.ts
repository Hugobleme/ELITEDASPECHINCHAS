'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminSources, toggleAdminSource } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/query-keys';

export function useAdminSources() {
  const { token } = useAuth();

  return useQuery({
    queryKey: queryKeys.admin.sources(),
    queryFn: () => getAdminSources(token || undefined),
    staleTime: 1000 * 60,
  });
}

export function useToggleAdminSource() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      toggleAdminSource(id, is_active, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.sources() });
    },
  });
}
