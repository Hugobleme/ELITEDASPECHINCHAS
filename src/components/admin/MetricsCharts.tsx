'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { AdminMetrics } from '@/types/admin';
import { TrendingUp, Store, Tag, PieChart as PieIcon } from 'lucide-react';

interface MetricsChartsProps {
  metrics: AdminMetrics;
}

export default function MetricsCharts({ metrics }: MetricsChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 1. Cliques por Dia (Linha) */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cliques nos Links de Afiliado por Dia
            </h3>
          </div>
          <span className="text-xs font-black text-orange-600 dark:text-orange-400">
            {metrics.clicks_week.toLocaleString('pt-BR')} cliques
          </span>
        </div>

        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics.clicks_by_day} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [`${value} cliques`, 'Total']}
              />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#f97316"
                strokeWidth={3}
                dot={{ r: 4, fill: '#f97316' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Taxa de Aprovação vs Rejeição (Donut / Pizza) */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <PieIcon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Taxa de Aprovação da Curadoria
            </h3>
          </div>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
            {metrics.approval_rate_pct}% aprovadas
          </span>
        </div>

        <div className="mt-4 flex h-64 w-full items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={metrics.status_distribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={5}
                dataKey="count"
              >
                {metrics.status_distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Ofertas por Loja (Barras) */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Store className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Volume de Ofertas por Loja
            </h3>
          </div>
        </div>

        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.offers_by_store} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="store" tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [`${value} ofertas`, 'Volume']}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Ofertas por Categoria (Barras Horizontais / Verticais) */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <Tag className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Distribuição por Categoria
            </h3>
          </div>
        </div>

        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.offers_by_category} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="category" tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis tickLine={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [`${value} produtos`, 'Volume']}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
