'use client';

import React, { useState } from 'react';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';
import { formatBRL } from '@/lib/formatters';
import ImageWithFallback from '@/components/ImageWithFallback';
import dynamic from 'next/dynamic';

const MetricsCharts = dynamic(() => import('@/components/admin/MetricsCharts'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-72 animate-pulse rounded-3xl bg-white dark:bg-slate-900" />
      ))}
    </div>
  ),
});
import {
  BarChart3,
  TrendingUp,
  MousePointerClick,
  Store,
  Tag,
  PieChart as PieIcon,
  ExternalLink,
  Calendar,
} from 'lucide-react';

const COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

export default function AdminMetricsPage() {
  const [range, setRange] = useState('7d');
  const { data: metrics, isLoading } = useAdminMetrics(range);

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-3xl bg-white dark:bg-slate-900" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header com Seletor de Período */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Métricas de Conversão & Engajamento
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe o tráfego gerado nos links de afiliado e o desempenho da curadoria.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setRange('7d')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              range === '7d'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            onClick={() => setRange('30d')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              range === '30d'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Últimos 30 dias
          </button>
        </div>
      </div>

      {/* Grid de Gráficos (Code-Split Sob Demanda) */}
      <MetricsCharts metrics={metrics} />

      {/* Tabela: Top 10 Ofertas Mais Clicadas */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-orange-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Top Ofertas Mais Clicadas (Mais Populares)
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">Ordenado por interesse</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                <th className="pb-3 pl-2">Posição</th>
                <th className="pb-3">Produto</th>
                <th className="pb-3">Loja</th>
                <th className="pb-3">Preço Atual</th>
                <th className="pb-3 text-right pr-4">Total de Cliques</th>
                <th className="pb-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {metrics.top_clicked_offers.map((offer, index) => (
                <tr key={offer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 pl-2 font-extrabold text-orange-600 dark:text-orange-400">
                    #{index + 1}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-50 p-1 dark:bg-slate-950">
                        <ImageWithFallback src={offer.image_url} alt={offer.title} fill className="object-contain" />
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 max-w-sm">
                        {offer.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {offer.store}
                    </span>
                  </td>
                  <td className="py-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatBRL(offer.price_current)}
                  </td>
                  <td className="py-3 text-right pr-4 font-black text-slate-900 dark:text-white">
                    {offer.click_count} cliques
                  </td>
                  <td className="py-3 text-right">
                    <a
                      href={offer.affiliate_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline dark:text-orange-400"
                    >
                      <span>Abrir</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
