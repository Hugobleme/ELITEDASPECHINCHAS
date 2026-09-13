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
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 dark:bg-orange-500/20">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Filtros</h2>
          {activeFiltersCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[11px] font-black text-white shadow-sm shadow-orange-500/30">
              {activeFiltersCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Limpar</span>
            </button>
          )}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden dark:hover:bg-slate-800 dark:hover:text-slate-200"
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
          <label htmlFor="min-discount-slider" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Percent className="h-3.5 w-3.5 text-orange-500" />
            <span>Desconto Mínimo</span>
          </label>
          <span className="rounded-lg bg-orange-100/90 px-2 py-0.5 text-xs font-black text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
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
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-orange-500 dark:bg-slate-800"
        />
        <div className="flex justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>80%</span>
        </div>
      </div>

      {/* 2. Filtro por Loja */}
      <div className="space-y-2.5">
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Store className="h-3.5 w-3.5 text-orange-500" />
          <span>Lojas Parceiras</span>
        </label>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onStoreChange('')}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              !selectedStore
                ? 'bg-orange-500 text-white font-bold shadow-sm shadow-orange-500/20'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
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
                    ? 'bg-orange-500 text-white font-bold shadow-sm shadow-orange-500/20'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
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
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Tag className="h-3.5 w-3.5 text-orange-500" />
          <span>Categorias</span>
        </label>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onCategoryChange('todas')}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              !selectedCategory || selectedCategory === 'todas'
                ? 'bg-orange-500 text-white font-bold shadow-sm shadow-orange-500/20'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
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
                      ? 'bg-orange-500 text-white font-bold shadow-sm shadow-orange-500/20'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{c.name}</span>
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 text-white" />
                  ) : c.count ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
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
        <div className="sticky top-24 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900/90">
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
          <div className="relative ml-auto flex h-full w-full max-w-xs flex-col overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900 animate-in slide-in-from-right duration-200">
            {content}

            <div className="mt-8 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-center text-sm font-bold text-white shadow-md shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600"
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
