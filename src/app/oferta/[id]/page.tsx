import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getOfferById, getOffers } from '@/lib/api';
import { formatBRL, formatDiscount, formatRelativeDate, formatSavings } from '@/lib/formatters';
import ImageWithFallback from '@/components/ImageWithFallback';
import AffiliateButton from '@/components/AffiliateButton';
import ShareButton from '@/components/ShareButton';
import OfferCard from '@/components/OfferCard';
import { OfferDetailActions } from '@/components/user/OfferDetailActions';
import {
  Clock,
  ShieldCheck,
  Tag,
  ChevronRight,
  TrendingDown,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface OfferPageProps {
  params: {
    id: string;
  };
}

/**
 * Geração de Metadata Dinâmica para SEO
 */
export async function generateMetadata({ params }: OfferPageProps): Promise<Metadata> {
  const offer = await getOfferById(params.id);

  if (!offer) {
    return {
      title: 'Oferta não encontrada — PromoRadar',
      description: 'A oferta solicitada não está disponível ou já expirou.',
    };
  }

  const discountText = offer.discount_pct > 0 ? `[${offer.discount_pct}% OFF] ` : '';
  const title = `${discountText}${offer.title} por ${formatBRL(offer.price_current)} na ${offer.store} — PromoRadar`;
  const description = `Compre ${offer.title} por apenas ${formatBRL(offer.price_current)} na ${offer.store}. Desconto verificado com economia real no PromoRadar.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: offer.image_url ? [{ url: offer.image_url }] : [],
      type: 'article',
      publishedTime: offer.published_at || undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: offer.image_url ? [offer.image_url] : [],
    },
  };
}

export default async function OfferDetailPage({ params }: OfferPageProps) {
  const offer = await getOfferById(params.id);

  if (!offer) {
    notFound();
  }

  // Busca ofertas relacionadas da mesma categoria
  const relatedResponse = await getOffers({
    category: offer.category,
    limit: 4,
  });
  const relatedOffers = relatedResponse.items.filter((item) => item.id !== offer.id).slice(0, 4);

  const savings = formatSavings(offer.price_original, offer.price_current);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Breadcrumb de Navegação */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-orange-600 dark:hover:text-orange-400">
          Início
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <Link
          href={`/categoria/${offer.category}`}
          className="capitalize hover:text-orange-600 dark:hover:text-orange-400"
        >
          {offer.category.replace(/-/g, ' ')}
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <span className="line-clamp-1 max-w-[200px] text-slate-800 sm:max-w-md dark:text-slate-200">
          {offer.title}
        </span>
      </nav>

      {/* Main Container da Oferta */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900/90">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Lado Esquerdo: Imagem do Produto */}
          <div className="flex flex-col items-center lg:col-span-6">
            <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-inner dark:bg-slate-950">
              {/* Badge OFF chamativo */}
              {offer.discount_pct > 0 && (
                <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-xl bg-red-600 px-3 py-1.5 text-sm font-black text-white shadow-lg shadow-red-500/30">
                  <TrendingDown className="h-4 w-4 stroke-[3]" />
                  <span>{formatDiscount(offer.discount_pct)}</span>
                </div>
              )}

              <ImageWithFallback
                src={offer.image_url}
                alt={offer.title}
                fill
                priority
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>

          {/* Lado Direito: Informações, Preços e Botões */}
          <div className="flex flex-col justify-between lg:col-span-6">
            <div className="space-y-4">
              {/* Loja e Data */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <Link
                  href={`/loja/${encodeURIComponent(offer.store.toLowerCase().replace(/\s+/g, '-'))}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-400"
                >
                  <Tag className="h-3.5 w-3.5" />
                  <span>Vendido por {offer.store}</span>
                </Link>

                <div className="flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Publicado {formatRelativeDate(offer.published_at)}</span>
                </div>
              </div>

              {/* Título Principal */}
              <h1 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl lg:text-3xl dark:text-white">
                {offer.title}
              </h1>

              {/* Bloco de Preços */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 dark:border-emerald-950/40 dark:bg-emerald-950/10">
                {offer.price_original > offer.price_current && (
                  <div className="text-sm font-medium text-slate-400 line-through dark:text-slate-500">
                    De {formatBRL(offer.price_original)}
                  </div>
                )}

                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Por</span>
                  <span className="text-3xl font-black tracking-tight text-emerald-600 sm:text-4xl dark:text-emerald-400">
                    {formatBRL(offer.price_current)}
                  </span>
                  {savings && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                      Economize {savings}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  *Preço e condições verificados na publicação. Sujeito à alteração pela loja sem aviso prévio.
                </p>
              </div>

              {/* Reassurance da Loja */}
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>
                  Link seguro e verificado. Você será redirecionado para a página oficial da <strong>{offer.store}</strong>.
                </span>
              </div>
            </div>

            {/* Ações: Botão de Compra e Compartilhar */}
            <div className="mt-8 space-y-3">
              <AffiliateButton
                offerId={offer.id}
                affiliateLink={offer.affiliate_link}
                storeName={offer.store}
                size="lg"
                variant="primary"
                label={`Pegar Promoção na ${offer.store}`}
                className="w-full"
              />

              <OfferDetailActions offer={offer} />
            </div>
          </div>
        </div>
      </div>

      {/* Ofertas Relacionadas */}
      {relatedOffers.length > 0 && (
        <section className="mt-14 space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Mais Ofertas em {offer.category.replace(/-/g, ' ')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedOffers.map((item) => (
              <OfferCard key={item.id} offer={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
