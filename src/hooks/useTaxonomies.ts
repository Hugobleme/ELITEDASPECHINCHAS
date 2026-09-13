'use client';

import { useQuery } from '@tanstack/react-query';
import { getCategories, getStores } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.taxonomies.categories(),
    queryFn: getCategories,
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
}

export function useStores() {
  return useQuery({
    queryKey: queryKeys.taxonomies.stores(),
    queryFn: getStores,
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
}
