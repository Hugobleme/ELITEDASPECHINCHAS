'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  Truck,
  Smile,
  BadgePercent,
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
      {/* Hero Banner Ouro Real Metálico & Ônix Luxuoso com o Emblema Oficial */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1406] via-[#0d0c07] to-[#070709] p-6 sm:p-9 md:p-12 text-white border border-amber-500/30 shadow-2xl shadow-amber-950/40">
        {/* Orbes de Luz Dourada Ambiente */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-amber-500/15 blur-[95px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-yellow-500/10 blur-[95px]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-amber-400/5 blur-[80px]" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-5 max-w-2xl">
            {/* Pill de Status Live */}
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-amber-300 border border-amber-500/30 shadow-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span className="tracking-wide">Monitoramento 24h • 100% Verificado</span>
            </div>

            {/* Headline Oficial da Marca */}
            <div className="space-y-2">
              <span className="inline-block text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                Grandes Ofertas, Todo Dia!
              </span>
              <h1 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.12] text-white">
                A Elite dos{' '}
                <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
                  Descontos e Cupons
                </span>{' '}
                da Internet
              </h1>
            </div>

            <p className="text-xs sm:text-sm font-medium text-zinc-300 leading-relaxed max-w-xl">
              Rastreamos as maiores quedas de preço da Amazon, Mercado Livre, Shopee, Magalu e Kabum. Compare histórico, ative cupons de carrinho e nunca mais pague o valor cheio.
            </p>

            {/* 4 Pilares de Garantia Oficiais (presentes no logotipo) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] backdrop-blur-md p-2.5 border border-amber-500/15">
                <Truck className="h-4 w-4 shrink-0 text-amber-400" />
                <span className="text-[11px] font-bold text-zinc-200 leading-tight">Produtos com Qualidade</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] backdrop-blur-md p-2.5 border border-amber-500/15">
                <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
                <span className="text-[11px] font-bold text-zinc-200 leading-tight">Compra Segura</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] backdrop-blur-md p-2.5 border border-amber-500/15">
                <BadgePercent className="h-4 w-4 shrink-0 text-amber-400" />
                <span className="text-[11px] font-bold text-zinc-200 leading-tight">Os Melhores Preços</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] backdrop-blur-md p-2.5 border border-amber-500/15">
                <Smile className="h-4 w-4 shrink-0 text-amber-400" />
                <span className="text-[11px] font-bold text-zinc-200 leading-tight">Satisfação Garantida</span>
              </div>
            </div>

            {/* Tags de Tendências Rápidas */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <span className="font-bold text-zinc-400 flex items-center gap-1.5 shrink-0">
                <TrendingDown className="h-3.5 w-3.5 text-amber-400" />
                Tendências:
              </span>
              {trendingTags.map((tag) => (
                <Link
                  key={tag}
                  href={`/busca?q=${encodeURIComponent(tag)}`}
                  className="rounded-lg bg-white/[0.08] hover:bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-zinc-200 hover:text-amber-300 border border-white/[0.08] hover:border-amber-400/40 transition-all cursor-pointer"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>

          {/* Logotipo Oficial em Destaque no Hero */}
          <div className="shrink-0 flex items-center justify-center">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 opacity-60 blur-xl group-hover:opacity-100 transition duration-700 animate-pulse" />
              <div className="relative h-44 w-44 sm:h-52 sm:w-52 rounded-full p-1 bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 shadow-2xl shadow-amber-500/30">
                <div className="h-full w-full rounded-full overflow-hidden bg-black flex items-center justify-center border-2 border-black">
                  <Image
                    src="/logo.png"
                    alt="Elite das Pechinchas - Logotipo Oficial"
                    width={208}
                    height={208}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 1: Ofertas em Destaque (Apenas exibido quando não houver filtros ativos e na aba principal) */}
      {!hasActiveFilters && !isForYou && featuredOffers.length > 0 && (
        <section aria-labelledby="featured-offers-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/25">
                <Flame className="h-5 w-5 fill-current" />
              </div>
              <div>
                <h2 id="featured-offers-heading" className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Ofertas em Destaque
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Os maiores descontos e produtos mais votados da comunidade
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
        <section aria-labelledby="daily-coupons-heading" className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 dark:border-amber-500/20 dark:bg-[#111116] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/20">
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
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-500 hover:text-amber-400 dark:text-amber-400 dark:hover:text-amber-300 transition-colors w-fit"
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
          <div className="flex w-full sm:w-auto p-1 rounded-2xl bg-slate-100/90 dark:bg-[#111116] border border-slate-200/80 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                !isForYou
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/25 border border-amber-300/40'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Últimas Ofertas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('for_you')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                isForYou
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/25 border border-amber-300/40'
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-500 dark:text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer min-h-[44px]"
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
                  <SlidersHorizontal className="h-4 w-4 text-amber-500" />
                  <span>Filtros</span>
                  {hasActiveFilters && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-slate-950">
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
