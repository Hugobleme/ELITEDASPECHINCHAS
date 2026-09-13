'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getOffers } from '@/lib/api';
import { OffersFilterParams } from '@/types/offer';

export function useOffersInfinite(params: OffersFilterParams = {}) {
  const { store, category, min_discount, sort, search } = params;

  return useInfiniteQuery({
    queryKey: ['offers', 'infinite', { store, category, min_discount, sort, search }],
    queryFn: async ({ pageParam = 1 }) => {
      return getOffers({
        ...params,
        page: pageParam,
        limit: 12,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.has_more) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useOffers(params: OffersFilterParams = {}) {
  const { store, category, min_discount, sort, search, page = 1, limit = 12 } = params;

  return useQuery({
    queryKey: ['offers', { store, category, min_discount, sort, search, page, limit }],
    queryFn: () => getOffers(params),
    staleTime: 1000 * 60 * 2,
  });
}
