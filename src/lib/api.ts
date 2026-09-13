import { Offer, OffersFilterParams, OffersResponse, CategoryItem, StoreItem } from '@/types/offer';
import {
  AdminMetrics,
  TelegramSource,
  AdminOfferUpdatePayload,
  AdminOffersFilterParams,
} from '@/types/admin';
import {
  EndUser,
  UserPreference,
  FavoriteItem,
  PriceAlertItem,
  PushSubscriptionPayload,
} from '@/types/user';
import {
  MOCK_OFFERS,
  MOCK_PENDING_OFFERS,
  MOCK_CATEGORIES,
  MOCK_STORES,
  MOCK_TELEGRAM_SOURCES,
  MOCK_METRICS,
} from './mock-data';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';

/**
 * Estado mutável em memória para o Modo Demonstração (Fallback offline)
 */
let localOffers: Offer[] = [...MOCK_OFFERS, ...MOCK_PENDING_OFFERS];
let localSources: TelegramSource[] = [...MOCK_TELEGRAM_SOURCES];

/**
 * Utilitário de fetch seguro com timeout de 4 segundos
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Helper para headers autenticados
 */
function getAuthHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const activeToken =
    token || (typeof window !== 'undefined' ? localStorage.getItem('promoradar_admin_token') : null);
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }
  return headers;
}

/* ==========================================================================
   ROTAS PÚBLICAS (FASE 1)
   ========================================================================== */

/**
 * Busca lista de ofertas com filtros, paginação e ordenação (Vitrine)
 */
export async function getOffers(params: OffersFilterParams = {}): Promise<OffersResponse> {
  const {
    store,
    category,
    min_discount = 0,
    sort = 'recent',
    page = 1,
    limit = 12,
    search = '',
  } = params;

  if (API_BASE_URL) {
    try {
      const query = new URLSearchParams();
      if (store) query.set('store', store);
      if (category && category !== 'todas') query.set('category', category);
      if (min_discount > 0) query.set('min_discount', String(min_discount));
      if (sort) query.set('sort', sort);
      if (page) query.set('page', String(page));
      if (limit) query.set('limit', String(limit));
      if (search) query.set('search', search);

      const res = await fetchWithTimeout(`${API_BASE_URL}/offers?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const filtered = data.filter((o: Offer) => o.status === 'published' || o.status === 'approved');
          return {
            items: filtered,
            total: filtered.length,
            page,
            limit,
            has_more: filtered.length > page * limit,
          };
        }
        return {
          items: (data.items || []).filter((o: Offer) => o.status === 'published' || o.status === 'approved'),
          total: data.total ?? data.items?.length ?? 0,
          page: data.page ?? page,
          limit: data.limit ?? limit,
          has_more: data.has_more ?? false,
        };
      }
    } catch {
      console.warn('[API] FastAPI offline. Usando dados mockados.');
    }
  }

  // Fallback vitrine pública: apenas published ou approved
  let results = localOffers.filter((o) => o.status === 'published' || o.status === 'approved');

  if (store && store !== 'todas') {
    const storeLower = store.toLowerCase();
    results = results.filter((o) => o.store.toLowerCase().includes(storeLower));
  }

  if (category && category !== 'todas') {
    const catLower = category.toLowerCase();
    results = results.filter((o) => o.category.toLowerCase() === catLower);
  }

  if (min_discount > 0) {
    results = results.filter((o) => o.discount_pct >= min_discount);
  }

  if (search.trim()) {
    const searchLower = search.toLowerCase();
    results = results.filter(
      (o) =>
        o.title.toLowerCase().includes(searchLower) ||
        o.store.toLowerCase().includes(searchLower) ||
        o.category.toLowerCase().includes(searchLower)
    );
  }

  if (sort === 'discount') {
    results.sort((a, b) => b.discount_pct - a.discount_pct);
  } else if (sort === 'price') {
    results.sort((a, b) => a.price_current - b.price_current);
  } else {
    results.sort((a, b) => {
      const timeA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const timeB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return timeB - timeA;
    });
  }

  const total = results.length;
  const startIndex = (page - 1) * limit;
  const paginatedItems = results.slice(startIndex, startIndex + limit);
  const has_more = startIndex + limit < total;

  return { items: paginatedItems, total, page, limit, has_more };
}

/**
 * Busca oferta específica pelo ID
 */
export async function getOfferById(id: string): Promise<Offer | null> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/offers/${id}`);
      if (res.ok) {
        const offer = await res.json();
        if (offer.status === 'published' || offer.status === 'approved') {
          return offer;
        }
        return null;
      }
    } catch {
      // fallback
    }
  }

  const found = localOffers.find((o) => o.id === id);
  if (found && (found.status === 'published' || found.status === 'approved')) {
    return found;
  }
  return null;
}

export async function getCategories(): Promise<CategoryItem[]> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/categories`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch {}
  }
  return MOCK_CATEGORIES;
}

export async function getStores(): Promise<StoreItem[]> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/stores`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch {}
  }
  return MOCK_STORES;
}

export async function trackClick(offerId: string): Promise<boolean> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/events/click`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offer_id: offerId }),
        },
        2000
      );
      return res.ok;
    } catch {
      return false;
    }
  }
  return true;
}

/* ==========================================================================
   ROTAS ADMINISTRATIVAS & CURADORIA (FASE 2)
   ========================================================================== */

/**
 * GET /admin/offers?status=pending&page=&limit= (Fila de curadoria)
 */
export async function getAdminOffers(
  params: AdminOffersFilterParams = {},
  token?: string
): Promise<OffersResponse> {
  const { status = 'pending', store, source, min_discount = 0, page = 1, limit = 20, search = '' } = params;

  if (API_BASE_URL) {
    try {
      const query = new URLSearchParams();
      if (status && status !== 'all') query.set('status', status);
      if (store) query.set('store', store);
      if (source) query.set('source', source);
      if (min_discount > 0) query.set('min_discount', String(min_discount));
      if (page) query.set('page', String(page));
      if (limit) query.set('limit', String(limit));
      if (search) query.set('search', search);

      const res = await fetchWithTimeout(`${API_BASE_URL}/admin/offers?${query.toString()}`, {
        headers: getAuthHeaders(token),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return { items: data, total: data.length, page, limit, has_more: false };
        }
        return data;
      }
    } catch {
      console.warn('[Admin API] FastAPI offline. Carregando fila de curadoria no mock store.');
    }
  }

  // Fallback Mock com filtragem dinâmica
  let filtered = [...localOffers];

  if (status && status !== 'all') {
    filtered = filtered.filter((o) => o.status === status);
  }

  if (store && store !== 'todas') {
    filtered = filtered.filter((o) => o.store.toLowerCase().includes(store.toLowerCase()));
  }

  if (source && source !== 'todas') {
    filtered = filtered.filter((o) => o.source_name?.toLowerCase().includes(source.toLowerCase()));
  }

  if (min_discount > 0) {
    filtered = filtered.filter((o) => o.discount_pct >= min_discount);
  }

  if (search.trim()) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.title.toLowerCase().includes(s) ||
        o.store.toLowerCase().includes(s) ||
        o.source_name?.toLowerCase().includes(s)
    );
  }

  // Ordena por data de criação mais recente
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  return {
    items: paginated,
    total,
    page,
    limit,
    has_more: startIndex + limit < total,
  };
}

/**
 * GET /admin/offers/{id}
 */
export async function getAdminOfferById(id: string, token?: string): Promise<Offer | null> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/admin/offers/${id}`, {
        headers: getAuthHeaders(token),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  const found = localOffers.find((o) => o.id === id);
  return found || null;
}

/**
 * PATCH /admin/offers/{id}
 */
export async function updateAdminOffer(
  id: string,
  payload: AdminOfferUpdatePayload,
  token?: string
): Promise<Offer> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/admin/offers/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json();
    } catch {
      console.warn('[Admin API] Falha na chamada remota. Atualizando mock local.');
    }
  }

  // Atualização no mock store local
  const index = localOffers.findIndex((o) => o.id === id);
  if (index >= 0) {
    const original = localOffers[index];
    const updated: Offer = {
      ...original,
      ...payload,
      // Recalcula % de desconto se os preços foram alterados
      discount_pct:
        payload.price_original && payload.price_current
          ? Math.round(((payload.price_original - payload.price_current) / payload.price_original) * 100)
          : original.discount_pct,
    };
    localOffers[index] = updated;
    return updated;
  }

  throw new Error(`Oferta ${id} não encontrada.`);
}

/**
 * POST /admin/offers/{id}/publish
 */
export async function publishAdminOffer(id: string, token?: string): Promise<Offer> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/admin/offers/${id}/publish`, {
        method: 'POST',
        headers: getAuthHeaders(token),
      });
      if (res.ok) return await res.json();
    } catch {
      console.warn('[Admin API] Falha remota ao publicar. Publicando no mock local.');
    }
  }

  const index = localOffers.findIndex((o) => o.id === id);
  if (index >= 0) {
    const updated: Offer = {
      ...localOffers[index],
      status: 'published',
      published_at: new Date().toISOString(),
    };
    localOffers[index] = updated;
    return updated;
  }

  throw new Error(`Oferta ${id} não encontrada.`);
}

/**
 * Ação em Lote: aprovar, rejeitar ou publicar múltiplas ofertas
 */
export async function bulkActionAdminOffers(
  ids: string[],
  action: 'approve' | 'reject' | 'publish',
  token?: string
): Promise<{ success: boolean; updated: number }> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/admin/offers/bulk`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ ids, action }),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  let count = 0;
  localOffers = localOffers.map((offer) => {
    if (ids.includes(offer.id)) {
      count++;
      if (action === 'publish') {
        return { ...offer, status: 'published', published_at: new Date().toISOString() };
      }
      if (action === 'approve') {
        return { ...offer, status: 'approved' };
      }
      if (action === 'reject') {
        return { ...offer, status: 'rejected' };
      }
    }
    return offer;
  });

  return { success: true, updated: count };
}

/**
 * GET /admin/metrics?range=7d
 */
export async function getAdminMetrics(range = '7d', token?: string): Promise<AdminMetrics> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/admin/metrics?range=${range}`, {
        headers: getAuthHeaders(token),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  // Recalcula KPIs do mock em tempo real baseado no localOffers
  const pendingCount = localOffers.filter((o) => o.status === 'pending').length;
  const publishedCount = localOffers.filter((o) => o.status === 'published').length;
  const rejectedCount = localOffers.filter((o) => o.status === 'rejected').length;

  return {
    ...MOCK_METRICS,
    total_pending: pendingCount,
    total_approved: publishedCount,
    total_rejected: rejectedCount,
    status_distribution: [
      { status: 'published', label: 'Publicadas', count: publishedCount, color: '#10b981' },
      { status: 'pending', label: 'Pendentes', count: pendingCount, color: '#f59e0b' },
      { status: 'rejected', label: 'Rejeitadas', count: rejectedCount, color: '#ef4444' },
    ],
  };
}

/**
 * GET /admin/sources
 */
export async function getAdminSources(token?: string): Promise<TelegramSource[]> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/admin/sources`, {
        headers: getAuthHeaders(token),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  return localSources;
}

/**
 * PATCH /admin/sources/{id}
 */
export async function toggleAdminSource(
  id: string,
  isActive: boolean,
  token?: string
): Promise<TelegramSource> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/admin/sources/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ is_active: isActive }),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  const index = localSources.findIndex((s) => s.id === id);
  if (index >= 0) {
    localSources[index] = {
      ...localSources[index],
      is_active: isActive,
      last_activity_at: new Date().toISOString(),
    };
    return localSources[index];
  }

  throw new Error(`Fonte ${id} não encontrada.`);
}

/* ==========================================================================
   ROTAS DE USUÁRIO FINAL (FASE 3: AUTH, FAVORITOS, ALERTAS E PUSH)
   ========================================================================== */

/**
 * Estado mutável local para Usuário Final em Modo Demonstração
 */
let localFavorites: string[] = [
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'b23c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
];

let localAlerts: PriceAlertItem[] = [
  {
    id: 'alt-01',
    user_id: 'usr-demo-01',
    category: 'eletronicos',
    store: 'Amazon',
    keyword: 'Galaxy',
    target_discount: 30,
    active: true,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'alt-02',
    user_id: 'usr-demo-01',
    category: 'games',
    store: 'Kabum',
    keyword: 'PlayStation',
    target_discount: 20,
    active: true,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

let localUserPreferences: UserPreference = {
  categories: ['eletronicos', 'games', 'tv-e-audio'],
  stores: ['Amazon', 'Kabum', 'Mercado Livre'],
  min_discount: 20,
};

let localCurrentUser: EndUser = {
  id: 'usr-demo-01',
  email: 'usuario@promoradar.com.br',
  name: 'Hugo Hunter',
  provider: 'email',
  created_at: new Date().toISOString(),
};

function getUserAuthHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const activeToken =
    token || (typeof window !== 'undefined' ? localStorage.getItem('promoradar_user_token') : null);
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }
  return headers;
}

export async function apiUserRegister(email: string, password: string, name: string): Promise<{ access_token: string; refresh_token: string }> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Falha ao registrar usuário.');
    } catch (e: any) {
      if (e.message && !e.message.includes('Failed to fetch')) throw e;
      console.warn('[API Auth] FastAPI offline. Simulando registro local.');
    }
  }

  localCurrentUser = {
    id: `usr_${Date.now()}`,
    email,
    name,
    provider: 'email',
    created_at: new Date().toISOString(),
  };

  return { access_token: `mock_jwt_${Date.now()}`, refresh_token: `mock_refresh_${Date.now()}` };
}

export async function apiUserLogin(email: string, password: string): Promise<{ access_token: string; refresh_token: string }> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Falha ao autenticar.');
    } catch (e: any) {
      if (e.message && !e.message.includes('Failed to fetch')) throw e;
      console.warn('[API Auth] FastAPI offline. Simulando login local.');
    }
  }

  localCurrentUser = {
    id: 'usr-demo-01',
    email,
    name: email.split('@')[0],
    provider: 'email',
    created_at: new Date().toISOString(),
  };

  return { access_token: `mock_jwt_${Date.now()}`, refresh_token: `mock_refresh_${Date.now()}` };
}

export async function apiUserGoogle(idToken: string): Promise<{ access_token: string; refresh_token: string }> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  localCurrentUser = {
    id: 'usr-google-demo',
    email: 'google.user@gmail.com',
    name: 'Google User',
    provider: 'google',
    created_at: new Date().toISOString(),
  };

  return { access_token: `mock_google_jwt_${Date.now()}`, refresh_token: `mock_refresh_${Date.now()}` };
}

export async function apiGetMe(token?: string): Promise<EndUser> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/me`, {
        headers: getUserAuthHeaders(token),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  return localCurrentUser;
}

export async function getUserPreferences(token?: string): Promise<UserPreference> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/me/preferences`, {
        headers: getUserAuthHeaders(token),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  return localUserPreferences;
}

export async function updateUserPreferences(payload: Partial<UserPreference>, token?: string): Promise<UserPreference> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/me/preferences`, {
        method: 'PATCH',
        headers: getUserAuthHeaders(token),
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  localUserPreferences = {
    ...localUserPreferences,
    ...payload,
  };
  return localUserPreferences;
}

export async function getUserFavorites(token?: string): Promise<FavoriteItem[]> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/me/favorites`, {
        headers: getUserAuthHeaders(token),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  // Monta lista com base nas ofertas publicadas
  return localFavorites.map((offerId) => {
    const offer = localOffers.find((o) => o.id === offerId);
    return {
      id: `fav_${offerId}`,
      user_id: localCurrentUser.id,
      offer_id: offerId,
      created_at: new Date().toISOString(),
      offer,
    };
  });
}

export async function addUserFavorite(offerId: string, token?: string): Promise<FavoriteItem> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/me/favorites`, {
        method: 'POST',
        headers: getUserAuthHeaders(token),
        body: JSON.stringify({ offer_id: offerId }),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  if (!localFavorites.includes(offerId)) {
    localFavorites.push(offerId);
  }

  const offer = localOffers.find((o) => o.id === offerId);
  return {
    id: `fav_${offerId}`,
    user_id: localCurrentUser.id,
    offer_id: offerId,
    created_at: new Date().toISOString(),
    offer,
  };
}

export async function removeUserFavorite(offerId: string, token?: string): Promise<boolean> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/me/favorites/${offerId}`, {
        method: 'DELETE',
        headers: getUserAuthHeaders(token),
      });
      if (res.ok) return true;
    } catch {}
  }

  localFavorites = localFavorites.filter((id) => id !== offerId);
  return true;
}

export async function getUserAlerts(token?: string): Promise<PriceAlertItem[]> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/me/alerts`, {
        headers: getUserAuthHeaders(token),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  return localAlerts;
}

export async function createUserAlert(
  payload: { category?: string; store?: string; keyword?: string; target_discount: number },
  token?: string
): Promise<PriceAlertItem> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/me/alerts`, {
        method: 'POST',
        headers: getUserAuthHeaders(token),
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  const newAlert: PriceAlertItem = {
    id: `alt_${Date.now()}`,
    user_id: localCurrentUser.id,
    category: payload.category || null,
    store: payload.store || null,
    keyword: payload.keyword || null,
    target_discount: payload.target_discount,
    active: true,
    created_at: new Date().toISOString(),
  };

  localAlerts.unshift(newAlert);
  return newAlert;
}

export async function deleteUserAlert(alertId: string, token?: string): Promise<boolean> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/me/alerts/${alertId}`, {
        method: 'DELETE',
        headers: getUserAuthHeaders(token),
      });
      if (res.ok) return true;
    } catch {}
  }

  localAlerts = localAlerts.filter((a) => a.id !== alertId);
  return true;
}

export async function subscribeUserPush(payload: PushSubscriptionPayload, token?: string): Promise<boolean> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/me/push/subscribe`, {
        method: 'POST',
        headers: getUserAuthHeaders(token),
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch {}
  }

  console.log('[Web Push Demo] Inscrição registrada com sucesso:', payload.endpoint);
  return true;
}

export async function getPersonalizedFeed(page = 1, limit = 12, token?: string): Promise<OffersResponse> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/feed?page=${page}&limit=${limit}`, {
        headers: getUserAuthHeaders(token),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  // Recomendações locais baseadas nas preferências
  let items = [...localOffers].filter((o) => o.status === 'published' || o.status === 'approved');

  const favCats = localUserPreferences.categories || [];
  const favStores = localUserPreferences.stores || [];
  const minDisc = localUserPreferences.min_discount || 0;

  // Ordena pontuando categorias e lojas favoritas
  items.sort((a, b) => {
    let scoreA = (favCats.includes(a.category) ? 2 : 0) + (favStores.includes(a.store) ? 2 : 0) + (a.discount_pct >= minDisc ? 1 : 0);
    let scoreB = (favCats.includes(b.category) ? 2 : 0) + (favStores.includes(b.store) ? 2 : 0) + (b.discount_pct >= minDisc ? 1 : 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return b.discount_pct - a.discount_pct;
  });

  const total = items.length;
  const startIndex = (page - 1) * limit;
  const paginated = items.slice(startIndex, startIndex + limit);

  return {
    items: paginated,
    total,
    page,
    limit,
    has_more: startIndex + limit < total,
  };
}

