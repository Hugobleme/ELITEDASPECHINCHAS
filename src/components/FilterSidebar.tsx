'use client';

import React from 'react';
import { SlidersHorizontal, X, RotateCcw, Store, Percent, Tag, Check } from 'lucide-react';
import { useCategories, useStores } from '@/hooks/useTaxonomies';

interface FilterSidebarProps {
  selectedStore: string;
  selectedCategory: string;
  minDiscount: number;
  onStoreChange: (store: string) => void;
  onCategoryChange: (category: string) => void;
  onMinDiscountChange: (discount: number) => void;
  onReset: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function FilterSidebar({
  selectedStore,
  selectedCategory,
  minDiscount,
  onStoreChange,
  onCategoryChange,
  onMinDiscountChange,
  onReset,
  isOpenMobile = false,
  onCloseMobile,
}: FilterSidebarProps) {
  const { data: stores = [] } = useStores();
  const { data: categories = [] } = useCategories();

  const activeFiltersCount =
    (selectedStore ? 1 : 0) +
    (selectedCategory && selectedCategory !== 'todas' ? 1 : 0) +
    (minDiscount > 0 ? 1 : 0);

  const content = (
    <div className="flex h-full flex-col space-y-6">
      {/* Header do Filtro */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 dark:bg-violet-500/20">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Filtros</h2>
          {activeFiltersCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-black text-white shadow-sm shadow-violet-500/30">
              {activeFiltersCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Limpar</span>
            </button>
          )}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label="Fechar filtros"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Desconto Mínimo (Slider) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="min-discount-slider" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300">
            <Percent className="h-3.5 w-3.5 text-violet-500" />
            <span>Desconto Mínimo</span>
          </label>
          <span className="rounded-lg bg-violet-100/90 px-2 py-0.5 text-xs font-black text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
            {minDiscount}% ou mais
          </span>
        </div>
        <input
          id="min-discount-slider"
          type="range"
          min="0"
          max="80"
          step="5"
          value={minDiscount}
          onChange={(e) => onMinDiscountChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-violet-600 dark:bg-zinc-800"
        />
        <div className="flex justify-between text-[10px] font-semibold text-slate-400 dark:text-zinc-500">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>80%</span>
        </div>
      </div>

      {/* 2. Filtro por Loja */}
      <div className="space-y-2.5">
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300">
          <Store className="h-3.5 w-3.5 text-violet-500" />
          <span>Lojas Parceiras</span>
        </label>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onStoreChange('')}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              !selectedStore
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold shadow-sm shadow-violet-500/25'
                : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            <span>Todas as lojas</span>
            {!selectedStore && <Check className="h-3.5 w-3.5 text-white" />}
          </button>
          {stores.map((s) => {
            const isSelected = selectedStore.toLowerCase() === s.name.toLowerCase();
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() => onStoreChange(isSelected ? '' : s.name)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold shadow-sm shadow-violet-500/25'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                <span>{s.name}</span>
                {isSelected ? (
                  <Check className="h-3.5 w-3.5 text-white" />
                ) : s.count ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {s.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Filtro por Categoria */}
      <div className="space-y-2.5">
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300">
          <Tag className="h-3.5 w-3.5 text-violet-500" />
          <span>Categorias</span>
        </label>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onCategoryChange('todas')}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              !selectedCategory || selectedCategory === 'todas'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold shadow-sm shadow-violet-500/25'
                : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            <span>Todas as categorias</span>
            {(!selectedCategory || selectedCategory === 'todas') && (
              <Check className="h-3.5 w-3.5 text-white" />
            )}
          </button>
          {categories
            .filter((c) => c.slug !== 'todas')
            .map((c) => {
              const isSelected = selectedCategory === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => onCategoryChange(isSelected ? 'todas' : c.slug)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold shadow-sm shadow-violet-500/25'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span>{c.name}</span>
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 text-white" />
                  ) : c.count ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {c.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Sticky) */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-24 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card dark:border-zinc-800 dark:bg-[#121217]">
          {content}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer Panel */}
          <div className="relative ml-auto flex h-full w-full max-w-xs sm:max-w-sm flex-col bg-white shadow-2xl dark:bg-[#121217] animate-in slide-in-from-right duration-200">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {content}
            </div>

            {/* Pinned Bottom CTA with safe-area padding */}
            <div className="sticky bottom-0 z-10 border-t border-slate-200/80 bg-white/95 backdrop-blur-md p-4 pb-safe dark:border-zinc-800 dark:bg-[#121217]/95">
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 py-3 text-center text-sm font-bold text-white shadow-md shadow-violet-500/25 hover:from-violet-500 hover:to-fuchsia-500 active:scale-95 cursor-pointer"
              >
                Ver Ofertas
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
