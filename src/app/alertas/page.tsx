'use client';

import React from 'react';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { useAlerts, useDeleteAlert } from '@/hooks/useAlerts';
import { usePriceAlertModal } from '@/contexts/PriceAlertModalContext';
import { Bell, Plus, Trash2, Tag, Store, Sliders, Calendar, Sparkles, LogIn, Loader2 } from 'lucide-react';
import { formatRelativeDate } from '@/lib/formatters';

export default function AlertasPage() {
  const { isAuthenticated, openAuthModal, isLoading: isAuthLoading } = useUserAuth();
  const { data: alerts = [], isLoading: isAlertsLoading } = useAlerts();
  const deleteAlertMutation = useDeleteAlert();
  const { openAlertModal } = usePriceAlertModal();

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir este alerta de preço?')) {
      deleteAlertMutation.mutate(id);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 dark:bg-brand-500/20">
              <Bell className="h-5 w-5 fill-brand-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Meus Alertas de Preço
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Você será notificado imediatamente no seu navegador sempre que uma nova promoção atingir seus critérios.
          </p>
        </div>

        {isAuthenticated && (
          <button
            type="button"
            onClick={() => openAlertModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-brand-500/25 transition-all w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Novo Alerta</span>
          </button>
        )}
      </div>

      {/* Não Autenticado */}
      {!isAuthenticated && !isAuthLoading && (
        <div className="mx-auto max-w-md my-12 p-8 text-center rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/90 shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-500">
            <Bell className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Acompanhe Alertas de Preço
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Crie sua conta ou entre para programar alertas de marcas, categorias ou produtos específicos.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-md hover:shadow-brand-500/25 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>Fazer Login ou Cadastrar</span>
          </button>
        </div>
      )}

      {/* Loading */}
      {(isAuthLoading || (isAuthenticated && isAlertsLoading)) && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200/60 dark:border-slate-700/60"
            />
          ))}
        </div>
      )}

      {/* Vazio (Logado mas sem alertas) */}
      {isAuthenticated && !isAlertsLoading && alerts.length === 0 && (
        <div className="mx-auto max-w-md my-12 p-8 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
            <Bell className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
            Nenhum alerta cadastrado
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Defina palavras-chave, categorias ou lojas para ser notificado assim que uma pechincha surgir!
          </p>
          <button
            type="button"
            onClick={() => openAlertModal()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Meu Primeiro Alerta</span>
          </button>
        </div>
      )}

      {/* Lista de Alertas Ativos */}
      {isAuthenticated && !isAlertsLoading && alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/90 shadow-sm hover:border-brand-300 dark:hover:border-brand-500/40 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500 dark:bg-brand-500/20 font-bold text-xs">
                      <Bell className="w-3.5 h-3.5" />
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {alert.keyword ? `"${alert.keyword}"` : 'Qualquer produto'}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(alert.id)}
                    disabled={deleteAlertMutation.isPending}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Excluir alerta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Filtros do Alerta */}
                <div className="flex flex-wrap gap-2 text-xs mb-3">
                  {alert.category && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                      <Tag className="w-3 h-3 text-slate-400" />
                      {alert.category}
                    </span>
                  )}
                  {alert.store && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                      <Store className="w-3 h-3 text-slate-400" />
                      {alert.store}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold">
                    <Sliders className="w-3 h-3" />
                    ≥ {alert.target_discount}% OFF
                  </span>
                </div>
              </div>

              {/* Rodapé com data */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Criado {formatRelativeDate(alert.created_at)}</span>
                </div>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ativo
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
