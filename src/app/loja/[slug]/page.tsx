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
    title: `Promoções e Cupons na ${storeName} — PromoRadar`,
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
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">Ofertas na {storeName}</h1>
            <p className="text-xs text-slate-300 sm:text-sm">
              Promoções selecionadas e links oficiais da {storeName}
            </p>
          </div>
        </div>
      </div>

      {/* Cliente interativo com filtros e paginação */}
      <StoreOffersClient storeSlug={params.slug} storeName={storeName} />
    </div>
  );
}
