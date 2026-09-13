'use client';

import React from 'react';
import { Check, X, Send, Trash2, CheckCheck } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onApproveAll: () => void;
  onPublishAll: () => void;
  onRejectAll: () => void;
  onClearSelection: () => void;
  isLoading?: boolean;
}

export default function BulkActionBar({
  selectedCount,
  onApproveAll,
  onPublishAll,
  onRejectAll,
  onClearSelection,
  isLoading = false,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-900/95 px-2.5 py-2 text-white shadow-2xl backdrop-blur-md xs:gap-2.5 xs:px-4 xs:py-2.5 dark:border-slate-700 dark:bg-slate-950/95">
      <div className="flex shrink-0 items-center gap-1.5 border-r border-slate-700 pr-2 text-xs font-semibold xs:gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-black text-white">
          {selectedCount}
        </span>
        <span className="hidden sm:inline">selecionada{selectedCount > 1 ? 's' : ''}</span>
      </div>

      <div className="flex items-center gap-1.5 xs:gap-2">
        {/* Aprovar */}
        <button
          type="button"
          onClick={onApproveAll}
          disabled={isLoading}
          className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2.5 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-50 xs:px-3.5"
          title="Aprovar todas as selecionadas"
        >
          <Check className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden xs:inline">Aprovar</span>
        </button>

        {/* Publicar */}
        <button
          type="button"
          onClick={onPublishAll}
          disabled={isLoading}
          className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-2.5 py-2 text-xs font-bold text-white transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-50 xs:px-3.5"
          title="Publicar todas imediatamente na vitrine"
        >
          <Send className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden xs:inline">Publicar</span>
        </button>

        {/* Rejeitar */}
        <button
          type="button"
          onClick={onRejectAll}
          disabled={isLoading}
          className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-red-600/90 px-2.5 py-2 text-xs font-bold text-white transition-all hover:bg-red-500 active:scale-95 disabled:opacity-50 xs:px-3.5"
          title="Rejeitar todas as selecionadas"
        >
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden xs:inline">Rejeitar</span>
        </button>
      </div>

      {/* Desmarcar */}
      <button
        type="button"
        onClick={onClearSelection}
        className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        title="Limpar seleção"
        aria-label="Limpar seleção"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
