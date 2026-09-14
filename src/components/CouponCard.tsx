'use client';

import React, { useState } from 'react';
import { CouponItem } from '@/types/coupon';
import StoreLogo from './StoreLogo';
import { Check, Copy, ExternalLink, Calendar, Sparkles, ShieldCheck } from 'lucide-react';

export interface CouponCardProps {
  coupon: CouponItem;
  className?: string;
}

export default function CouponCard({ coupon, className = '' }: CouponCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenStore = () => {
    if (coupon.affiliate_url) {
      window.open(coupon.affiliate_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Formatação de validade amigável
  const validityText = coupon.expires_at
    ? `Válido até ${new Date(coupon.expires_at).toLocaleDateString('pt-BR')}`
    : 'Válido por tempo limitado';

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/85 bg-white p-4 sm:p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/60 hover:shadow-card-hover dark:border-zinc-800/80 dark:bg-[#121217] dark:hover:border-violet-500/50 ${className}`}
    >
      {/* Top row: Loja + Verified badge */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100/90 pb-3 dark:border-zinc-800/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <StoreLogo storeName={coupon.store} size="sm" className="rounded-lg shadow-xs" />
          <div className="truncate">
            <span className="block text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
              {coupon.store}
            </span>
            {coupon.category && (
              <span className="block text-[10px] font-medium text-slate-400 dark:text-zinc-500 capitalize">
                {coupon.category.replace(/-/g, ' ')}
              </span>
            )}
          </div>
        </div>

        {coupon.verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/50">
            <ShieldCheck className="h-3 w-3" />
            <span>Verificado</span>
          </span>
        )}
      </div>

      {/* Middle: Desconto, Descrição e Regras */}
      <div className="my-3 space-y-1.5 flex-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {coupon.discount_text}
          </span>
        </div>

        <p className="text-xs font-medium text-slate-600 dark:text-zinc-300 line-clamp-2">
          {coupon.description || coupon.rule_text}
        </p>

        <div className="flex items-center gap-1.5 pt-1 text-[11px] font-medium text-slate-400 dark:text-zinc-500">
          <Calendar className="h-3 w-3" />
          <span>{validityText}</span>
        </div>
      </div>

      {/* Bottom: Bloco de Cupom e Ação */}
      <div className="mt-2 pt-3 border-t border-slate-100/90 dark:border-zinc-800/60 space-y-2">
        <div className="flex items-center gap-2">
          {/* Caixa do Código com estilo tracejado */}
          <div className="flex-1 flex items-center justify-between rounded-xl border border-dashed border-violet-400/80 bg-violet-50/60 px-3 py-2 text-xs font-mono font-black text-violet-700 dark:border-violet-600/60 dark:bg-violet-950/30 dark:text-violet-300 select-all">
            <span className="tracking-wider truncate">{coupon.code}</span>
            <button
              type="button"
              onClick={handleCopyCode}
              aria-label={`Copiar código ${coupon.code}`}
              className="p-1 text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-200 rounded-lg hover:bg-violet-200/50 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Botão Copiar Código com feedback */}
          <button
            type="button"
            onClick={handleCopyCode}
            className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 ${
              copied
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/25'
                : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-sm shadow-violet-500/25'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        {/* Link Externo seguro para ir à loja */}
        {coupon.affiliate_url && (
          <a
            href={coupon.affiliate_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400 py-1 transition-colors group/link"
          >
            <span>Usar cupom na {coupon.store}</span>
            <ExternalLink className="h-3 w-3 transition-transform group-hover/link:translate-x-0.5" />
          </a>
        )}
      </div>
    </div>
  );
}
