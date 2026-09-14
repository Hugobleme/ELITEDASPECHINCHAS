import React from 'react';
import Link from 'next/link';
import { Flame, ArrowLeft, Ticket, Sparkles, Search } from 'lucide-react';
import { MOCK_CATEGORIES } from '@/lib/mock-data';

export default function NotFound() {
  const topCategories = MOCK_CATEGORIES.filter((c) => c.slug !== 'todas').slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 text-center">
      <div className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-tr from-violet-600/20 via-purple-600/20 to-fuchsia-600/20 text-violet-600 dark:text-violet-400 border border-violet-500/30 shadow-2xl shadow-violet-500/10">
        <div className="pointer-events-none absolute -inset-4 rounded-full bg-violet-600/20 blur-2xl" />
        <span className="text-4xl sm:text-5xl font-black tracking-tighter">404</span>
      </div>

      <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
        Pechincha não encontrada!
      </h1>

      <p className="mx-auto max-w-lg text-sm sm:text-base text-slate-500 dark:text-zinc-400 mb-8 leading-relaxed">
        A oferta ou página que você está procurando pode ter expirado, o estoque da loja parceira acabou, ou o endereço digitado mudou.
      </p>

      {/* Ações Rápidas */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-lg active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar ao Início</span>
        </Link>

        <Link
          href="/cupons"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer"
        >
          <Ticket className="h-4 w-4 text-violet-500" />
          <span>Explorar Cupons Verificados</span>
        </Link>
      </div>

      {/* Categorias Sugeridas */}
      <div className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-6 sm:p-8 dark:border-zinc-800/80 dark:bg-zinc-900/40">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
            Categorias em Destaque
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {topCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categoria/${cat.slug}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-violet-400 hover:text-violet-600 dark:border-zinc-800 dark:bg-zinc-850 dark:text-zinc-300 dark:hover:border-violet-500 transition-colors"
            >
              <span>{cat.name}</span>
              {cat.count && (
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">({cat.count})</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
