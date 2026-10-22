'use client';

import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Copy, Check, ExternalLink } from 'lucide-react';

interface AffiliateLinkCheckProps {
  originalLink?: string;
  affiliateLink: string;
  sourceName?: string;
}

export default function AffiliateLinkCheck({
  originalLink,
  affiliateLink,
  sourceName,
}: AffiliateLinkCheckProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-amber-500/15 dark:bg-[#070709]/80">
      {/* Top Badge: Confirmação da Troca Automática */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Link já convertido automaticamente pelo backend</span>
        </div>

        {sourceName && (
          <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
            Origem: <strong>{sourceName}</strong>
          </span>
        )}
      </div>

      {/* Grid de Links: Original -> Afiliado */}
      <div className="grid grid-cols-1 gap-2 text-xs lg:grid-cols-12 lg:items-center">
        {/* Link Original Capturado */}
        <div className="space-y-1 lg:col-span-5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            Link Original (Auditoria):
          </span>
          <div
            className="truncate rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-500 dark:border-white/[0.08] dark:bg-[#111116] dark:text-zinc-400"
            title={originalLink || 'Não informado'}
          >
            {originalLink || 'Link não capturado'}
          </div>
        </div>

        {/* Seta indicativa */}
        <div className="flex justify-center py-1 lg:col-span-1 lg:py-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 dark:bg-amber-500/20">
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Link Afiliado Convertido */}
        <div className="space-y-1 lg:col-span-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Seu Link de Afiliado (Pronto para Uso):
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                title="Copiar link com sua tag"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
              <a
                href={affiliateLink}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500 hover:text-amber-400"
                title="Testar link no navegador"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Testar</span>
              </a>
            </div>
          </div>

          <div
            className="truncate rounded-lg border border-emerald-200 bg-emerald-50/50 px-2.5 py-1.5 font-mono text-[11px] font-medium text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
            title={affiliateLink}
          >
            {affiliateLink}
          </div>
        </div>
      </div>
    </div>
  );
}
