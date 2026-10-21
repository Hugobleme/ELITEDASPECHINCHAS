'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useOffersInfinite } from '@/hooks/useOffers';
import { usePersonalizedFeed } from '@/hooks/useFeed';
import dynamic from 'next/dynamic';
import OfferGrid from '@/components/OfferGrid';
import OfferCard from '@/components/OfferCard';
import FilterSidebar from '@/components/FilterSidebar';
import SortDropdown from '@/components/SortDropdown';
import CouponTicketCard from '@/components/CouponTicketCard';
import { MOCK_COUPONS } from '@/lib/mock-coupons';
import {
  SlidersHorizontal,
  Flame,
  Sparkles,
  Sliders,
  Ticket,
  ChevronRight,
  TrendingDown,
  Clock,
  ShieldCheck,
} from 'lucide-react';

const UserPreferencesModal = dynamic(
  () => import('@/components/user/UserPreferencesModal').then((m) => m.UserPreferencesModal),
  { ssr: false }
);

export default function HomePage() {
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
    isError: isAllError,
    error: allError,
    refetch: refetchAll,
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
    isError: isFeedError,
    error: feedError,
    refetch: refetchFeed,
  } = usePersonalizedFeed(1, 24, isForYou);

  const generalOffers = useMemo(
    () => allData?.pages.flatMap((page) => page.items) || [],
    [allData]
  );
  const feedOffers = feedData?.items || [];
  const displayedOffers = isForYou ? feedOffers : generalOffers;
  const isLoading = isForYou ? isFeedLoading : isAllLoading;
  const isError = isForYou ? isFeedError : isAllError;
  const currentError = (isForYou ? feedError : allError) as Error | null;

  // Ofertas em destaque (maior temperatura e desconto sem filtros aplicados)
  const featuredOffers = useMemo(() => {
    return [...generalOffers]
      .sort((a, b) => (b.temperature || 0) + b.discount_pct * 2 - ((a.temperature || 0) + a.discount_pct * 2))
      .slice(0, 4);
  }, [generalOffers]);

  // Cupons do dia em destaque (primeiros 3 ou 4 verificados)
  const dailyCoupons = useMemo(() => {
    return MOCK_COUPONS.slice(0, 4);
  }, []);

  const handleRetry = () => {
    if (isForYou) {
      refetchFeed();
    } else {
      refetchAll();
    }
  };

  const handleResetFilters = () => {
    setSelectedStore('');
    setSelectedCategory('todas');
    setMinDiscount(0);
    setSort('recent');
  };

  const hasActiveFilters =
    Boolean(selectedStore) || (selectedCategory && selectedCategory !== 'todas') || minDiscount > 0;

  const trendingTags = ['iPhone 15', 'Air Fryer', 'PlayStation 5', 'Notebook', 'Kindle', 'Smart TV'];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-8">
      {/* Hero Banner Ultra Premium com Aura Radiante e Métricas de Confiança */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950 via-[#0f0c1e] to-[#07060d] p-6 sm:p-9 md:p-12 text-white border border-violet-500/30 shadow-2xl shadow-violet-950/40">
        {/* Orbes de Luz Ambiente Suave */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-violet-600/25 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-[90px]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-purple-500/10 blur-[80px]" />

        <div className="relative z-10 space-y-6">
          <div className="max-w-3xl space-y-3.5">
            {/* Pill de Status Live */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-violet-300 border border-violet-400/30 shadow-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="tracking-wide">Monitoramento em Tempo Real • 100% Verificado</span>
            </div>

            {/* Headline de Alto Impacto com Gradiente */}
            <h1 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] text-white">
              Descontos Reais e Cupons{' '}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-pink-400 bg-clip-text text-transparent">
                Atualizados 24 Horas
              </span>
            </h1>

            <p className="text-xs sm:text-sm font-medium text-zinc-300 leading-relaxed max-w-2xl">
              Rastreamos as maiores quedas de preço da Amazon, Mercado Livre, Shopee, Magalu e Kabum. Compare histórico, ative cupons de carrinho e nunca mais pague o valor cheio.
            </p>
          </div>

          {/* 3 Métricas de Confiança e Valor (Cards Glassmorphic) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 max-w-3xl">
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] backdrop-blur-md p-3.5 border border-white/[0.08]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
                <Flame className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white tracking-tight">+2.500 Ofertas</div>
                <div className="text-[11px] text-zinc-400 truncate">Testadas e verificadas</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] backdrop-blur-md p-3.5 border border-white/[0.08]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white tracking-tight">Lojas Oficiais</div>
                <div className="text-[11px] text-zinc-400 truncate">Links diretos e seguros</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] backdrop-blur-md p-3.5 border border-white/[0.08]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/20 text-fuchsia-300">
                <Ticket className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white tracking-tight">Cupons Exclusivos</div>
                <div className="text-[11px] text-zinc-400 truncate">Desconto no carrinho</div>
              </div>
            </div>
          </div>

          {/* Tags de Tendências Rápidas */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="font-bold text-zinc-400 flex items-center gap-1.5 shrink-0">
              <TrendingDown className="h-3.5 w-3.5 text-fuchsia-400" />
              Tendências:
            </span>
            {trendingTags.map((tag) => (
              <Link
                key={tag}
                href={`/busca?q=${encodeURIComponent(tag)}`}
                className="rounded-lg bg-white/[0.08] hover:bg-violet-500/25 px-2.5 py-1 text-[11px] font-bold text-zinc-200 hover:text-white border border-white/[0.08] hover:border-violet-400/40 transition-all cursor-pointer"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* SEÇÃO 1: Ofertas em Destaque (Apenas exibido quando não houver filtros ativos e na aba principal) */}
      {!hasActiveFilters && !isForYou && featuredOffers.length > 0 && (
        <section aria-labelledby="featured-offers-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20">
                <Flame className="h-5 w-5 fill-current" />
              </div>
              <div>
                <h2 id="featured-offers-heading" className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Ofertas em Destaque
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Os maiores descontos e produtos mais votados pela comunidade
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredOffers.map((offer) => (
              <OfferCard key={`feat-${offer.id}`} offer={offer} />
            ))}
          </div>
        </section>
      )}

      {/* SEÇÃO 2: Cupons do Dia (Apenas exibido quando não houver filtros ativos e na aba principal) */}
      {!hasActiveFilters && !isForYou && dailyCoupons.length > 0 && (
        <section aria-labelledby="daily-coupons-heading" className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 dark:border-white/[0.08] dark:bg-[#13131b] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-fuchsia-600 to-pink-600 text-white shadow-md shadow-fuchsia-500/20">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <h2 id="daily-coupons-heading" className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Cupons do Dia
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Códigos exclusivos testados hoje com desconto direto no carrinho
                </p>
              </div>
            </div>

            <Link
              href="/cupons"
              className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors w-fit"
            >
              <span>Ver todos os cupons</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dailyCoupons.map((coupon) => (
              <CouponTicketCard key={`home-coup-${coupon.id}`} coupon={coupon} />
            ))}
          </div>
        </section>
      )}

      {/* SEÇÃO 3: Últimas Ofertas com Filtros e Vitrine Completa */}
      <section aria-labelledby="latest-offers-heading" className="space-y-6">
        {/* Barra de Seleção de Feed: Todas vs Para Você */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 dark:border-white/[0.08] pb-3.5">
          <div className="flex w-full sm:w-auto p-1 rounded-2xl bg-slate-100/90 dark:bg-[#13131b] border border-slate-200/80 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                !isForYou
                  ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/25'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Últimas Ofertas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('for_you')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                isForYou
                  ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/25'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-violet-200 dark:border-violet-900/50 bg-violet-50 dark:bg-violet-950/40 text-xs font-bold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors cursor-pointer min-h-[44px]"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Personalizar Interesses</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Layout: Sidebar + Grid */}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar Desktop & Mobile Drawer */}
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
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-card dark:border-white/[0.08] dark:bg-[#13131b]">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(true)}
                  aria-label="Abrir filtros"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 lg:hidden dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 cursor-pointer min-h-[44px]"
                >
                  <SlidersHorizontal className="h-4 w-4 text-violet-500" />
                  <span>Filtros</span>
                  {hasActiveFilters && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-black text-white">
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
              isError={isError}
              error={currentError}
              onRetry={handleRetry}
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
      </section>

      {/* Modal de Preferências do Usuário */}
      <UserPreferencesModal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
      />
    </div>
  );
}
