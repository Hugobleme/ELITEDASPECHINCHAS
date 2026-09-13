'use client';

import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';

export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Confira essa oferta: ${title}`,
          url,
        });
        return;
      } catch {
        // Ignora cancelamento pelo usuário
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      title="Compartilhar ou copiar link da promoção"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400">Link Copiado!</span>
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span>Compartilhar Oferta</span>
        </>
      )}
    </button>
  );
}
