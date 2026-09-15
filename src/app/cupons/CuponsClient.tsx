'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { MOCK_COUPONS } from '@/lib/mock-coupons';
import CouponCard from '@/components/CouponCard';
import StoreLogo from '@/components/StoreLogo';
import { trackSearchOffers, trackFilterOffers } from '@/lib/analytics';
import {
  Ticket,
  Search,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Tag,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';

export default function CuponsClient() {
  const [search, setSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState('todas');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [sortBy, setSortBy] = useState<'relevance' | 'discount' | 'validity'>('relevance');

  // Lojas únicas para filtro
  const stores = useMemo(() => {
    const unique = Array.from(new Set(MOCK_COUPONS.map((c) => c.store)));
    return ['todas', ...unique];
  }, []);

  // Categorias únicas para filtro
  const categories = useMemo(() => {
    const cats = new Set<string>();
    MOCK_COUPONS.forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return ['todas', ...Array.from(cats)];
  }, []);

  // Filtragem e Ordenação combinadas
  const filteredAndSortedCoupons = useMemo(() => {
    const filtered = MOCK_COUPONS.filter((c) => {
      const matchStore =
        selectedStore === 'todas' ||
        c.store.toLowerCase() === selectedStore.toLowerCase();

      const matchCategory =
        selectedCategory === 'todas' ||
        (c.category && c.category.toLowerCase() === selectedCategory.toLowerCase());

      const term = search.toLowerCase().trim();
      const matchSearch =
        !term ||
        c.store.toLowerCase().includes(term) ||
        c.discount_text.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term) ||
        c.rule_text.toLowerCase().includes(term) ||
        (c.description && c.description.toLowerCase().includes(term));

      return matchStore && matchCategory && matchSearch;
    });

    if (sortBy === 'discount') {
      filtered.sort((a, b) => {
        const numA = parseInt(a.discount_text.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.discount_text.replace(/\D/g, ''), 10) || 0;
        return numB - numA;
      });
    } else if (sortBy === 'validity') {
      filtered.sort((a, b) => {
        const dateA = a.expires_at ? new Date(a.expires_at).getTime() : 0;
        const dateB = b.expires_at ? new Date(b.expires_at).getTime() : 0;
        return dateB - dateA;
      });
    }

    return filtered;
  }, [search, selectedStore, selectedCategory, sortBy]);

  // Analytics de busca com debounce
  useEffect(() => {
    if (!search || search.trim().length < 2) return;
    const timer = setTimeout(() => {
      trackSearchOffers(search, filteredAndSortedCoupons.length);
    }, 800);
    return () => clearTimeout(timer);
  }, [search, filteredAndSortedCoupons.length]);

  const handleStoreChange = (store: string) => {
    setSelectedStore(store);
    trackFilterOffers({ store, category: selectedCategory });
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    trackFilterOffers({ store: selectedStore, category });
  };

  const handleReset = () => {
    setSearch('');
    setSelectedStore('todas');
    setSelectedCategory('todas');
    setSortBy('relevance');
  };

  const hasFilters = search || selectedStore !== 'todas' || selectedCategory !== 'todas';

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      {/* Botão Voltar */}
      <div>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para ofertas</span>
        </Link>
      </div>

      {/* Hero Banner de Cupons */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950/80 via-zinc-900 to-zinc-950 p-6 sm:p-8 md:p-10 text-white border border-violet-500/20 shadow-xl shadow-violet-500/10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-violet-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-fuchsia-600/20 blur-3xl" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-bold text-violet-300 border border-violet-500/30">
            <Ticket className="h-3.5 w-3.5 text-violet-400" />
            <span>Central de Cupons Verificados</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            Cupons de Desconto em Destaque
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300 max-w-xl leading-relaxed">
            Economize instantaneamente nas maiores lojas do Brasil. Todos os códigos são testados diariamente e garantem descontos reais no carrinho.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-400 pt-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>100% Gratuitos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-violet-400" />
              <span>Verificação Diária</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-card dark:border-zinc-800 dark:bg-[#121217]">
        {/* Barra de Busca + Seletor de Ordenação */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              aria-label="Buscar cupom por loja ou código"
              placeholder="Buscar por loja (Amazon, Mercado Livre...), código ou desconto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 min-h-[44px]"
            />
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpar campo de busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <select
              aria-label="Ordenar cupons"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 min-h-[44px]"
            >
              <option value="relevance">Mais Relevantes</option>
              <option value="discount">Maior Desconto</option>
              <option value="validity">Validade Recente</option>
            </select>
          </div>
        </div>

        {/* Filtros por Loja */}
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5">
            Filtrar por Loja:
          </span>
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
            {stores.map((store) => {
              const isSelected = selectedStore === store;
              return (
                <button
                  key={store}
                  type="button"
                  onClick={() => handleStoreChange(store)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all min-h-[38px] cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/25'
                      : 'border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  {store !== 'todas' && <StoreLogo storeName={store} size="xs" />}
                  <span>{store === 'todas' ? '✨ Todas as lojas' : store}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtros por Categoria */}
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5">
            Filtrar por Categoria:
          </span>
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold capitalize transition-all min-h-[36px] cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-md shadow-fuchsia-500/25'
                      : 'border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Tag className="h-3 w-3" />
                  <span>{cat === 'todas' ? 'Todas as Categorias' : cat.replace(/-/g, ' ')}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid de Cupons */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
            {filteredAndSortedCoupons.length}{' '}
            {filteredAndSortedCoupons.length === 1 ? 'cupom encontrado' : 'cupons encontrados'}
          </h2>

          {hasFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>

        {filteredAndSortedCoupons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedCoupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800 p-12 text-center bg-white/60 dark:bg-zinc-900/40">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-zinc-800 dark:text-violet-400 mb-3">
              <Ticket className="h-7 w-7" />
            </div>
            <p className="text-base font-bold text-slate-800 dark:text-zinc-200">
              Nenhum cupom encontrado
            </p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 max-w-sm">
              Não encontramos cupons com os filtros atuais. Tente selecionar outra loja, categoria ou limpar a busca.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restaurar todos os cupons</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
