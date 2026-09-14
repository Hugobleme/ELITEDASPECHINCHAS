'use client';

import React from 'react';
import Link from 'next/link';
import StoreLogo from './StoreLogo';
import { StoreItem } from '@/types/offer';
import { ChevronRight, Sparkles } from 'lucide-react';

export interface StoreCardProps {
  store: StoreItem;
  className?: string;
}

export default function StoreCard({ store, className = '' }: StoreCardProps) {
  return (
    <Link
      href={`/loja/${store.slug}`}
      className={`group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/60 hover:shadow-card-hover dark:border-zinc-800/80 dark:bg-[#121217] dark:hover:border-violet-500/50 ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <StoreLogo
          storeName={store.name}
          size="md"
          className="rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105"
        />
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-400 transition-colors truncate">
            {store.name}
          </h3>
          <p className="text-xs font-medium text-slate-400 dark:text-zinc-500">
            {store.count ? `${store.count} ofertas ativas` : 'Ofertas verificadas'}
          </p>
        </div>
      </div>

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-all duration-200 group-hover:bg-violet-600 group-hover:text-white dark:bg-zinc-800 dark:text-zinc-400">
        <ChevronRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
