'use client';

import React from 'react';
import { SearchX, RotateCcw, Sparkles } from 'lucide-react';

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
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300/80 bg-white/60 p-8 sm:p-14 text-center dark:border-slate-800 dark:bg-slate-900/40 backdrop-blur-sm">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-violet-500/15 to-fuchsia-500/10 text-violet-500 dark:from-violet-500/25 dark:to-fuchsia-500/15 shadow-inner">
        <SearchX className="h-9 w-9 stroke-[2.2]" />
        <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-500 text-white shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      </div>

      <h3 className="mt-5 text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
        {description}
      </p>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-violet-500/35 active:scale-95 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Redefinir Filtros</span>
        </button>
      )}
    </div>
  );
}
