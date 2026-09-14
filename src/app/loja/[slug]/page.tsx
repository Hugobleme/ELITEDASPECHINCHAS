import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { formatSlugToName } from '@/lib/formatters';
import StoreOffersClient from './StoreOffersClient';
import StoreLogo from '@/components/StoreLogo';
import { ChevronRight, ExternalLink, ShieldCheck } from 'lucide-react';

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

// Mapeamento de links oficiais conhecidos
const STORE_OFFICIAL_URLS: Record<string, string> = {
  amazon: 'https://www.amazon.com.br',
  'mercado-livre': 'https://www.mercadolivre.com.br',
  kabum: 'https://www.kabum.com.br',
  magalu: 'https://www.magazineluiza.com.br',
  shopee: 'https://www.shopee.com.br',
  samsung: 'https://www.samsung.com/br',
  'casas-bahia': 'https://www.casasbahia.com.br',
};

export default function StorePage({ params }: StorePageProps) {
  const storeName = formatSlugToName(params.slug);
  const storeUrl = STORE_OFFICIAL_URLS[params.slug.toLowerCase()] || `https://www.${params.slug}.com.br`;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Início',
        item: 'https://elitedaspechinchas.com.br/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Lojas',
        item: 'https://elitedaspechinchas.com.br/',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: storeName,
        item: `https://elitedaspechinchas.com.br/loja/${params.slug}`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
          Início
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <span className="font-semibold text-slate-900 dark:text-slate-200">{storeName}</span>
      </nav>

      {/* Banner da Loja com Logo e Link Oficial */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-850 p-6 sm:p-8 text-white shadow-card">
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <StoreLogo
              storeName={storeName}
              size="lg"
              className="h-16 w-16 rounded-2xl shadow-lg shrink-0 border border-white/10"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  Loja Parceira Verificada
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">
                Ofertas na {storeName}
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm mt-0.5">
                Descontos monitorados e cupons ativos para economizar na {storeName}
              </p>
            </div>
          </div>

          {/* Botão para visitar a loja oficial com target="_blank" rel="noopener noreferrer" */}
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white px-5 py-3 text-xs sm:text-sm font-bold border border-white/20 transition-all hover:scale-105 active:scale-95 shrink-0 min-h-[44px]"
          >
            <span>Visitar {storeName}</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Cliente interativo com cupons da loja, filtros e paginação */}
      <StoreOffersClient storeSlug={params.slug} storeName={storeName} />
    </div>
  );
}
