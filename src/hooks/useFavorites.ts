'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserFavorites, addUserFavorite, removeUserFavorite } from '@/lib/api';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { queryKeys } from '@/lib/query-keys';

export function useFavorites() {
  const { token, isAuthenticated } = useUserAuth();

  return useQuery({
    queryKey: queryKeys.user.favorites(isAuthenticated),
    queryFn: () => getUserFavorites(token || undefined),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();
  const { token, isAuthenticated, openAuthModal } = useUserAuth();

  return useMutation({
    mutationFn: (offerId: string) => {
      if (!isAuthenticated) {
        openAuthModal('login');
        throw new Error('Faça login para favoritar produtos.');
      }
      return addUserFavorite(offerId, token || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.favoritesRoot() });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  const { token } = useUserAuth();

  return useMutation({
    mutationFn: (offerId: string) => removeUserFavorite(offerId, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.favoritesRoot() });
    },
  });
}

export function useIsFavorite(offerId: string): boolean {
  const { data: favorites = [] } = useFavorites();
  return favorites.some((fav) => fav.offer_id === offerId || fav.offer?.id === offerId);
}
