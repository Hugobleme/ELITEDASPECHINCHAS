'use client';

import React, { useState, useEffect } from 'react';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useFeed';
import { useCategories, useStores } from '@/hooks/useTaxonomies';
import { X, Sparkles, Sliders, Check, Loader2 } from 'lucide-react';

interface UserPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserPreferencesModal({ isOpen, onClose }: UserPreferencesModalProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Personalizar seu Feed
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Escolha o que você mais gosta para priorizarmos as melhores ofertas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Categorias Favoritas */}
          <div>
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-2.5">
              Categorias de Interesse
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = selectedCats.includes(cat.slug);
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => toggleCategory(cat.slug)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-brand-500 text-white border-brand-500 shadow-sm shadow-brand-500/20'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-400'
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
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-2.5">
              Lojas Favoritas
            </label>
            <div className="flex flex-wrap gap-2">
              {stores.map((store) => {
                const isSelected = selectedStores.includes(store.name);
                return (
                  <button
                    key={store.slug}
                    type="button"
                    onClick={() => toggleStore(store.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-600/20'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-purple-400'
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
              <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5 text-brand-500" />
                Desconto mínimo desejado
              </label>
              <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-xs">
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
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
          </div>
        </div>

        {/* Rodapé fixo */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-850 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-750 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-brand-500/25 flex items-center gap-2 disabled:opacity-60"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
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
