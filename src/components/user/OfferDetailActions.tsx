'use client';

import React from 'react';
import { Offer } from '@/types/offer';
import { FavoriteButton } from './FavoriteButton';
import { usePriceAlertModal } from '@/contexts/PriceAlertModalContext';
import ShareButton from '@/components/ShareButton';
import { Bell, ExternalLink } from 'lucide-react';

interface OfferDetailActionsProps {
  offer: Offer;
}

export function OfferDetailActions({ offer }: OfferDetailActionsProps) {
  const { openAlertModal } = usePriceAlertModal();

  const handleOpenAlert = () => {
    openAlertModal({
      keyword: offer.title.split(' ').slice(0, 4).join(' '),
      category: offer.category,
      store: offer.store,
      target_discount: offer.discount_pct > 0 ? offer.discount_pct : 20,
    });
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="grid grid-cols-2 gap-2.5">
        {/* Botão Favoritar */}
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors">
          <FavoriteButton offerId={offer.id} size="sm" showLabel />
        </div>

        {/* Botão Alerta de Preço */}
        <button
          type="button"
          onClick={handleOpenAlert}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-500/20 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25 transition-colors cursor-pointer"
        >
          <Bell className="h-4 w-4" />
          <span>Criar Alerta</span>
        </button>
      </div>

      {/* Compartilhar e Link Original */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <ShareButton title={offer.title} />

        <a
          href={offer.affiliate_link}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-amber-500 transition-colors"
        >
          <span>Abrir link original</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
