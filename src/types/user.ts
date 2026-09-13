import { Offer } from './offer';

export interface EndUser {
  id: string;
  email: string;
  name: string;
  provider: 'email' | 'google';
  created_at: string;
}

export interface UserPreference {
  categories: string[];
  stores: string[];
  min_discount: number;
}

export interface FavoriteItem {
  id: string;
  user_id: string;
  offer_id: string;
  created_at: string;
  offer?: Offer;
}

export interface PriceAlertItem {
  id: string;
  user_id: string;
  category?: string | null;
  store?: string | null;
  keyword?: string | null;
  target_discount: number;
  active: boolean;
  created_at: string;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: PushSubscriptionKeys;
}
