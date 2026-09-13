import { Offer } from '@/types/offer';
import { TelegramSource, AdminMetrics } from '@/types/admin';
import { EndUser, UserPreference, PriceAlertItem } from '@/types/user';
import {
  MOCK_OFFERS,
  MOCK_PENDING_OFFERS,
  MOCK_TELEGRAM_SOURCES,
  MOCK_METRICS,
} from '@/lib/mock-data';

/**
 * Armazenamento mutável em memória para fallback quando o backend FastAPI estiver offline.
 * Permite simulação completa de vitrine, curadoria, favoritos, alertas e preferências.
 */
export const mockStore = {
  offers: [...MOCK_OFFERS, ...MOCK_PENDING_OFFERS] as Offer[],
  sources: [...MOCK_TELEGRAM_SOURCES] as TelegramSource[],
  metrics: { ...MOCK_METRICS } as AdminMetrics,
  favorites: [
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'b23c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
  ] as string[],
  alerts: [
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
  ] as PriceAlertItem[],
  preferences: {
    categories: ['eletronicos', 'games', 'tv-e-audio'],
    stores: ['Amazon', 'Kabum', 'Mercado Livre'],
    min_discount: 20,
  } as UserPreference,
  currentUser: {
    id: 'usr-demo-01',
    email: 'usuario@elitedaspechinchas.com.br',
    name: 'Hugo Hunter',
    provider: 'email',
    created_at: new Date().toISOString(),
  } as EndUser,
};
