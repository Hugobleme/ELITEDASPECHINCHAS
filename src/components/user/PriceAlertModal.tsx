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
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao criar alerta de preço.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-500 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Criar Alerta de Preço
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Avisamos você imediatamente quando uma oferta bater sua meta!
              </p>
            </div>
          </div>

          <button
            onClick={closeAlertModal}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6">
          {successMessage ? (
            <div className="py-8 text-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                Alerta de Preço Criado!
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs mx-auto">
                Assim que surgir uma oferta correspondente, você receberá uma notificação instantânea.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Palavra-chave */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Termo ou Nome do Produto
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Ex: PlayStation 5, AirPods Pro, Air Fryer..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Deixe em branco para monitorar qualquer produto que atenda aos filtros abaixo.
                </p>
              </div>

              {/* Grid Categoria e Loja */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Categoria (opcional)
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
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
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Loja (opcional)
                  </label>
                  <select
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
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
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-brand-500" />
                    Desconto mínimo para alertar:
                  </label>
                  <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-xs">
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
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>5% (Qualquer desconto)</span>
                  <span>40% (Metade do preço)</span>
                  <span>80% (Super Bug)</span>
                </div>
              </div>

              {/* Botões */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={closeAlertModal}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createAlertMutation.isPending}
                  className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-brand-500/25 flex items-center gap-2 disabled:opacity-60"
                >
                  {createAlertMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      Ativar Alerta
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
