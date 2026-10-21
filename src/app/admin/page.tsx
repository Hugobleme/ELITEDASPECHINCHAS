'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';
import {
  useAdminOffers,
  useUpdateAdminOffer,
  usePublishAdminOffer,
} from '@/hooks/useAdminOffers';
import MetricCard from '@/components/admin/MetricCard';
import CurationCard from '@/components/admin/CurationCard';
import OfferEditModal from '@/components/admin/OfferEditModal';
import { Offer } from '@/types/offer';
import {
  Inbox,
  Send,
  MousePointerClick,
  CheckCircle2,
  ArrowRight,
  Radio,
  Sparkles,
  Store,
  ShieldCheck,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { data: metrics, isLoading: metricsLoading } = useAdminMetrics('7d');
  const { data: pendingData, isLoading: offersLoading } = useAdminOffers({
    status: 'pending',
    limit: 4,
  });

  const updateOffer = useUpdateAdminOffer();
  const publishOffer = usePublishAdminOffer();

  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  const pendingOffers = pendingData?.items || [];
  const pendingCount = metrics?.total_pending ?? pendingData?.total ?? 0;

  const handleApprove = async (id: string) => {
    await updateOffer.mutateAsync({ id, payload: { status: 'approved' } });
  };

  const handlePublish = async (id: string) => {
    await publishOffer.mutateAsync(id);
  };

  const handleReject = async (id: string) => {
    await updateOffer.mutateAsync({ id, payload: { status: 'rejected' } });
  };

  const handleSaveEdit = async (id: string, updatedData: Partial<Offer>) => {
    await updateOffer.mutateAsync({ id, payload: updatedData });
  };

  return (
    <div className="space-y-8">
      {/* Banner de Boas-Vindas & Status da Automação */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-r from-violet-950 via-[#0f0c1e] to-[#07060d] p-6 text-white shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative z-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-bold text-violet-300 backdrop-blur-md border border-violet-500/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Catálogo & Vitrine Web Ativos</span>
            </div>
            <h2 className="text-xl font-black sm:text-2xl lg:text-3xl tracking-tight">
              Central de Curadoria & Métricas
            </h2>
            <p className="text-xs text-slate-300 sm:text-sm">
              Gerencie ofertas, cupons e métricas da vitrine pública com links de afiliados oficiais.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/ofertas"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-fuchsia-500 hover:scale-105 active:scale-95"
            >
              <Inbox className="h-4 w-4" />
              <span>Revisar Fila ({pendingCount})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Ofertas Pendentes"
          value={metricsLoading ? '...' : pendingCount}
          subtitle="Aguardando curadoria"
          icon={<Inbox className="h-5 w-5" />}
          colorScheme="purple"
          href="/admin/ofertas"
        />

        <MetricCard
          title="Publicadas Hoje"
          value={metricsLoading ? '...' : metrics?.published_today ?? 18}
          subtitle="Ativas na vitrine"
          icon={<Send className="h-5 w-5" />}
          colorScheme="emerald"
          trend={{ value: '+24% vs ontem', isPositive: true }}
        />

        <MetricCard
          title="Cliques na Semana"
          value={metricsLoading ? '...' : (metrics?.clicks_week ?? 3420).toLocaleString('pt-BR')}
          subtitle="Nos botões de compra"
          icon={<MousePointerClick className="h-5 w-5" />}
          colorScheme="blue"
          trend={{ value: '+12% semanal', isPositive: true }}
          href="/admin/metricas"
        />

        <MetricCard
          title="Taxa de Aprovação"
          value={metricsLoading ? '...' : `${metrics?.approval_rate_pct ?? 84}%`}
          subtitle="Qualidade das fontes"
          icon={<CheckCircle2 className="h-5 w-5" />}
          colorScheme="purple"
        />
      </div>

      {/* Seção Principal: Fila Rápida + Top Lojas */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Fila Rápida de Curadoria */}
        <div className="space-y-4 lg:col-span-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Fila de Curadoria Recente
              </h3>
              <span className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-black text-violet-600 dark:bg-violet-950 dark:text-violet-400">
                {pendingCount}
              </span>
            </div>

            <Link
              href="/admin/ofertas"
              className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400"
            >
              <span>Ver todas</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {offersLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-36 w-full animate-pulse rounded-2xl bg-white dark:bg-[#13131b]"
                />
              ))}
            </div>
          ) : pendingOffers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-white/[0.1] dark:bg-[#13131b]/60 backdrop-blur-sm">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <h4 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                Fila de curadoria zerada!
              </h4>
              <p className="mt-1 text-xs text-slate-400">
                Todas as ofertas capturadas já foram aprovadas ou publicadas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingOffers.map((offer) => (
                <CurationCard
                  key={offer.id}
                  offer={offer}
                  isSelected={false}
                  onToggleSelect={() => {}}
                  onApprove={handleApprove}
                  onPublish={handlePublish}
                  onReject={handleReject}
                  onEdit={setEditingOffer}
                  isActionLoading={updateOffer.isPending || publishOffer.isPending}
                />
              ))}
            </div>
          )}
        </div>

        {/* Coluna Direita: Top Lojas & Status das Fontes */}
        <div className="space-y-6 lg:col-span-4">
          {/* Top Lojas */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-card dark:border-white/[0.08] dark:bg-[#13131b]">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-white/[0.06]">
              <Store className="h-4 w-4 text-violet-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Top Lojas em Volume
              </h4>
            </div>

            <div className="mt-4 space-y-3">
              {(metrics?.offers_by_store || []).map((item) => (
                <div key={item.store} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">
                    {item.store}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-[#0c0c14]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                        style={{ width: `${Math.min(100, (item.count / 60) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-black text-slate-900 dark:text-white">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ações Rápidas do Painel */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-card dark:border-white/[0.08] dark:bg-[#13131b]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Ações Rápidas
                </h4>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <Link
                href="/admin/ofertas"
                className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 hover:bg-slate-100 dark:bg-[#0c0c14] dark:hover:bg-white/[0.05] transition-colors"
              >
                <span className="font-bold text-slate-800 dark:text-zinc-200">Gerenciar Ofertas</span>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-extrabold text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                  Acessar
                </span>
              </Link>
              <Link
                href="/"
                target="_blank"
                className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 hover:bg-slate-100 dark:bg-[#0c0c14] dark:hover:bg-white/[0.05] transition-colors"
              >
                <span className="font-bold text-slate-800 dark:text-zinc-200">Ver Vitrine Pública</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Abrir ↗
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Edição */}
      <OfferEditModal
        offer={editingOffer}
        isOpen={!!editingOffer}
        onClose={() => setEditingOffer(null)}
        onSave={handleSaveEdit}
        isSaving={updateOffer.isPending}
      />
    </div>
  );
}
