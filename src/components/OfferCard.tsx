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
import StoreLogo from './StoreLogo';
import { Clock, Truck, ChevronRight } from 'lucide-react';

interface OfferCardProps {
  offer: Offer;
}

function OfferCardComponent({ offer }: OfferCardProps) {
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
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-500/40 hover:shadow-card-hover dark:border-white/[0.08] dark:bg-[#111116] dark:hover:border-amber-500/50 dark:hover:shadow-card-hover-dark">
      {/* Top Header: Store, Temperature & Relative Time */}
      <div className="relative flex items-center justify-between gap-1.5 border-b border-slate-100 px-3.5 py-2.5 dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 dark:bg-[#16161f] dark:text-zinc-200 dark:border dark:border-white/[0.06] truncate max-w-[130px]">
            <StoreLogo storeName={store} size="xs" />
            <span className="truncate">{store}</span>
          </span>
          <TemperatureVote offerId={id} initialTemperature={temperature || 120} size="sm" />
        </div>
        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-zinc-500 shrink-0">
          <Clock className="h-3 w-3" />
          {formatRelativeDate(published_at)}
        </span>
      </div>

      {/* Product Image + Discount Badge */}
      <Link
        href={`/oferta/${id}`}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-50/50 p-4 transition-colors border-b border-slate-100/80 dark:border-white/[0.04] dark:bg-[#0c0c10]"
      >
        {/* Desconto Chamativo Dourado como na tag da logo */}
        {discount_pct > 0 && (
          <div className="absolute left-3 top-3 z-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-2.5 py-1 text-xs font-black tracking-wide text-slate-950 shadow-md shadow-amber-500/30 border border-amber-300/40">
            {formatDiscount(discount_pct)}
          </div>
        )}

        {/* Botão de Favoritar flutuante */}
        <div className="absolute right-3 top-3 z-20">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:bg-white dark:bg-[#16161f]/90 dark:hover:bg-[#20202c] dark:border dark:border-white/[0.1]">
            <FavoriteButton offerId={id} size="sm" />
          </div>
        </div>

        <div className="relative h-full w-full transition-transform duration-300 ease-out group-hover:scale-105">
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
      <div className="flex flex-1 flex-col justify-between p-4 pt-3">
        <div>
          {/* Title */}
          <Link href={`/oferta/${id}`}>
            <h3
              className="line-clamp-2 text-sm font-bold leading-snug text-slate-900 transition-colors group-hover:text-amber-500 dark:text-zinc-100 dark:group-hover:text-amber-400"
              title={title}
            >
              {title}
            </h3>
          </Link>

          {/* Pricing Block */}
          <div className="mt-3 space-y-1">
            {price_original > price_current && (
              <div className="text-xs font-medium text-slate-400 line-through dark:text-zinc-500">
                De {formatBRL(price_original)}
              </div>
            )}
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Por</span>
                <span className="text-xl sm:text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  {formatBRL(price_current)}
                </span>
              </div>
              {free_shipping && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Truck className="h-2.5 w-2.5" />
                  Frete Grátis
                </span>
              )}
            </div>
            {installments && (
              <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                ou {installments}
              </div>
            )}
            {coupon_code && (
              <div className="pt-1.5">
                <CouponBadge code={coupon_code} size="sm" />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-white/[0.06]">
          <Link
            href={`/oferta/${id}`}
            aria-label={`Ver detalhes de ${title}`}
            className="flex items-center justify-center gap-1 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2 text-xs font-bold text-slate-700 transition-all hover:border-amber-300 hover:bg-amber-50/60 hover:text-amber-700 min-h-[42px] active:scale-95 dark:border-white/[0.08] dark:bg-[#16161f] dark:text-zinc-200 dark:hover:border-amber-500/40 dark:hover:bg-[#20202c] dark:hover:text-amber-300"
          >
            <span>Detalhes</span>
            <ChevronRight className="h-3 w-3 opacity-60" />
          </Link>
          <AffiliateButton
            offerId={id}
            affiliateLink={affiliate_link}
            storeName={store}
            variant="card"
            size="sm"
            label="Pegar"
            className="w-full min-h-[42px]"
          />
        </div>
      </div>
    </div>
  );
}

const OfferCard = React.memo(OfferCardComponent);
export default OfferCard;
