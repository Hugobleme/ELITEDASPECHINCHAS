'use client';

import React, { useState } from 'react';
import { CouponItem } from '@/types/coupon';
import StoreLogo from './StoreLogo';
import { Check, Copy, ExternalLink } from 'lucide-react';

interface CouponTicketCardProps {
  coupon: CouponItem;
  className?: string;
}

export default function CouponTicketCard({
  coupon,
  className = '',
}: CouponTicketCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenStore = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
    if (coupon.affiliate_url) {
      window.open(coupon.affiliate_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      onClick={handleOpenStore}
      title={`Clique para copiar cupom ${coupon.code} e abrir ${coupon.store}`}
      className={`group relative flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/80 hover:shadow-md dark:border-zinc-800 dark:bg-[#16161f] dark:hover:border-violet-500/60 cursor-pointer overflow-hidden ${className}`}
      style={{
        // Máscara radial criando o recorte semicircular característico de ticket na borda direita
        WebkitMaskImage:
          'radial-gradient(circle 13px at 100% 50%, transparent 12px, black 12.5px)',
        maskImage:
          'radial-gradient(circle 13px at 100% 50%, transparent 12px, black 12.5px)',
      }}
    >
      {/* Arco de borda do recorte semicircular na borda direita */}
      <svg
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-7 w-3.5 text-slate-200/90 dark:text-zinc-800"
        viewBox="0 0 14 28"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M14 0 C6.27 0 0 6.27 0 14 C0 21.73 6.27 28 14 28"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>

      {/* Borda pontilhada esquerda estilo canhoto perfurado de cupom fiscal/voucher */}
      <div
        className="absolute left-0 top-2 bottom-2 w-1 border-r-2 border-dotted border-slate-300/80 dark:border-zinc-700/80"
        aria-hidden="true"
      />

      <div className="flex items-center gap-3 pl-2 min-w-0 flex-1 pr-6">
        {/* Logo da Loja */}
        <div className="relative shrink-0 flex items-center justify-center">
          <StoreLogo
            storeName={coupon.store}
            size="lg"
            className="h-11 w-11 rounded-xl shadow-xs"
          />
        </div>

        {/* Textos: Loja, Desconto em destaque e Regra */}
        <div className="flex flex-col min-w-0 justify-center">
          <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-400 truncate leading-tight">
            {coupon.store}
          </span>
          <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight leading-tight my-0.5">
            {coupon.discount_text}
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 truncate leading-tight">
            {coupon.rule_text}
          </span>
        </div>
      </div>

      {/* Ação de Copiar / Feedback de Sucesso */}
      <div className="shrink-0 mr-1.5 flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Cupom copiado' : `Copiar cupom ${coupon.code}`}
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition-all ${
            copied
              ? 'bg-emerald-500 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-violet-950/60 dark:hover:text-violet-300'
          }`}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              <span>Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span className="font-mono">{coupon.code}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
