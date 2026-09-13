'use client';

import React from 'react';
import Link from 'next/link';
import { Offer } from '@/types/offer';
import { formatBRL, formatDiscount, formatRelativeDate } from '@/lib/formatters';
import ImageWithFallback from './ImageWithFallback';
import AffiliateButton from './AffiliateButton';
import { FavoriteButton } from './user/FavoriteButton';
import CouponBadge from './CouponBadge';
import TemperatureVote from './TemperatureVote';
import { Clock, ExternalLink, Truck } from 'lucide-react';

interface OfferCardProps {
  offer: Offer;
}

export default function OfferCard({ offer }: OfferCardProps) {
  const {
    id,
    title,
    price_current,
    price_original,
    discount_pct,
    store,
    image_url,
    affiliate_link,
    published_at,
    coupon_code,
    installments,
    free_shipping,
    temperature,
  } = offer;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-card-hover dark:border-slate-800/80 dark:bg-slate-900/90 dark:hover:border-orange-500/40 dark:hover:shadow-card-hover-dark">
      {/* Top Header: Store, Temperature & Relative Time */}
      <div className="relative flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {store}
          </span>
          <TemperatureVote offerId={id} initialTemperature={temperature || 120} size="sm" />
        </div>
        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
          <Clock className="h-3 w-3" />
          {formatRelativeDate(published_at)}
        </span>
      </div>

      {/* Product Image + Discount Badge */}
      <Link href={`/oferta/${id}`} className="relative block aspect-[4/3] w-full overflow-hidden bg-white p-4 dark:bg-slate-900">
        {/* Desconto Chamativo no canto (estilo Pechinchou) */}
        {discount_pct > 0 && (
          <div className="absolute left-3 top-3 z-10 flex items-center justify-center rounded-lg bg-red-600 px-2.5 py-1 text-xs font-black tracking-wide text-white shadow-md shadow-red-500/30">
            {formatDiscount(discount_pct)}
          </div>
        )}

        {/* Botão de Favoritar flutuante */}
        <div className="absolute right-3 top-3 z-20">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-all hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-800">
            <FavoriteButton offerId={id} size="sm" />
          </div>
        </div>

        <div className="relative h-full w-full transition-transform duration-300 group-hover:scale-105">
          <ImageWithFallback
            src={image_url}
            alt={title}
            fill
            className="object-contain"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
      </Link>

      {/* Details & Pricing */}
      <div className="flex flex-1 flex-col justify-between p-4 pt-2">
        <div>
          {/* Title */}
          <Link href={`/oferta/${id}`}>
            <h3
              className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800 transition-colors hover:text-orange-600 dark:text-slate-200 dark:hover:text-orange-400"
              title={title}
            >
              {title}
            </h3>
          </Link>

          {/* Pricing Block */}
          <div className="mt-2.5 space-y-1">
            {price_original > price_current && (
              <div className="text-xs font-medium text-slate-400 line-through dark:text-slate-500">
                De {formatBRL(price_original)}
              </div>
            )}
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Por</span>
                <span className="text-xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {formatBRL(price_current)}
                </span>
              </div>
              {free_shipping && (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Truck className="h-2.5 w-2.5" />
                  Frete Grátis
                </span>
              )}
            </div>
            {installments && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                ou {installments}
              </div>
            )}
            {coupon_code && (
              <div className="pt-1">
                <CouponBadge code={coupon_code} size="sm" />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href={`/oferta/${id}`}
            className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Ver Detalhes
          </Link>
          <AffiliateButton
            offerId={id}
            affiliateLink={affiliate_link}
            storeName={store}
            variant="card"
            size="sm"
            label="Pegar"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
