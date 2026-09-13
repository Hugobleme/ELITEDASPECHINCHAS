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
        className={`group relative inline-flex items-center gap-1.5 rounded-lg border border-dashed border-violet-400/90 bg-violet-50/95 px-2.5 py-1 text-[11px] font-bold text-violet-900 transition-all hover:bg-violet-100 hover:border-violet-500 cursor-pointer dark:border-violet-500/50 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-950/70 ${className}`}
      >
        <Ticket className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
        <span className="font-mono tracking-wider font-extrabold">{code}</span>
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
      className={`flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-violet-400/80 bg-gradient-to-r from-violet-50/90 to-fuchsia-50/70 p-4 shadow-sm dark:border-violet-500/40 dark:from-violet-950/30 dark:to-fuchsia-950/20 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-sm">
          <Ticket className="h-5 w-5" />
        </div>
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-violet-800 dark:text-violet-300">
            Cupom de Desconto Verificado
          </span>
          <span className="font-mono text-lg font-black tracking-widest text-slate-900 dark:text-white">
            {code}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer ${
          copied
            ? 'bg-emerald-600 text-white shadow-emerald-500/20'
            : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-violet-500/25 hover:shadow-md'
        }`}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-white" />
            <span>Copiado com Sucesso!</span>
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
