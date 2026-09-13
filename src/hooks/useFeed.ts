'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPersonalizedFeed, getUserPreferences, updateUserPreferences } from '@/lib/api';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { UserPreference } from '@/types/user';
import { queryKeys } from '@/lib/query-keys';

export function usePersonalizedFeed(page = 1, limit = 12, enabled = true) {
  const { token, isAuthenticated } = useUserAuth();

  return useQuery({
    queryKey: queryKeys.user.feed(page, limit, isAuthenticated),
    queryFn: () => getPersonalizedFeed(page, limit, token || undefined),
    staleTime: 1000 * 60 * 2, // 2 minutos
    enabled,
  });
}

export function useUserPreferences() {
  const { token, isAuthenticated } = useUserAuth();

  return useQuery({
    queryKey: queryKeys.user.preferences(isAuthenticated),
    queryFn: () => getUserPreferences(token || undefined),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();
  const { token } = useUserAuth();

  return useMutation({
    mutationFn: (payload: Partial<UserPreference>) =>
      updateUserPreferences(payload, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.preferencesRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.feedRoot() });
    },
  });
}
