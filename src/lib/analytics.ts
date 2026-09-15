/**
 * Utilitário de Analytics para Google Analytics 4 (GA4).
 * Suporta rastreamento dinâmico e seguro de pageviews e eventos de conversão e engajamento.
 */

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || '';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

/**
 * Envia evento genérico para o GA4 se configurado e disponível no navegador.
 */
export function trackEvent(action: string, params: Record<string, any> = {}) {
  if (typeof window === 'undefined' || !window.gtag) return;
  try {
    window.gtag('event', action, params);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Analytics] Falha ao despachar evento:', err);
    }
  }
}

/**
 * Rastreia visualização de página de oferta específica.
 */
export function trackViewOffer(offer: {
  id: string;
  title: string;
  store: string;
  price: number;
  category?: string;
}) {
  trackEvent('view_offer', {
    offer_id: offer.id,
    offer_title: offer.title,
    store_name: offer.store,
    value: offer.price,
    currency: 'BRL',
    category: offer.category || 'geral',
  });
}

/**
 * Rastreia clique no botão de afiliado ("Comprar Agora").
 */
export function trackClickAffiliate(offer: {
  id: string;
  title?: string;
  store: string;
  affiliate_link: string;
  price?: number;
}) {
  trackEvent('click_affiliate_link', {
    offer_id: offer.id,
    offer_title: offer.title,
    store_name: offer.store,
    destination_url: offer.affiliate_link,
    value: offer.price || 0,
    currency: 'BRL',
  });
}

/**
 * Rastreia pesquisa no catálogo.
 */
export function trackSearchOffers(query: string, resultsCount?: number) {
  trackEvent('search_offers', {
    search_term: query,
    results_count: resultsCount ?? 0,
  });
}

/**
 * Rastreia aplicação de filtros de listagem.
 */
export function trackFilterOffers(filters: {
  category?: string;
  store?: string;
  min_discount?: number;
  sort?: string;
}) {
  trackEvent('filter_offers', {
    filter_category: filters.category || 'todas',
    filter_store: filters.store || 'todas',
    filter_min_discount: filters.min_discount || 0,
    filter_sort: filters.sort || 'recent',
  });
}

/**
 * Rastreia quando o usuário copia um código de cupom.
 */
export function trackCopyCoupon(coupon: {
  code: string;
  store: string;
  discount_text?: string;
}) {
  trackEvent('copy_coupon', {
    coupon_code: coupon.code,
    store_name: coupon.store,
    discount: coupon.discount_text || '',
  });
}
