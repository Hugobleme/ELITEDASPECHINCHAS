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

  const handleClick = () => {
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
      onClick={handleClick}
      title={`Clique para copiar cupom ${coupon.code} e abrir ${coupon.store}`}
      className={`group relative flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2 sm:p-2.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/80 hover:shadow-md dark:border-zinc-800 dark:bg-[#16161f] dark:hover:border-violet-500/60 cursor-pointer overflow-hidden ${className}`}
      style={{
        // Máscara radial criando o recorte semicircular característico de ticket na borda direita
        WebkitMaskImage:
          'radial-gradient(circle 11px at 100% 50%, transparent 10px, black 10.5px)',
        maskImage:
          'radial-gradient(circle 11px at 100% 50%, transparent 10px, black 10.5px)',
      }}
    >
      {/* Arco de borda do recorte semicircular na borda direita */}
      <svg
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-6 w-3 text-slate-200/90 dark:text-zinc-800"
        viewBox="0 0 12 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 0 C5.37 0 0 5.37 0 12 C0 18.63 5.37 24 12 24"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>

      {/* Borda pontilhada esquerda estilo canhoto perfurado de cupom fiscal/voucher */}
      <div
        className="absolute left-0 top-1.5 bottom-1.5 w-1 border-r-2 border-dotted border-slate-300/80 dark:border-zinc-700/80"
        aria-hidden="true"
      />

      <div className="flex items-center gap-2.5 pl-1.5 min-w-0 flex-1 pr-3">
        {/* Logo da Loja */}
        <div className="relative shrink-0 flex items-center justify-center">
          <StoreLogo
            storeName={coupon.store}
            size="md"
            className="h-9 w-9 rounded-lg shadow-xs"
          />
        </div>

        {/* Textos: Loja, Desconto em destaque e Regra */}
        <div className="flex flex-col min-w-0 justify-center flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-400 truncate leading-tight">
              {coupon.store}
            </span>
            {copied && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                <Check className="h-2.5 w-2.5" />
                <span>Copiado!</span>
              </span>
            )}
          </div>
          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight leading-tight my-0.5">
            {coupon.discount_text}
          </span>
          <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 truncate leading-tight">
            {coupon.rule_text}
          </span>
        </div>
      </div>
    </div>
  );
}
