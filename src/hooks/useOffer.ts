'use client';

import { useQuery } from '@tanstack/react-query';
import { getOfferById } from '@/lib/api';

export function useOffer(id: string) {
  return useQuery({
    queryKey: ['offer', id],
    queryFn: () => getOfferById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
