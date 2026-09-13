'use client';

import { useCallback } from 'react';
import { trackClick } from '@/lib/api';

export function useTrackClick() {
  const handleAffiliateClick = useCallback(async (offerId: string, affiliateLink: string) => {
    // Tenta registrar o clique sem travar a navegação do usuário
    try {
      if (typeof window !== 'undefined' && 'sendBeacon' in navigator && process.env.NEXT_PUBLIC_API_URL) {
        const payload = JSON.stringify({ offer_id: offerId });
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(`${process.env.NEXT_PUBLIC_API_URL}/events/click`, blob);
      } else {
        // Disparo assíncrono via fetch
        trackClick(offerId);
      }
    } catch {
      // Ignora erro para não prejudicar o usuário
    }

    // Abre o link de afiliado em nova aba com segurança
    if (typeof window !== 'undefined' && affiliateLink) {
      window.open(affiliateLink, '_blank', 'noopener,noreferrer,sponsored');
    }
  }, []);

  return { handleAffiliateClick };
}
