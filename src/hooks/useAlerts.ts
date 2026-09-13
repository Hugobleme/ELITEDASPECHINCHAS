'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserAlerts, createUserAlert, deleteUserAlert } from '@/lib/api';
import { useUserAuth } from '@/contexts/UserAuthContext';

export function useAlerts() {
  const { token, isAuthenticated } = useUserAuth();

  return useQuery({
    queryKey: ['user', 'alerts', isAuthenticated],
    queryFn: () => getUserAlerts(token || undefined),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  const { token, isAuthenticated, openAuthModal } = useUserAuth();

  return useMutation({
    mutationFn: (payload: { category?: string; store?: string; keyword?: string; target_discount: number }) => {
      if (!isAuthenticated) {
        openAuthModal('login');
        throw new Error('Faça login para criar alertas de preço.');
      }
      return createUserAlert(payload, token || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'alerts'] });
    },
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();
  const { token } = useUserAuth();

  return useMutation({
    mutationFn: (alertId: string) => deleteUserAlert(alertId, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'alerts'] });
    },
  });
}
