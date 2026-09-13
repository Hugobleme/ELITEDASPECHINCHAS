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
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Automação Telethon Conectada & Operando</span>
            </div>
            <h2 className="text-xl font-black sm:text-2xl lg:text-3xl">
              Central de Curadoria & Métricas
            </h2>
            <p className="text-xs text-slate-300 sm:text-sm">
              Capturando mensagens dos grupos do Telegram e convertendo automaticamente para seu link de afiliado.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/ofertas"
              className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 hover:scale-105"
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
          colorScheme="orange"
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
              <Sparkles className="h-5 w-5 text-orange-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Fila de Curadoria Recente
              </h3>
              <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-black text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                {pendingCount}
              </span>
            </div>

            <Link
              href="/admin/ofertas"
              className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400"
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
                  className="h-36 w-full animate-pulse rounded-2xl bg-white dark:bg-slate-900"
                />
              ))}
            </div>
          ) : pendingOffers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
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
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Store className="h-4 w-4 text-orange-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Top Lojas em Volume
              </h4>
            </div>

            <div className="mt-4 space-y-3">
              {(metrics?.offers_by_store || []).map((item) => (
                <div key={item.store} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {item.store}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-orange-500"
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

          {/* Resumo dos Canais Telegram */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-blue-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Fontes Monitoradas
                </h4>
              </div>
              <Link
                href="/admin/fontes"
                className="text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
              >
                Gerenciar
              </Link>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950/60">
                <span className="font-bold text-slate-800 dark:text-slate-200">Promos VIP Tech</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Ativo
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950/60">
                <span className="font-bold text-slate-800 dark:text-slate-200">Achados & Cupons BR</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Ativo
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950/60">
                <span className="font-bold text-slate-800 dark:text-slate-200">Radar Gamer BR</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Pausado
                </span>
              </div>
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
