'use client';

import React, { useState } from 'react';
import { useOffersInfinite } from '@/hooks/useOffers';
import { usePersonalizedFeed } from '@/hooks/useFeed';
import { useUserAuth } from '@/contexts/UserAuthContext';
import OfferGrid from '@/components/OfferGrid';
import FilterSidebar from '@/components/FilterSidebar';
import SortDropdown from '@/components/SortDropdown';
import { UserPreferencesModal } from '@/components/user/UserPreferencesModal';
import { SlidersHorizontal, Flame, Sparkles, Compass, Sliders, Check } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, openAuthModal } = useUserAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'for_you'>('all');
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [minDiscount, setMinDiscount] = useState(0);
  const [sort, setSort] = useState<'recent' | 'discount' | 'price'>('recent');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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

  // Ofertas Personalizadas do Feed
  const {
    data: feedData,
    isLoading: isFeedLoading,
  } = usePersonalizedFeed(1, 24);

  const isForYou = activeTab === 'for_you';
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
      {/* Hero Banner Inspirado em Sites de Promoção */}
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 p-6 text-white shadow-xl shadow-orange-500/10 sm:p-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Flame className="h-3.5 w-3.5 fill-amber-200 text-amber-200" />
              <span>Curadoria em Tempo Real</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
              Descontos Reais e Cupons Verificados
            </h1>
            <p className="text-xs font-medium text-orange-100 sm:text-sm">
              Nossa automação vasculha grupos e lojas oficiais 24 horas por dia para você nunca mais pagar o preço cheio.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-black/20 p-3.5 backdrop-blur-md">
            <Sparkles className="h-6 w-6 text-amber-300" />
            <div className="text-left">
              <div className="text-xs font-medium text-orange-100">Ofertas Ativas Hoje</div>
              <div className="text-lg font-black">{totalCount > 0 ? `${totalCount}+ Ofertas` : 'Monitorando'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Seleção de Feed: Todas vs Para Você */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              !isForYou
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Todas as Ofertas</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('for_you');
              if (!isAuthenticated) {
                // Usuário vê as recomendações com opções de login/personalização
              }
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              isForYou
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Para Você</span>
          </button>
        </div>

        {isForYou && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPrefModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/30 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-center gap-2">
              {/* Botão de Filtros no Mobile */}
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 lg:hidden dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                <SlidersHorizontal className="h-4 w-4 text-orange-500" />
                <span>Filtros</span>
                {hasActiveFilters && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                    •
                  </span>
                )}
              </button>

              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isLoading ? (
                  'Buscando promoções...'
                ) : (
                  <>
                    <strong className="text-slate-900 dark:text-slate-100">{displayedOffers.length}</strong>{' '}
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
            emptyTitle={isForYou ? "Nenhuma oferta combina com suas preferências" : "Nenhuma oferta encontrada para estes filtros"}
            emptyDescription={isForYou ? "Clique em 'Personalizar Interesses' para selecionar mais categorias ou ajustar o desconto mínimo." : "Experimente diminuir o percentual de desconto mínimo ou escolher outra categoria."}
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
