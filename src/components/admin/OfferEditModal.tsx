'use client';

import React, { useState, useEffect } from 'react';
import { Offer } from '@/types/offer';
import { X, Save, Sparkles, AlertCircle } from 'lucide-react';
import { formatBRL } from '@/lib/formatters';

interface OfferEditModalProps {
  offer: Offer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updatedData: Partial<Offer>) => Promise<void>;
  isSaving?: boolean;
}

export default function OfferEditModal({
  offer,
  isOpen,
  onClose,
  onSave,
  isSaving = false,
}: OfferEditModalProps) {
  const [title, setTitle] = useState('');
  const [priceCurrent, setPriceCurrent] = useState<number>(0);
  const [priceOriginal, setPriceOriginal] = useState<number>(0);
  const [category, setCategory] = useState('');
  const [store, setStore] = useState('');

  useEffect(() => {
    if (offer) {
      setTitle(offer.title);
      setPriceCurrent(offer.price_current);
      setPriceOriginal(offer.price_original);
      setCategory(offer.category);
      setStore(offer.store);
    }
  }, [offer]);

  if (!isOpen || !offer) return null;

  const calculatedDiscount =
    priceOriginal > priceCurrent && priceOriginal > 0
      ? Math.round(((priceOriginal - priceCurrent) / priceOriginal) * 100)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(offer.id, {
      title,
      price_current: Number(priceCurrent),
      price_original: Number(priceOriginal),
      discount_pct: calculatedDiscount,
      category,
      store,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl sm:p-7">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Editar Promoção</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-1">
          {/* Título */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Título do Produto
            </label>
            <textarea
              rows={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              required
            />
          </div>

          {/* Preços e Desconto */}
          <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Preço Original (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={priceOriginal}
                onChange={(e) => setPriceOriginal(parseFloat(e.target.value) || 0)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Preço Promocional (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={priceCurrent}
                onChange={(e) => setPriceCurrent(parseFloat(e.target.value) || 0)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                required
              />
            </div>
          </div>

          {/* Badge de Desconto Calculado em Tempo Real */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950/60">
            <span className="font-semibold text-slate-500">Desconto Calculado:</span>
            <span
              className={`font-black ${
                calculatedDiscount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'
              }`}
            >
              {calculatedDiscount > 0 ? `-${calculatedDiscount}% OFF` : 'Sem desconto'}
            </span>
          </div>

          {/* Categoria e Loja */}
          <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Loja
              </label>
              <input
                type="text"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Categoria (Slug)
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                required
              />
            </div>
          </div>
          </div>

          {/* Sticky Actions Footer */}
          <div className="flex shrink-0 flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-4 xs:flex-row dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[40px] items-center justify-center rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 active:scale-95 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
