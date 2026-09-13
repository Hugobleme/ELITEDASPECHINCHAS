export type OfferStatus = 'pending' | 'approved' | 'rejected' | 'published' | 'draft' | 'archived';

export interface Offer {
  id: string;
  title: string;
  price_current: number;
  price_original: number;
  discount_pct: number;
  store: string;
  category: string;
  image_url: string;
  original_link?: string; // Auditoria interna (visível no admin)
  affiliate_link: string; // Link com a tag de afiliado (gerado automaticamente no backend)
  telegram_msg_id?: number; // Identificador da mensagem no grupo para deduplicação
  source_name?: string; // Nome do grupo de origem no Telegram
  status: OfferStatus;
  published_at: string | null;
  created_at: string;
  coupon_code?: string; // Cupom de desconto exclusivo (ex: VALE20)
  installments?: string; // Informações de parcelamento (ex: 10x de R$ 219,90 sem juros)
  free_shipping?: boolean; // Se conta com frete grátis
  temperature?: number; // Pontuação de temperatura da comunidade (ex: +280°)
}

export interface OffersFilterParams {
  store?: string;
  category?: string;
  min_discount?: number;
  sort?: 'recent' | 'discount' | 'price';
  page?: number;
  limit?: number;
  search?: string;
}

export interface OffersResponse {
  items: Offer[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface StoreItem {
  name: string;
  slug: string;
  count?: number;
  logo_url?: string;
}

export interface CategoryItem {
  name: string;
  slug: string;
  icon?: string;
  count?: number;
}
