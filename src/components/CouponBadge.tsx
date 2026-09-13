'use client';

import React, { useState } from 'react';
import { Ticket, Copy, Check } from 'lucide-react';

interface CouponBadgeProps {
  code: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function CouponBadge({
  code,
  size = 'md',
  className = '',
}: CouponBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  if (size === 'sm') {
    return (
      <div
        onClick={handleCopy}
        title="Clique para copiar cupom"
        className={`group relative inline-flex items-center gap-1.5 rounded-lg border border-dashed border-amber-400 bg-amber-50/90 px-2 py-0.5 text-[11px] font-bold text-amber-900 transition-all hover:bg-amber-100 hover:border-amber-500 cursor-pointer dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70 ${className}`}
      >
        <Ticket className="h-3 w-3 text-amber-600 dark:text-amber-400" />
        <span className="font-mono tracking-wider">{code}</span>
        {copied ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-extrabold dark:text-emerald-400">
            <Check className="h-3 w-3" /> Copiado!
          </span>
        ) : (
          <Copy className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    );
  }

  // Tamanho Médio / Grande (Página de Detalhes)
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/60 p-3.5 dark:border-amber-500/40 dark:bg-amber-950/20 ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
          <Ticket className="h-5 w-5" />
        </div>
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
            Cupom de Desconto Especial
          </span>
          <span className="font-mono text-base font-black tracking-widest text-slate-900 dark:text-white">
            {code}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm ${
          copied
            ? 'bg-emerald-500 text-white shadow-emerald-500/20'
            : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-amber-500/20'
        }`}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            <span>Copiado!</span>
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            <span>Copiar Cupom</span>
          </>
        )}
      </button>
    </div>
  );
}
