import { API_BASE_URL } from '@/lib/config';
import { fetchWithTimeout, getUserAuthHeaders } from './client';
import { mockStore } from './mock-store';
import {
  EndUser,
  UserPreference,
  FavoriteItem,
  PriceAlertItem,
  PushSubscriptionPayload,
} from '@/types/user';
import { OffersResponse } from '@/types/offer';

/**
 * Registra novo usuário no sistema.
 */
export async function apiUserRegister(
  email: string,
  password: string,
  name: string
): Promise<{ access_token: string; refresh_token: string }> {
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
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message && !err.message.includes('Failed to fetch')) throw err;
      console.warn('[API Auth] FastAPI offline. Simulando registro local.');
    }
  }

  mockStore.currentUser = {
    id: `usr_${Date.now()}`,
    email,
    name,
    provider: 'email',
    created_at: new Date().toISOString(),
  };

  return { access_token: `mock_jwt_${Date.now()}`, refresh_token: `mock_refresh_${Date.now()}` };
}

/**
 * Autentica usuário existente via e-mail e senha.
 */
export async function apiUserLogin(
  email: string,
  password: string
): Promise<{ access_token: string; refresh_token: string }> {
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
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message && !err.message.includes('Failed to fetch')) throw err;
      console.warn('[API Auth] FastAPI offline. Simulando login local.');
    }
  }

  mockStore.currentUser = {
    id: 'usr-demo-01',
    email,
    name: email.split('@')[0],
    provider: 'email',
    created_at: new Date().toISOString(),
  };

  return { access_token: `mock_jwt_${Date.now()}`, refresh_token: `mock_refresh_${Date.now()}` };
}

/**
 * Autenticação Social via Google OAuth.
 */
export async function apiUserGoogle(
  idToken: string
): Promise<{ access_token: string; refresh_token: string }> {
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

  mockStore.currentUser = {
    id: 'usr-google-demo',
    email: 'google.user@gmail.com',
    name: 'Google User',
    provider: 'google',
    created_at: new Date().toISOString(),
  };

  return { access_token: `mock_google_jwt_${Date.now()}`, refresh_token: `mock_refresh_${Date.now()}` };
}

/**
 * Obtém perfil do usuário logado.
 */
export async function apiGetMe(token?: string): Promise<EndUser> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/me`, {
        headers: getUserAuthHeaders(token),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  return mockStore.currentUser;
}

/**
 * Obtém preferências do usuário (categorias, lojas, desconto mínimo).
 */
export async function getUserPreferences(token?: string): Promise<UserPreference> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/me/preferences`, {
        headers: getUserAuthHeaders(token),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  return mockStore.preferences;
}

/**
 * Atualiza preferências do usuário.
 */
export async function updateUserPreferences(
  payload: Partial<UserPreference>,
  token?: string
): Promise<UserPreference> {
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

  mockStore.preferences = {
    ...mockStore.preferences,
    ...payload,
  };
  return mockStore.preferences;
}

/**
 * Obtém ofertas favoritadas pelo usuário.
 */
export async function getUserFavorites(token?: string): Promise<FavoriteItem[]> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/me/favorites`, {
        headers: getUserAuthHeaders(token),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  return mockStore.favorites.map((offerId) => {
    const offer = mockStore.offers.find((o) => o.id === offerId);
    return {
      id: `fav_${offerId}`,
      user_id: mockStore.currentUser.id,
      offer_id: offerId,
      created_at: new Date().toISOString(),
      offer,
    };
  });
}

/**
 * Adiciona uma oferta aos favoritos.
 */
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

  if (!mockStore.favorites.includes(offerId)) {
    mockStore.favorites.push(offerId);
  }

  const offer = mockStore.offers.find((o) => o.id === offerId);
  return {
    id: `fav_${offerId}`,
    user_id: mockStore.currentUser.id,
    offer_id: offerId,
    created_at: new Date().toISOString(),
    offer,
  };
}

/**
 * Remove uma oferta dos favoritos.
 */
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

  mockStore.favorites = mockStore.favorites.filter((id) => id !== offerId);
  return true;
}

/**
 * Lista alertas de preço configurados pelo usuário.
 */
export async function getUserAlerts(token?: string): Promise<PriceAlertItem[]> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/me/alerts`, {
        headers: getUserAuthHeaders(token),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  return mockStore.alerts;
}

/**
 * Cria um novo alerta de preço.
 */
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
    user_id: mockStore.currentUser.id,
    category: payload.category || null,
    store: payload.store || null,
    keyword: payload.keyword || null,
    target_discount: payload.target_discount,
    active: true,
    created_at: new Date().toISOString(),
  };

  mockStore.alerts.unshift(newAlert);
  return newAlert;
}

/**
 * Remove um alerta de preço.
 */
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

  mockStore.alerts = mockStore.alerts.filter((a) => a.id !== alertId);
  return true;
}

/**
 * Registra subscription do Web Push para o usuário.
 */
export async function subscribeUserPush(
  payload: PushSubscriptionPayload,
  token?: string
): Promise<boolean> {
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

/**
 * Retorna feed personalizado com base nas preferências e histórico do usuário.
 */
export async function getPersonalizedFeed(
  page = 1,
  limit = 12,
  token?: string
): Promise<OffersResponse> {
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/feed?page=${page}&limit=${limit}`, {
        headers: getUserAuthHeaders(token),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  const items = [...mockStore.offers].filter(
    (o) => o.status === 'published' || o.status === 'approved'
  );

  const favCats = mockStore.preferences.categories || [];
  const favStores = mockStore.preferences.stores || [];
  const minDisc = mockStore.preferences.min_discount || 0;

  // Ordena pontuando categorias e lojas favoritas
  items.sort((a, b) => {
    const scoreA =
      (favCats.includes(a.category) ? 2 : 0) +
      (favStores.includes(a.store) ? 2 : 0) +
      (a.discount_pct >= minDisc ? 1 : 0);
    const scoreB =
      (favCats.includes(b.category) ? 2 : 0) +
      (favStores.includes(b.store) ? 2 : 0) +
      (b.discount_pct >= minDisc ? 1 : 0);
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
