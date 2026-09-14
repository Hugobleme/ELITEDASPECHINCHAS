'use client';

import React, { useState, useMemo } from 'react';
import { useOffersInfinite } from '@/hooks/useOffers';
import OfferGrid from '@/components/OfferGrid';
import FilterSidebar from '@/components/FilterSidebar';
import SortDropdown from '@/components/SortDropdown';
import CouponCard from '@/components/CouponCard';
import { MOCK_COUPONS } from '@/lib/mock-coupons';
import { SlidersHorizontal, Ticket, Sparkles } from 'lucide-react';

interface StoreOffersClientProps {
  storeSlug: string;
  storeName: string;
}

export default function StoreOffersClient({
  storeSlug,
  storeName,
}: StoreOffersClientProps) {
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [minDiscount, setMinDiscount] = useState(0);
  const [sort, setSort] = useState<'recent' | 'discount' | 'price'>('recent');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Cupons da loja
  const storeCoupons = useMemo(() => {
    const normStore = storeName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normSlug = storeSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
    return MOCK_COUPONS.filter((c) => {
      const cStore = c.store.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cSlug = c.store_slug.toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        cStore.includes(normStore) ||
        normStore.includes(cStore) ||
        cSlug.includes(normSlug) ||
        normSlug.includes(cSlug)
      );
    });
  }, [storeName, storeSlug]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useOffersInfinite({
    store: storeName,
    category: selectedCategory,
    min_discount: minDiscount,
    sort,
  });

  const allOffers = data?.pages.flatMap((page) => page.items) || [];

  const handleResetFilters = () => {
    setSelectedCategory('todas');
    setMinDiscount(0);
    setSort('recent');
  };

  const hasActiveFilters = (selectedCategory && selectedCategory !== 'todas') || minDiscount > 0;

  return (
    <div className="space-y-8">
      {/* Seção de Cupons Ativos da Loja */}
      {storeCoupons.length > 0 && (
        <section aria-labelledby="store-coupons-heading" className="rounded-3xl border border-slate-200/80 bg-white/70 p-5 sm:p-6 dark:border-zinc-800 dark:bg-[#121217] space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-red-500 to-pink-500 text-white shadow-sm">
              <Ticket className="h-4 w-4" />
            </div>
            <div>
              <h2 id="store-coupons-heading" className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Cupons de Desconto na {storeName}
              </h2>
              <p className="text-xs text-slate-400 dark:text-zinc-500">
                {storeCoupons.length} {storeCoupons.length === 1 ? 'código verificado disponível' : 'códigos verificados disponíveis'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {storeCoupons.map((coupon) => (
              <CouponCard key={`store-coup-${coupon.id}`} coupon={coupon} />
            ))}
          </div>
        </section>
      )}

      {/* Layout de Filtros + Grid de Ofertas da Loja */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <FilterSidebar
          selectedStore={storeName}
          selectedCategory={selectedCategory}
          minDiscount={minDiscount}
          onStoreChange={() => {}}
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
                aria-label="Abrir filtros de categoria"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 min-h-[44px] cursor-pointer lg:hidden dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                <SlidersHorizontal className="h-4 w-4 text-violet-500" />
                <span>Filtros</span>
                {hasActiveFilters && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[10px] text-white">
                    •
                  </span>
                )}
              </button>

              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isLoading ? (
                  'Carregando promoções...'
                ) : (
                  <>
                    <strong className="text-slate-900 dark:text-slate-100">{allOffers.length}</strong> ofertas na{' '}
                    {storeName}
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
            emptyTitle={`Nenhuma oferta encontrada na ${storeName}`}
            emptyDescription="Tente alterar os filtros de categorias ou diminuir o desconto mínimo."
          />
        </div>
      </div>
    </div>
  );
}
