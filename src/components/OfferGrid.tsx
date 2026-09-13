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
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
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
  isError = false,
  error = null,
  onRetry,
  isFetchingNextPage = false,
  hasNextPage = false,
  onFetchNextPage,
  onResetFilters,
  emptyTitle,
  emptyDescription,
}: OfferGridProps) {
  // Estado de Erro da API
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-rose-200/80 bg-rose-50/50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20 sm:p-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">
          Não foi possível carregar as ofertas
        </h3>
        <p className="mt-1.5 max-w-md text-xs font-medium text-slate-500 dark:text-slate-400">
          {error?.message || 'Ocorreu uma instabilidade na comunicação com o servidor. Verifique sua conexão e tente novamente.'}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-500/25 transition-all hover:bg-violet-700 active:scale-95"
          >
            Tentar Novamente
          </button>
        )}
      </div>
    );
  }

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
      {/* Grid Responsiva com Virtualização Leve de Conteúdo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {offers.map((offer, idx) => (
          <div key={offer.id} className={idx > 8 ? 'content-visibility-auto' : undefined}>
            <OfferCard offer={offer} />
          </div>
        ))}
      </div>

      {/* Botão de Carregar Mais / Infinite Scroll Loader */}
      {hasNextPage && (
        <div className="flex justify-center pt-4 px-2 sm:px-0">
          <button
            type="button"
            onClick={onFetchNextPage}
            disabled={isFetchingNextPage}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50/50 hover:text-violet-600 active:scale-95 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-500/40 dark:hover:bg-slate-800 dark:hover:text-violet-400"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                <span>Carregando mais ofertas...</span>
              </>
            ) : (
              <>
                <ArrowDown className="h-4 w-4 text-violet-500" />
                <span>Carregar mais ofertas</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
