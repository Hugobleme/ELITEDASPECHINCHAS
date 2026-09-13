'use client';

import React, { useState } from 'react';
import { useOffersInfinite } from '@/hooks/useOffers';
import OfferGrid from '@/components/OfferGrid';
import FilterSidebar from '@/components/FilterSidebar';
import SortDropdown from '@/components/SortDropdown';
import { SlidersHorizontal } from 'lucide-react';

interface CategoryOffersClientProps {
  categorySlug: string;
  categoryName: string;
}

export default function CategoryOffersClient({
  categorySlug,
  categoryName,
}: CategoryOffersClientProps) {
  const [selectedStore, setSelectedStore] = useState('');
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
    category: categorySlug,
    store: selectedStore,
    min_discount: minDiscount,
    sort,
  });

  const allOffers = data?.pages.flatMap((page) => page.items) || [];

  const handleResetFilters = () => {
    setSelectedStore('');
    setMinDiscount(0);
    setSort('recent');
  };

  const hasActiveFilters = Boolean(selectedStore) || minDiscount > 0;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <FilterSidebar
        selectedStore={selectedStore}
        selectedCategory={categorySlug}
        minDiscount={minDiscount}
        onStoreChange={setSelectedStore}
        onCategoryChange={() => {}}
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
                'Carregando promoções...'
              ) : (
                <>
                  <strong className="text-slate-900 dark:text-slate-100">{allOffers.length}</strong> ofertas em{' '}
                  {categoryName}
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
          emptyTitle={`Nenhuma oferta encontrada em ${categoryName}`}
          emptyDescription="Tente alterar os filtros de lojas ou a faixa de desconto para ver mais produtos."
        />
      </div>
    </div>
  );
}
