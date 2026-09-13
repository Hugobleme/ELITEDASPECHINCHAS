import { Offer, OfferStatus } from './offer';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'curator';
}

export interface AdminAuthResponse {
  token: string;
  user: AdminUser;
}

export interface TelegramSource {
  id: string;
  name: string;
  channel_username: string;
  is_active: boolean;
  total_captured: number;
  last_activity_at: string;
  description?: string;
}

export interface AdminMetrics {
  total_pending: number;
  published_today: number;
  clicks_week: number;
  approval_rate_pct: number;
  total_approved: number;
  total_rejected: number;
  clicks_by_day: { date: string; clicks: number; label: string }[];
  offers_by_store: { store: string; count: number }[];
  offers_by_category: { category: string; count: number }[];
  status_distribution: { status: string; label: string; count: number; color: string }[];
  top_clicked_offers: (Offer & { click_count: number })[];
}

export interface AdminOfferUpdatePayload {
  status?: OfferStatus;
  title?: string;
  price_current?: number;
  price_original?: number;
  category?: string;
  store?: string;
  affiliate_link?: string;
}

export interface AdminOffersFilterParams {
  status?: OfferStatus | 'all';
  store?: string;
  source?: string;
  min_discount?: number;
  page?: number;
  limit?: number;
  search?: string;
}
