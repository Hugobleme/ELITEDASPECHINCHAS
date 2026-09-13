'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_COUPONS } from '@/lib/mock-coupons';
import CouponTicketCard from './CouponTicketCard';
import StoreLogo from './StoreLogo';
import { Ticket, X, Search, Sparkles, CheckCircle2 } from 'lucide-react';

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CouponModal({ isOpen, onClose }: CouponModalProps) {
  const [search, setSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState('todas');

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lista de lojas únicas
  const stores = useMemo(() => {
    const unique = Array.from(new Set(MOCK_COUPONS.map((c) => c.store)));
    return ['todas', ...unique];
  }, []);

  // Cupons filtrados
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200/80 bg-slate-50 shadow-2xl dark:border-zinc-800 dark:bg-[#0f0f14] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-[#121217]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/25">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                Cupons de Desconto Verificados
              </h2>
              <p className="text-xs text-slate-400 dark:text-zinc-400">
                Economize com códigos testados e 100% funcionais
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de Busca + Filtro de Lojas */}
        <div className="border-b border-slate-200/80 bg-white/70 p-4 backdrop-blur-md dark:border-zinc-800 dark:bg-[#121217]/70 space-y-3">
          {/* Busca */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar cupom por loja, código ou percentual..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
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
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-xs'
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

        {/* Lista de Cupons com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredCoupons.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredCoupons.map((coupon) => (
                <CouponTicketCard key={coupon.id} coupon={coupon} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-zinc-800 dark:text-violet-400 mb-3">
                <Ticket className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                Nenhum cupom encontrado
              </p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                Tente buscar por outro termo ou selecione todas as lojas.
              </p>
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-[#121217] text-[11px] text-slate-400 dark:text-zinc-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Todos os cupons são verificados e atualizados</span>
          </div>
          <span className="font-bold text-slate-700 dark:text-zinc-300">
            {filteredCoupons.length} cupons disponíveis
          </span>
        </div>
      </div>
    </div>
  );
}
