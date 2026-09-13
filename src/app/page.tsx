'use client';

import React, { useState } from 'react';
import { useOffersInfinite } from '@/hooks/useOffers';
import { usePersonalizedFeed } from '@/hooks/useFeed';
import { useUserAuth } from '@/contexts/UserAuthContext';
import dynamic from 'next/dynamic';
import OfferGrid from '@/components/OfferGrid';
import FilterSidebar from '@/components/FilterSidebar';
import SortDropdown from '@/components/SortDropdown';
import { SlidersHorizontal, Flame, Sparkles, Sliders, Check } from 'lucide-react';

const UserPreferencesModal = dynamic(
  () => import('@/components/user/UserPreferencesModal').then((m) => m.UserPreferencesModal),
  { ssr: false }
);

export default function HomePage() {
  const { isAuthenticated, openAuthModal } = useUserAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'for_you'>('all');
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [minDiscount, setMinDiscount] = useState(0);
  const [sort, setSort] = useState<'recent' | 'discount' | 'price'>('recent');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const isForYou = activeTab === 'for_you';

  // Ofertas Gerais
  const {
    data: allData,
    isLoading: isAllLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useOffersInfinite({
    store: selectedStore,
    category: selectedCategory,
    min_discount: minDiscount,
    sort,
  });

  // Ofertas Personalizadas do Feed (executada sob demanda apenas quando na aba 'Para Você')
  const {
    data: feedData,
    isLoading: isFeedLoading,
  } = usePersonalizedFeed(1, 24, isForYou);

  const generalOffers = allData?.pages.flatMap((page) => page.items) || [];
  const feedOffers = feedData?.items || [];
  const displayedOffers = isForYou ? feedOffers : generalOffers;
  const isLoading = isForYou ? isFeedLoading : isAllLoading;
  const totalCount = isForYou
    ? (feedData?.total ?? feedOffers.length)
    : (allData?.pages[0]?.total ?? generalOffers.length);

  const handleResetFilters = () => {
    setSelectedStore('');
    setSelectedCategory('todas');
    setMinDiscount(0);
    setSort('recent');
  };

  const hasActiveFilters =
    Boolean(selectedStore) || (selectedCategory && selectedCategory !== 'todas') || minDiscount > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Hero Banner Inspirado em Plataformas Modernas */}
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-5 sm:p-8 md:p-10 text-white shadow-xl shadow-orange-500/15">
        {/* Glow de fundo sutil */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-black/10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-start justify-between gap-5 sm:gap-6 md:flex-row md:items-center">
          <div className="max-w-xl space-y-2 sm:space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[11px] sm:text-xs font-black uppercase tracking-wider backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300" />
              </span>
              <Flame className="h-3.5 w-3.5 fill-amber-200 text-amber-200" />
              <span>Curadoria em Tempo Real</span>
            </div>
            <h1 className="text-xl xs:text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
              Descontos Reais e Cupons Verificados
            </h1>
            <p className="text-xs font-medium text-orange-100 sm:text-sm leading-relaxed max-w-lg">
              Monitoramos os maiores e-commerces 24 horas por dia para você nunca mais pagar o preço cheio nas suas compras.
            </p>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl bg-black/25 p-3.5 sm:p-4 backdrop-blur-md border border-white/10 shadow-inner w-full sm:w-auto">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="text-left">
              <div className="text-[11px] sm:text-xs font-semibold text-orange-100">Ofertas Ativas Hoje</div>
              <div className="text-lg sm:text-xl font-black tracking-tight text-white">
                {totalCount > 0 ? `${totalCount}+ Ofertas` : 'Monitorando'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Seleção de Feed: Todas vs Para Você */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800/80 pb-3.5">
        <div className="flex w-full sm:w-auto p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              !isForYou
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Todas as Ofertas</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('for_you');
            }}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              isForYou
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Para Você</span>
          </button>
        </div>

        {isForYou && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsPrefModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/40 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Personalizar Interesses</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Layout: Sidebar + Grid */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar Desktop */}
        <FilterSidebar
          selectedStore={selectedStore}
          selectedCategory={selectedCategory}
          minDiscount={minDiscount}
          onStoreChange={setSelectedStore}
          onCategoryChange={setSelectedCategory}
          onMinDiscountChange={setMinDiscount}
          onReset={handleResetFilters}
          isOpenMobile={isMobileFilterOpen}
          onCloseMobile={() => setIsMobileFilterOpen(false)}
        />

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {/* Controls Bar: Total counter + Mobile Filter Button + Sort */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-card dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-center gap-2.5">
              {/* Botão de Filtros no Mobile */}
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 lg:hidden dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <SlidersHorizontal className="h-4 w-4 text-orange-500" />
                <span>Filtros</span>
                {hasActiveFilters && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-white">
                    •
                  </span>
                )}
              </button>

              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isLoading ? (
                  'Buscando promoções...'
                ) : (
                  <>
                    <strong className="text-slate-900 dark:text-slate-100 font-bold">{displayedOffers.length}</strong>{' '}
                    {isForYou ? 'ofertas recomendadas' : 'ofertas encontradas'}
                  </>
                )}
              </span>
            </div>

            {/* Dropdown de Ordenação */}
            <SortDropdown value={sort} onChange={setSort} />
          </div>

          {/* Grid de Ofertas */}
          <OfferGrid
            offers={displayedOffers}
            isLoading={isLoading}
            isFetchingNextPage={!isForYou && isFetchingNextPage}
            hasNextPage={!isForYou && hasNextPage}
            onFetchNextPage={() => {
              if (!isForYou) fetchNextPage();
            }}
            onResetFilters={handleResetFilters}
            emptyTitle={
              isForYou
                ? 'Nenhuma oferta combina com suas preferências'
                : 'Nenhuma oferta encontrada para estes filtros'
            }
            emptyDescription={
              isForYou
                ? "Clique em 'Personalizar Interesses' para selecionar mais categorias ou diminuir o desconto mínimo."
                : 'Experimente diminuir o percentual de desconto mínimo ou escolher outra categoria.'
            }
          />
        </div>
      </div>

      {/* Modal de Preferências do Usuário */}
      <UserPreferencesModal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
      />
    </div>
  );
}
