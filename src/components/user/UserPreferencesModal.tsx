'use client';

import React, { useState, useEffect } from 'react';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useFeed';
import { useCategories, useStores } from '@/hooks/useTaxonomies';
import { X, Sparkles, Sliders, Check, Loader2 } from 'lucide-react';

interface UserPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserPreferencesModal({ isOpen, onClose }: UserPreferencesModalProps) {
  const { data: preferences } = useUserPreferences();
  const updateMutation = useUpdateUserPreferences();
  const { data: categories = [] } = useCategories();
  const { data: stores = [] } = useStores();

  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [minDiscount, setMinDiscount] = useState<number>(20);

  useEffect(() => {
    if (preferences) {
      setSelectedCats(preferences.categories || []);
      setSelectedStores(preferences.stores || []);
      setMinDiscount(preferences.min_discount || 20);
    }
  }, [preferences, isOpen]);

  if (!isOpen) return null;

  const toggleCategory = (slug: string) => {
    setSelectedCats((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]
    );
  };

  const toggleStore = (name: string) => {
    setSelectedStores((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      categories: selectedCats,
      stores: selectedStores,
      min_discount: minDiscount,
    });
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Personalizar seu Feed
              </h3>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                Priorize lojas, marcas e categorias favoritas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Categorias Favoritas */}
          <div>
            <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2.5">
              Categorias de Interesse
            </label>
            <div className="flex flex-wrap gap-2">
              {categories
                .filter((c) => c.slug !== 'todas')
                .map((cat) => {
                  const isSelected = selectedCats.includes(cat.slug);
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => toggleCategory(cat.slug)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-400'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Lojas Favoritas */}
          <div>
            <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2.5">
              Lojas Parceiras Preferidas
            </label>
            <div className="flex flex-wrap gap-2">
              {stores.map((store) => {
                const isSelected = selectedStores.includes(store.name);
                return (
                  <button
                    key={store.slug}
                    type="button"
                    onClick={() => toggleStore(store.name)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-600/20'
                        : 'bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{store.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desconto Mínimo */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5 text-orange-500" />
                Desconto mínimo desejado
              </label>
              <span className="px-2.5 py-0.5 rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 font-black text-xs">
                {minDiscount}% OFF ou mais
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="70"
              step="5"
              value={minDiscount}
              onChange={(e) => setMinDiscount(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>
        </div>

        {/* Rodapé fixo com botões full-width no mobile */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-center"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              'Salvar Preferências'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export { UserPreferencesModal };
