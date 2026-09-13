'use client';

import { useQuery } from '@tanstack/react-query';
import { getCategories, getStores } from '@/lib/api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
}

export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: getStores,
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
}
