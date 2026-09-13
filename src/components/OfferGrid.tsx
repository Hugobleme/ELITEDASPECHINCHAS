'use client';

import React from 'react';
import { Offer } from '@/types/offer';
import OfferCard from './OfferCard';
import OfferCardSkeleton from './OfferCardSkeleton';
import EmptyState from './EmptyState';
import { Loader2, ArrowDown } from 'lucide-react';

interface OfferGridProps {
  offers: Offer[];
  isLoading: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  onFetchNextPage?: () => void;
  onResetFilters?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function OfferGrid({
  offers,
  isLoading,
  isFetchingNextPage = false,
  hasNextPage = false,
  onFetchNextPage,
  onResetFilters,
  emptyTitle,
  emptyDescription,
}: OfferGridProps) {
  // Estado de Carregamento Inicial
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <OfferCardSkeleton key={idx} />
        ))}
      </div>
    );
  }

  // Estado Vazio (Sem resultados)
  if (!offers || offers.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        onReset={onResetFilters}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Grid Responsiva */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>

      {/* Botão de Carregar Mais / Infinite Scroll Loader */}
      {hasNextPage && (
        <div className="flex justify-center pt-4 px-2 sm:px-0">
          <button
            type="button"
            onClick={onFetchNextPage}
            disabled={isFetchingNextPage}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-600 active:scale-95 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-orange-500/40 dark:hover:bg-slate-800"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                <span>Carregando mais ofertas...</span>
              </>
            ) : (
              <>
                <ArrowDown className="h-4 w-4 text-orange-500" />
                <span>Carregar mais ofertas</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
