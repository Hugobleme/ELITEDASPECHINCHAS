'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminOffers,
  getAdminOfferById,
  updateAdminOffer,
  publishAdminOffer,
  bulkActionAdminOffers,
} from '@/lib/api';
import { AdminOffersFilterParams, AdminOfferUpdatePayload } from '@/types/admin';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/query-keys';

export function useAdminOffers(params: AdminOffersFilterParams = {}) {
  const { token } = useAuth();

  return useQuery({
    queryKey: queryKeys.admin.offers(params),
    queryFn: () => getAdminOffers(params, token || undefined),
    staleTime: 1000 * 30, // 30 segundos
  });
}

export function useAdminOffer(id: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: queryKeys.admin.offer(id),
    queryFn: () => getAdminOfferById(id, token || undefined),
    enabled: !!id,
  });
}

export function useUpdateAdminOffer() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminOfferUpdatePayload }) =>
      updateAdminOffer(id, payload, token || undefined),
    onSuccess: () => {
      // Invalida cache de ofertas do admin, métricas e vitrine pública
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.offersRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.metricsRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.all() });
    },
  });
}

export function usePublishAdminOffer() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (id: string) => publishAdminOffer(id, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.offersRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.metricsRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.all() });
    },
  });
}

export function useBulkAdminOffers() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: 'approve' | 'reject' | 'publish' }) =>
      bulkActionAdminOffers(ids, action, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.offersRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.metricsRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.all() });
    },
  });
}
