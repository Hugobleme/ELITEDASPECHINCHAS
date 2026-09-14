'use client';

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOffersInfinite } from '@/hooks/useOffers';
import OfferGrid from '@/components/OfferGrid';
import FilterSidebar from '@/components/FilterSidebar';
import SortDropdown from '@/components/SortDropdown';
import { ChevronRight, Search, SlidersHorizontal, Sparkles, Tag } from 'lucide-react';

const SUGGESTED_SEARCHES = ['Samsung', 'PlayStation', 'iPhone', 'Air Fryer', 'Monitor', 'Gamer', 'TV 4K'];

export default function SearchResultsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [selectedStore, setSelectedStore] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [minDiscount, setMinDiscount] = useState(0);
  const [sort, setSort] = useState<'recent' | 'discount' | 'price'>('recent');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useOffersInfinite({
    search: query,
    store: selectedStore,
    category: selectedCategory,
    min_discount: minDiscount,
    sort,
  });

  const allOffers = data?.pages.flatMap((page) => page.items) || [];

  const handleResetFilters = () => {
    setSelectedStore('');
    setSelectedCategory('todas');
    setMinDiscount(0);
    setSort('recent');
  };

  const handleApplySuggestion = (term: string) => {
    router.push(`/busca?q=${encodeURIComponent(term)}`);
  };

  const hasActiveFilters =
    Boolean(selectedStore) || (selectedCategory && selectedCategory !== 'todas') || minDiscount > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
          Início
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <span className="font-semibold text-slate-900 dark:text-slate-200">Busca</span>
        {query && (
          <>
            <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="italic text-slate-600 dark:text-slate-300 truncate max-w-[160px] xs:max-w-[220px] sm:max-w-md">
              &ldquo;{query}&rdquo;
            </span>
          </>
        )}
      </nav>

      {/* Cabeçalho do Resultado */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-850 p-5 sm:p-8 text-white shadow-card">
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-glow-brand">
              <Search className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-bold text-violet-300">
                  Pesquisa em tempo real
                </span>
              </div>
              <h1 className="text-xl font-black sm:text-2xl mt-0.5 tracking-tight">
                Resultados para: <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-fuchsia-400">&ldquo;{query || 'Todas as Ofertas'}&rdquo;</span>
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm mt-0.5">
                {isLoading ? 'Localizando pechinchas...' : `${allOffers.length} ${allOffers.length === 1 ? 'oferta verificada encontrada' : 'ofertas verificadas encontradas'}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-col gap-6 lg:flex-row">
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

        <div className="flex-1 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md p-3.5 shadow-subtle dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                aria-label="Abrir filtros de busca"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 min-h-[44px] cursor-pointer lg:hidden dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                <SlidersHorizontal className="h-4 w-4 text-violet-500" />
                <span>Filtros</span>
                {hasActiveFilters && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
                    •
                  </span>
                )}
              </button>

              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isLoading ? (
                  'Pesquisando ofertas...'
                ) : (
                  <>
                    <strong className="text-slate-900 dark:text-slate-100">{allOffers.length}</strong> promoções
                  </>
                )}
              </span>
            </div>

            <SortDropdown value={sort} onChange={setSort} />
          </div>

          {/* Se não houver ofertas, exibir sugestões de pesquisa rápidas */}
          {!isLoading && allOffers.length === 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2.5">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <span>Sugestões de busca mais populares:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_SEARCHES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleApplySuggestion(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-violet-400 hover:text-violet-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-violet-500 transition-all cursor-pointer"
                  >
                    <Tag className="h-3 w-3" />
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <OfferGrid
            offers={allOffers}
            isLoading={isLoading}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            onFetchNextPage={() => fetchNextPage()}
            onResetFilters={handleResetFilters}
            emptyTitle={`Nenhum produto encontrado para "${query}"`}
            emptyDescription="Verifique a ortografia ou tente pesquisar termos mais genéricos como os sugeridos acima."
          />
        </div>
      </div>
    </div>
  );
}
