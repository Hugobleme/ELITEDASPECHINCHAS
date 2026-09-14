import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { formatSlugToName } from '@/lib/formatters';
import CategoryOffersClient from './CategoryOffersClient';
import { ChevronRight, Tag } from 'lucide-react';

interface CategoryPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const categoryName = formatSlugToName(params.slug);
  return {
    title: `Ofertas de ${categoryName} com Desconto — Elite das Pechinchas`,
    description: `As melhores promoções e cupons de desconto para ${categoryName}. Economize nas principais lojas com a Elite das Pechinchas.`,
  };
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  eletronicos: 'Smartphones, smartwatches, fones bluetooth e gadgets com os melhores descontos do dia.',
  informatica: 'Notebooks, monitores, peças de hardware e periféricos para seu setup de trabalho ou estudos.',
  games: 'Consoles PlayStation, Xbox, Nintendo Switch, jogos e acessórios gamers com preço reduzido.',
  'casa-e-cozinha': 'Air fryers, eletrodomésticos, panelas e utilidades para transformar seu lar economizando.',
  'tv-e-audio': 'Smart TVs 4K, soundbars, caixas de som e fones com som de alta fidelidade e preço baixo.',
  'moda-e-calcados': 'Roupas, tênis de corrida, calçados casuais e acessórios das marcas mais desejadas.',
  'beleza-e-saude': 'Perfumes importados, dermocosméticos, cuidados pessoais e suplementação.',
};

export default function CategoryPage({ params }: CategoryPageProps) {
  const categoryName = formatSlugToName(params.slug);
  const description =
    CATEGORY_DESCRIPTIONS[params.slug.toLowerCase()] ||
    `Descontos verificados, cupons e preços baixos em produtos selecionados da categoria ${categoryName.toLowerCase()}.`;

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
        name: 'Categorias',
        item: 'https://elitedaspechinchas.com.br/',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: categoryName,
        item: `https://elitedaspechinchas.com.br/categoria/${params.slug}`,
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
        <span className="font-semibold text-slate-900 dark:text-slate-200">{categoryName}</span>
      </nav>

      {/* Banner da Categoria */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-850 p-6 sm:p-8 text-white shadow-card">
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-glow-brand">
              <Tag className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-bold text-violet-300">
                  Categoria Oficial
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black mt-0.5 tracking-tight">Ofertas de {categoryName}</h1>
              <p className="text-xs text-slate-400 sm:text-sm mt-0.5 max-w-xl leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cliente interativo com filtros e paginação */}
      <CategoryOffersClient categorySlug={params.slug} categoryName={categoryName} />
    </div>
  );
}
