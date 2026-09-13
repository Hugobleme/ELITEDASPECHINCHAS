'use client';

import React from 'react';
import { Offer } from '@/types/offer';
import { formatBRL, formatDiscount, formatRelativeDate } from '@/lib/formatters';
import ImageWithFallback from '@/components/ImageWithFallback';
import AffiliateLinkCheck from './AffiliateLinkCheck';
import {
  Check,
  Send,
  Trash2,
  Edit3,
  Clock,
  SendHorizontal,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

interface CurationCardProps {
  offer: Offer;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onPublish: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (offer: Offer) => void;
  isActionLoading?: boolean;
}

export default function CurationCard({
  offer,
  isSelected,
  onToggleSelect,
  onApprove,
  onPublish,
  onReject,
  onEdit,
  isActionLoading = false,
}: CurationCardProps) {
  const {
    id,
    title,
    price_current,
    price_original,
    discount_pct,
    store,
    category,
    image_url,
    original_link,
    affiliate_link,
    telegram_msg_id,
    source_name,
    created_at,
    status,
  } = offer;

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 dark:bg-slate-900/90 ${
        isSelected
          ? 'border-orange-500 ring-2 ring-orange-500/20 dark:border-orange-500'
          : 'border-slate-200/80 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Bar: Checkbox + Origem Telegram + Data de Captura */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(id)}
            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-orange-500 accent-orange-500 focus:ring-orange-500"
          />

          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {store}
          </span>

          {source_name && (
            <span className="hidden items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 sm:inline-flex dark:bg-blue-950/40 dark:text-blue-300">
              <MessageSquare className="h-3 w-3" />
              <span>{source_name}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatRelativeDate(created_at)}</span>
        </div>
      </div>

      {/* Meio: Preview do Produto */}
      <div className="my-4 grid grid-cols-1 gap-4 sm:grid-cols-12">
        {/* Imagem com badge OFF */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-50 p-2 sm:col-span-3 sm:aspect-square dark:bg-slate-950">
          {discount_pct > 0 && (
            <span className="absolute left-2 top-2 z-10 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-black text-white shadow">
              {formatDiscount(discount_pct)}
            </span>
          )}
          <ImageWithFallback src={image_url} alt={title} fill className="object-contain p-2" />
        </div>

        {/* Informações de Título e Preço */}
        <div className="flex flex-col justify-between sm:col-span-9">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              {category}
            </span>
            <h4 className="mt-0.5 text-sm font-bold leading-snug text-slate-900 dark:text-white line-clamp-2">
              {title}
            </h4>

            <div className="mt-2.5 flex items-baseline gap-2">
              {price_original > price_current && (
                <span className="text-xs font-medium text-slate-400 line-through">
                  De {formatBRL(price_original)}
                </span>
              )}
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                Por {formatBRL(price_current)}
              </span>
            </div>
          </div>

          {/* Auditoria de Troca Automática de Link */}
          <div className="mt-3">
            <AffiliateLinkCheck
              originalLink={original_link}
              affiliateLink={affiliate_link}
              sourceName={source_name}
            />
          </div>
        </div>
      </div>

      {/* Barra Inferior de Ações em 1 Clique */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(offer)}
            disabled={isActionLoading}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Edit3 className="h-3.5 w-3.5 text-slate-400" />
            <span>Editar</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Rejeitar */}
          <button
            type="button"
            onClick={() => onReject(id)}
            disabled={isActionLoading}
            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
            title="Rejeitar e remover da fila"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Rejeitar</span>
          </button>

          {/* Aprovar (Move para approved) */}
          <button
            type="button"
            onClick={() => onApprove(id)}
            disabled={isActionLoading}
            className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            title="Aprovar promoção"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Aprovar</span>
          </button>

          {/* Publicar Imediatamente */}
          <button
            type="button"
            onClick={() => onPublish(id)}
            disabled={isActionLoading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-1.5 text-xs font-extrabold text-white shadow-sm shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-50"
            title="Publicar na vitrine agora"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Publicar Agora</span>
          </button>
        </div>
      </div>
    </div>
  );
}
