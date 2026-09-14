import {
  Offer,
  OffersFilterParams,
  OffersResponse,
  CategoryItem,
  StoreItem,
} from '@/types/offer';
import { CouponItem } from '@/types/coupon';
import { API_BASE_URL, fetchWithTimeout } from './client';
import { mockStore } from './mock-store';
import { MOCK_CATEGORIES, MOCK_STORES } from '@/lib/mock-data';
import { MOCK_COUPONS } from '@/lib/mock-coupons';

/**
 * Busca lista de ofertas com filtros, paginação e ordenação (Vitrine Pública).
 */
export async function getOffers(
  params: OffersFilterParams = {}
): Promise<OffersResponse> {
  const {
    store,
    category,
    min_discount = 0,
    sort = 'recent',
    page = 1,
    limit = 12,
    search = '',
  } = params;

  const isMockExplicit = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

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
          const filtered = data.filter((o: Offer) => o.status === 'published');
          return {
            items: filtered,
            total: filtered.length,
            page,
            limit,
            has_more: filtered.length > page * limit,
          };
        }
        return {
          items: (data.items || []).filter((o: Offer) => o.status === 'published'),
          total: data.total ?? data.items?.length ?? 0,
          page: data.page ?? page,
          limit: data.limit ?? limit,
          has_more: data.has_more ?? false,
        };
      }

      // Erro HTTP retornado pela API
      const errData = await res.json().catch(() => ({}));
      const errorMsg = errData.detail || `Erro na API de ofertas (Status ${res.status})`;
      if (!isMockExplicit) {
        throw new Error(errorMsg);
      }
    } catch (networkErr) {
      if (!isMockExplicit) {
        throw networkErr instanceof Error ? networkErr : new Error(String(networkErr));
      }
      console.warn('[API] FastAPI indisponível. Usando mock configurado em NEXT_PUBLIC_USE_MOCK.');
    }
  } else if (!isMockExplicit) {
    throw new Error('NEXT_PUBLIC_API_URL não configurado.');
  }

  // Fallback vitrine pública (apenas ativado quando NEXT_PUBLIC_USE_MOCK=true)
  let results = mockStore.offers.filter((o) => o.status === 'published');

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
 * Busca oferta específica pelo ID.
 */
export async function getOfferById(id: string): Promise<Offer | null> {
  const isMockExplicit = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  if (API_BASE_URL && !isMockExplicit) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/offers/${id}`);
      if (res.ok) {
        const offer = await res.json();
        if (offer.status === 'published') {
          return offer;
        }
        return null;
      }
      if (res.status === 404) {
        const mockMatch = mockStore.offers.find((o) => o.id === id);
        if (mockMatch && mockMatch.status === 'published') {
          return mockMatch;
        }
        return null;
      }
    } catch {
      // Fallback para mockStore
    }
  }

  const found = mockStore.offers.find((o) => o.id === id);
  if (found && found.status === 'published') {
    return found;
  }
  return null;
}

/**
 * Busca cupons de desconto ativos com filtros opcionais.
 */
export async function getCoupons(params: {
  store?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ items: CouponItem[]; total: number; page: number; limit: number; has_more: boolean }> {
  const { store, category, search, page = 1, limit = 20 } = params;

  if (API_BASE_URL) {
    try {
      const query = new URLSearchParams();
      if (store) query.set('store', store);
      if (category && category !== 'todas') query.set('category', category);
      if (search) query.set('search', search);
      query.set('page', String(page));
      query.set('limit', String(limit));

      const res = await fetchWithTimeout(`${API_BASE_URL}/coupons?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return {
          items: data.items || [],
          total: data.total || 0,
          page: data.page || page,
          limit: data.limit || limit,
          has_more: data.has_more ?? false,
        };
      }
    } catch {}
  }

  // Fallback para mock-coupons
  let results = [...MOCK_COUPONS];
  if (store && store !== 'todas') {
    const stLower = store.toLowerCase();
    results = results.filter((c) => c.store.toLowerCase().includes(stLower) || c.store_slug.toLowerCase().includes(stLower));
  }
  if (category && category !== 'todas') {
    const catLower = category.toLowerCase();
    results = results.filter((c) => c.category === catLower || c.category === 'todas');
  }
  if (search && search.trim()) {
    const sLower = search.trim().toLowerCase();
    results = results.filter(
      (c) =>
        c.code.toLowerCase().includes(sLower) ||
        c.store.toLowerCase().includes(sLower) ||
        (c.description && c.description.toLowerCase().includes(sLower))
    );
  }

  const total = results.length;
  const start = (page - 1) * limit;
  const items = results.slice(start, start + limit);
  return { items, total, page, limit, has_more: start + limit < total };
}

/**
 * Busca cupom por ID ou código.
 */
export async function getCouponById(id: string): Promise<CouponItem | null> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/coupons/${id}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
  }
  const found = MOCK_COUPONS.find((c) => c.id === id || c.code.toLowerCase() === id.toLowerCase());
  return found || null;
}

/**
 * Busca de ofertas por query e filtros opcionais.
 */
export async function searchOffers(
  queryText: string,
  params: OffersFilterParams = {}
): Promise<OffersResponse> {
  return getOffers({ ...params, search: queryText });
}

/**
 * Retorna categorias disponíveis com contagem de ofertas.
 */
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

/**
 * Retorna lojas parceiras disponíveis com contagem de ofertas.
 */
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

/**
 * Registra evento de clique no link de afiliado.
 */
export async function trackOfferClick(
  offerId: string
): Promise<{ tracked: boolean }> {
  if (API_BASE_URL) {
    try {
      await fetchWithTimeout(`${API_BASE_URL}/events/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer_id: offerId, timestamp: new Date().toISOString() }),
      });
      return { tracked: true };
    } catch {}
  }

  // Atualiza métricas mock localmente
  const found = mockStore.metrics.top_clicked_offers.find((o) => o.id === offerId);
  if (found) {
    found.click_count += 1;
  }
  mockStore.metrics.clicks_week += 1;

  return { tracked: true };
}

export const trackClick = trackOfferClick;

// Aliases padronizados conforme especificação
export const fetchOffers = getOffers;
export const fetchOffer = getOfferById;
export const fetchCoupons = getCoupons;
export const fetchCoupon = getCouponById;
export const fetchStores = getStores;
export const fetchCategories = getCategories;
