'use client';

import React, { useState, useEffect } from 'react';
import { usePriceAlertModal } from '@/contexts/PriceAlertModalContext';
import { useCreateAlert } from '@/hooks/useAlerts';
import { useCategories, useStores } from '@/hooks/useTaxonomies';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { Bell, X, Tag, Store, Sliders, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export function PriceAlertModal() {
  const { isOpen, defaults, closeAlertModal } = usePriceAlertModal();
  const { isAuthenticated, openAuthModal } = useUserAuth();
  const createAlertMutation = useCreateAlert();
  const { data: categories = [] } = useCategories();
  const { data: stores = [] } = useStores();

  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [store, setStore] = useState('');
  const [targetDiscount, setTargetDiscount] = useState(20);
  const [successMessage, setSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKeyword(defaults.keyword || '');
      setCategory(defaults.category || '');
      setStore(defaults.store || '');
      setTargetDiscount(defaults.target_discount || 20);
      setSuccessMessage(false);
      setErrorMessage(null);
    }
  }, [isOpen, defaults]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isAuthenticated) {
      closeAlertModal();
      openAuthModal('login');
      return;
    }

    if (!keyword.trim() && !category && !store) {
      setErrorMessage('Defina pelo menos uma palavra-chave, categoria ou loja para o alerta.');
      return;
    }

    try {
      await createAlertMutation.mutateAsync({
        keyword: keyword.trim() || undefined,
        category: category || undefined,
        store: store || undefined,
        target_discount: targetDiscount,
      });

      setSuccessMessage(true);
      setTimeout(() => {
        closeAlertModal();
      }, 1800);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Erro ao criar alerta de preço.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center shadow-sm shrink-0">
              <Bell className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Criar Alerta de Preço
              </h3>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                Avisaremos você no navegador quando uma oferta bater sua meta.
              </p>
            </div>
          </div>

          <button
            onClick={closeAlertModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll Suave */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {successMessage ? (
            <div className="py-8 text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                Alerta de Preço Criado!
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                Assim que surgir uma oferta correspondente, você receberá uma notificação instantânea.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Palavra-chave */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Termo ou Nome do Produto
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    placeholder="Ex: PlayStation 5, AirPods Pro, Air Fryer..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none dark:text-white"
                  />
                </div>
                <p className="text-[11px] font-medium text-slate-400 mt-1">
                  Deixe em branco para monitorar qualquer produto que atenda à categoria ou loja abaixo.
                </p>
              </div>

              {/* Grid Categoria e Loja */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Categoria (opcional)
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none dark:text-white"
                  >
                    <option value="">Todas as categorias</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Loja (opcional)
                  </label>
                  <select
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none dark:text-white"
                  >
                    <option value="">Todas as lojas</option>
                    {stores.map((s) => (
                      <option key={s.slug} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Slider de Desconto Mínimo */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-orange-500" />
                    Desconto mínimo para alertar:
                  </label>
                  <span className="px-2.5 py-0.5 rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 font-black text-xs">
                    {targetDiscount}% OFF ou mais
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="80"
                  step="5"
                  value={targetDiscount}
                  onChange={(e) => setTargetDiscount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1.5">
                  <span>5% (Qualquer desconto)</span>
                  <span>40% (Metade do preço)</span>
                  <span>80% (Super Bug)</span>
                </div>
              </div>

              {/* Botões */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeAlertModal}
                  className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createAlertMutation.isPending}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-orange-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {createAlertMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>Ativar Alerta</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
