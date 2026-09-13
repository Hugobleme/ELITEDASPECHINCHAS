import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { formatSlugToName } from '@/lib/formatters';
import StoreOffersClient from './StoreOffersClient';
import { ChevronRight, Store } from 'lucide-react';

interface StorePageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const storeName = formatSlugToName(params.slug);
  return {
    title: `Promoções e Cupons na ${storeName} — Elite das Pechinchas`,
    description: `Confira as melhores ofertas e cupons verificados para economizar em suas compras na ${storeName}.`,
  };
}

export default function StorePage({ params }: StorePageProps) {
  const storeName = formatSlugToName(params.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-orange-600 dark:hover:text-orange-400">
          Início
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <span className="font-semibold text-slate-900 dark:text-slate-200">{storeName}</span>
      </nav>

      {/* Banner da Loja */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-850 p-5 sm:p-8 text-white shadow-card">
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-glow-brand">
              <Store className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-orange-500/20 px-2.5 py-0.5 text-[11px] font-bold text-orange-400">
                  Loja Parceira Verificada
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black mt-0.5 tracking-tight">Ofertas na {storeName}</h1>
              <p className="text-xs text-slate-400 sm:text-sm mt-0.5">
                Promoções selecionadas e links oficiais da {storeName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cliente interativo com filtros e paginação */}
      <StoreOffersClient storeSlug={params.slug} storeName={storeName} />
    </div>
  );
}
