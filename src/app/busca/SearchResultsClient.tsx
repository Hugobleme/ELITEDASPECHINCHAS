'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useOffersInfinite } from '@/hooks/useOffers';
import OfferGrid from '@/components/OfferGrid';
import FilterSidebar from '@/components/FilterSidebar';
import SortDropdown from '@/components/SortDropdown';
import { ChevronRight, Search, SlidersHorizontal } from 'lucide-react';

export default function SearchResultsClient() {
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

  const hasActiveFilters =
    Boolean(selectedStore) || (selectedCategory && selectedCategory !== 'todas') || minDiscount > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-orange-600 dark:hover:text-orange-400">
          Início
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <span className="font-semibold text-slate-900 dark:text-slate-200">Busca</span>
        {query && (
          <>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="italic text-slate-600 dark:text-slate-300">"{query}"</span>
          </>
        )}
      </nav>

      {/* Cabeçalho do Resultado */}
      <div className="mb-8 rounded-3xl bg-slate-900 p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white">
            <Search className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black sm:text-2xl">
              Resultados para: <span className="text-orange-400">"{query}"</span>
            </h1>
            <p className="text-xs text-slate-300 sm:text-sm">
              {allOffers.length} {allOffers.length === 1 ? 'oferta encontrada' : 'ofertas encontradas'}
            </p>
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-center gap-2">
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

          <OfferGrid
            offers={allOffers}
            isLoading={isLoading}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            onFetchNextPage={() => fetchNextPage()}
            onResetFilters={handleResetFilters}
            emptyTitle={`Nenhum produto encontrado para "${query}"`}
            emptyDescription="Verifique a ortografia ou tente pesquisar termos mais genéricos, como 'tv', 'celular' ou 'fone'."
          />
        </div>
      </div>
    </div>
  );
}
