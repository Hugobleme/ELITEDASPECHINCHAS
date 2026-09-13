import { Offer } from '@/types/offer';
import {
  AdminMetrics,
  TelegramSource,
  AdminOfferUpdatePayload,
  AdminOffersFilterParams,
} from '@/types/admin';
import { OffersResponse } from '@/types/offer';
import { API_BASE_URL, fetchWithTimeout, getAuthHeaders } from './client';
import { mockStore } from './mock-store';
import { MOCK_METRICS } from '@/lib/mock-data';

/**
 * Busca fila de ofertas para curadoria com filtros e paginação.
 */
export async function getAdminOffers(
  params: AdminOffersFilterParams = {},
  token?: string
): Promise<OffersResponse> {
  const {
    status = 'pending',
    store,
    source,
    min_discount = 0,
    page = 1,
    limit = 20,
    search = '',
  } = params;

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
  let filtered = [...mockStore.offers];

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
 * Busca oferta específica pelo ID para a curadoria.
 */
export async function getAdminOfferById(
  id: string,
  token?: string
): Promise<Offer | null> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/admin/offers/${id}`, {
        headers: getAuthHeaders(token),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  const found = mockStore.offers.find((o) => o.id === id);
  return found || null;
}

/**
 * Atualiza campos ou status de uma oferta na curadoria.
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

  const index = mockStore.offers.findIndex((o) => o.id === id);
  if (index >= 0) {
    const original = mockStore.offers[index];
    const updated: Offer = {
      ...original,
      ...payload,
      discount_pct:
        payload.price_original && payload.price_current
          ? Math.round(
              ((payload.price_original - payload.price_current) / payload.price_original) * 100
            )
          : original.discount_pct,
    };
    mockStore.offers[index] = updated;
    return updated;
  }

  throw new Error(`Oferta ${id} não encontrada.`);
}

/**
 * Publica uma oferta e dispara alertas e push notification.
 */
export async function publishAdminOffer(
  id: string,
  token?: string
): Promise<Offer> {
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

  const index = mockStore.offers.findIndex((o) => o.id === id);
  if (index >= 0) {
    const updated: Offer = {
      ...mockStore.offers[index],
      status: 'published',
      published_at: new Date().toISOString(),
    };
    mockStore.offers[index] = updated;
    return updated;
  }

  throw new Error(`Oferta ${id} não encontrada.`);
}

/**
 * Executa ação em lote (aprovar, rejeitar ou publicar).
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
  mockStore.offers = mockStore.offers.map((offer) => {
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
 * Consulta métricas e KPIs analíticos do painel administrativo.
 */
export async function getAdminMetrics(
  range = '7d',
  token?: string
): Promise<AdminMetrics> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/admin/metrics?range=${range}`, {
        headers: getAuthHeaders(token),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  const pendingCount = mockStore.offers.filter((o) => o.status === 'pending').length;
  const publishedCount = mockStore.offers.filter((o) => o.status === 'published').length;
  const rejectedCount = mockStore.offers.filter((o) => o.status === 'rejected').length;

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
 * Consulta lista de grupos/canais de origem do Telegram monitorados.
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

  return mockStore.sources;
}

/**
 * Ativa ou pausa o monitoramento de um canal-fonte do Telegram.
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

  const index = mockStore.sources.findIndex((s) => s.id === id);
  if (index >= 0) {
    mockStore.sources[index] = {
      ...mockStore.sources[index],
      is_active: isActive,
      last_activity_at: new Date().toISOString(),
    };
    return mockStore.sources[index];
  }

  throw new Error(`Fonte ${id} não encontrada.`);
}
