'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { MOCK_COUPONS } from '@/lib/mock-coupons';
import CouponTicketCard from '@/components/CouponTicketCard';
import StoreLogo from '@/components/StoreLogo';
import { Ticket, Search, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function CuponsPage() {
  const [search, setSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState('todas');

  const stores = useMemo(() => {
    const unique = Array.from(new Set(MOCK_COUPONS.map((c) => c.store)));
    return ['todas', ...unique];
  }, []);

  const filteredCoupons = useMemo(() => {
    return MOCK_COUPONS.filter((c) => {
      const matchStore =
        selectedStore === 'todas' ||
        c.store.toLowerCase() === selectedStore.toLowerCase();

      const term = search.toLowerCase().trim();
      const matchSearch =
        !term ||
        c.store.toLowerCase().includes(term) ||
        c.discount_text.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term) ||
        c.rule_text.toLowerCase().includes(term);

      return matchStore && matchSearch;
    });
  }, [search, selectedStore]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      {/* Botão Voltar */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
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

          <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400 pt-1">
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
      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card dark:border-zinc-800 dark:bg-[#121217]">
        {/* Barra de Busca */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por loja (Amazon, Mercado Livre...), código ou desconto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Chips de Lojas */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
          {stores.map((store) => {
            const isSelected = selectedStore === store;
            return (
              <button
                key={store}
                type="button"
                onClick={() => setSelectedStore(store)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/25'
                    : 'border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                {store !== 'todas' && (
                  <StoreLogo storeName={store} size="xs" />
                )}
                <span>{store === 'todas' ? '✨ Todas as lojas' : store}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Cupons */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
            {filteredCoupons.length} {filteredCoupons.length === 1 ? 'cupom encontrado' : 'cupons encontrados'}
          </h2>
        </div>

        {filteredCoupons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredCoupons.map((coupon) => (
              <CouponTicketCard key={coupon.id} coupon={coupon} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-zinc-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-zinc-800 dark:text-violet-400 mb-3">
              <Ticket className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">
              Nenhum cupom encontrado
            </p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
              Tente selecionar outra loja ou limpar sua pesquisa.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
