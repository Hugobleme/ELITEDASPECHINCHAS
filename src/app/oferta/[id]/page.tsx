import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getOfferById, getOffers } from '@/lib/api';
import { formatBRL, formatDiscount, formatRelativeDate, formatSavings } from '@/lib/formatters';
import ImageWithFallback from '@/components/ImageWithFallback';
import AffiliateButton from '@/components/AffiliateButton';
import OfferCard from '@/components/OfferCard';
import CouponBadge from '@/components/CouponBadge';
import TemperatureVote from '@/components/TemperatureVote';
import { OfferDetailActions } from '@/components/user/OfferDetailActions';
import {
  Clock,
  ShieldCheck,
  Tag,
  ChevronRight,
  TrendingDown,
  Sparkles,
  Truck,
  CheckCircle2,
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
      title: 'Oferta não encontrada — Elite das Pechinchas',
      description: 'A oferta solicitada não está disponível ou já expirou.',
    };
  }

  const discountText = offer.discount_pct > 0 ? `[${offer.discount_pct}% OFF] ` : '';
  const title = `${discountText}${offer.title} por ${formatBRL(offer.price_current)} na ${offer.store} — Elite das Pechinchas`;
  const description = `Compre ${offer.title} por apenas ${formatBRL(offer.price_current)} na ${offer.store}. Desconto verificado com economia real na Elite das Pechinchas.`;

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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: offer.title,
    image: offer.image_url,
    description: `Compre ${offer.title} com desconto verificado na ${offer.store}.`,
    offers: {
      '@type': 'Offer',
      price: offer.price_current,
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      url: offer.affiliate_link,
      seller: {
        '@type': 'Organization',
        name: offer.store,
      },
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 pb-32 sm:pb-8">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb de Navegação */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
          Início
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <Link
          href={`/categoria/${offer.category}`}
          className="capitalize hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
        >
          {offer.category.replace(/-/g, ' ')}
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <span className="line-clamp-1 max-w-[200px] text-slate-800 sm:max-w-md dark:text-slate-200">
          {offer.title}
        </span>
      </nav>

      {/* Main Container da Oferta */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-card sm:p-8 md:p-10 dark:border-slate-800 dark:bg-slate-900/95">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Lado Esquerdo: Imagem do Produto */}
          <div className="flex flex-col items-center lg:col-span-6">
            <div className="relative aspect-square w-full max-w-lg overflow-hidden rounded-2xl bg-white p-6 shadow-inner border border-slate-100 dark:border-slate-800/80 dark:bg-slate-925">
              {/* Badge OFF chamativo */}
              {offer.discount_pct > 0 && (
                <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600 px-3 py-1.5 text-sm font-black text-white shadow-lg shadow-fuchsia-500/30">
                  <TrendingDown className="h-4 w-4 stroke-[3]" />
                  <span>{formatDiscount(offer.discount_pct)}</span>
                </div>
              )}

              <ImageWithFallback
                src={offer.image_url}
                alt={offer.title}
                fill
                priority
                className="object-contain transition-transform duration-300 hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>

          {/* Lado Direito: Informações, Preços e Botões */}
          <div className="flex flex-col justify-between lg:col-span-6">
            <div className="space-y-4">
              {/* Loja, Temperatura e Data */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/loja/${encodeURIComponent(offer.store.toLowerCase().replace(/\s+/g, '-'))}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1 text-xs font-bold text-violet-600 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-400 transition-colors"
                  >
                    <Tag className="h-3.5 w-3.5" />
                    <span>Vendido por {offer.store}</span>
                  </Link>
                  <TemperatureVote offerId={offer.id} initialTemperature={offer.temperature || 180} />
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Publicado {formatRelativeDate(offer.published_at)}</span>
                </div>
              </div>

              {/* Título Principal */}
              <h1 className="text-xl font-black leading-snug text-slate-900 sm:text-2xl lg:text-3xl dark:text-white">
                {offer.title}
              </h1>

              {/* Bloco de Preços */}
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-5 dark:border-emerald-950/50 dark:from-emerald-950/20 dark:to-teal-950/10 shadow-sm">
                {offer.price_original > offer.price_current && (
                  <div className="text-sm font-semibold text-slate-400 line-through dark:text-slate-500">
                    De {formatBRL(offer.price_original)}
                  </div>
                )}

                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Por
                  </span>
                  <span className="text-3xl font-black tracking-tight text-emerald-600 sm:text-4xl dark:text-emerald-400">
                    {formatBRL(offer.price_current)}
                  </span>
                  {savings && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                      Economize {savings}
                    </span>
                  )}
                  {offer.free_shipping && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-3 py-1 text-xs font-bold shadow-sm">
                      <Truck className="h-3.5 w-3.5" />
                      Frete Grátis
                    </span>
                  )}
                </div>

                {offer.installments && (
                  <p className="mt-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    ou {offer.installments}
                  </p>
                )}

                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-t border-emerald-100/80 dark:border-emerald-950/40 pt-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Preço e estoque verificados na curadoria. Sujeito à alteração pela loja.</span>
                </div>
              </div>

              {/* Cupom em Destaque Especial */}
              {offer.coupon_code && (
                <CouponBadge code={offer.coupon_code} size="lg" />
              )}

              {/* Reassurance da Loja */}
              <div className="flex items-center gap-2.5 rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 border border-slate-100 dark:border-slate-800/80">
                <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                <span>
                  Link direto e seguro. Você será redirecionado para a página oficial da loja <strong>{offer.store}</strong>.
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
                className="w-full text-base"
              />

              <OfferDetailActions offer={offer} />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar on Mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 p-3.5 px-4 pb-safe shadow-2xl flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold text-slate-400 uppercase">Preço com Desconto</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {formatBRL(offer.price_current)}
          </span>
        </div>
        <AffiliateButton
          offerId={offer.id}
          affiliateLink={offer.affiliate_link}
          storeName={offer.store}
          size="md"
          variant="primary"
          label={`Pegar na ${offer.store}`}
          className="shrink-0 min-h-[42px]"
        />
      </div>

      {/* Ofertas Relacionadas */}
      {relatedOffers.length > 0 && (
        <section className="mt-14 space-y-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 dark:bg-violet-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
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
