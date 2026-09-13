/**
 * Centralized TanStack Query Key Factory.
 * Guarantees type safety and consistent cache invalidation across the app.
 */

export const queryKeys = {
  taxonomies: {
    categories: () => ['categories'] as const,
    stores: () => ['stores'] as const,
  },
  offers: {
    all: () => ['offers'] as const,
    infinite: (filters: Record<string, unknown>) =>
      ['offers', 'infinite', filters] as const,
    list: (filters: Record<string, unknown>) =>
      ['offers', filters] as const,
    detail: (id: string) => ['offer', id] as const,
  },
  user: {
    all: () => ['user'] as const,
    feed: (page?: number, limit?: number, auth?: boolean) =>
      ['user', 'feed', page, limit, auth] as const,
    feedRoot: () => ['user', 'feed'] as const,
    preferences: (auth?: boolean) =>
      ['user', 'preferences', auth] as const,
    preferencesRoot: () => ['user', 'preferences'] as const,
    favorites: (auth?: boolean) =>
      ['user', 'favorites', auth] as const,
    favoritesRoot: () => ['user', 'favorites'] as const,
    alerts: (auth?: boolean) =>
      ['user', 'alerts', auth] as const,
    alertsRoot: () => ['user', 'alerts'] as const,
  },
  admin: {
    all: () => ['admin'] as const,
    sources: () => ['admin', 'sources'] as const,
    offers: (params?: unknown) => ['admin', 'offers', params] as const,
    offersRoot: () => ['admin', 'offers'] as const,
    offer: (id: string) => ['admin', 'offer', id] as const,
    metrics: (range?: string) => ['admin', 'metrics', range] as const,
    metricsRoot: () => ['admin', 'metrics'] as const,
  },
} as const;
