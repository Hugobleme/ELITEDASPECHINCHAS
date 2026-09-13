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

export default function CategoryPage({ params }: CategoryPageProps) {
  const categoryName = formatSlugToName(params.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-orange-600 dark:hover:text-orange-400">
          Início
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <span className="font-semibold text-slate-900 dark:text-slate-200">{categoryName}</span>
      </nav>

      {/* Banner da Categoria */}
      <div className="mb-8 rounded-3xl bg-slate-900 p-6 text-white shadow-lg dark:bg-slate-900/90 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white">
            <Tag className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">Ofertas de {categoryName}</h1>
            <p className="text-xs text-slate-300 sm:text-sm">
              Descontos verificados e preços baixos em {categoryName.toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Cliente interativo com filtros e paginação */}
      <CategoryOffersClient categorySlug={params.slug} categoryName={categoryName} />
    </div>
  );
}
