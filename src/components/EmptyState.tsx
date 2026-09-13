'use client';

import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onReset?: () => void;
}

export default function EmptyState({
  title = 'Nenhuma oferta encontrada',
  description = 'Tente ajustar os filtros, pesquisar por outro termo ou verificar mais tarde.',
  onReset,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/50 px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
        <SearchX className="h-8 w-8" />
      </div>

      <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-orange-500/30"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Limpar todos os filtros</span>
        </button>
      )}
    </div>
  );
}
