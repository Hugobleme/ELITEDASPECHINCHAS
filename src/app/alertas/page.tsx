'use client';

import React from 'react';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { useAlerts, useDeleteAlert } from '@/hooks/useAlerts';
import { usePriceAlertModal } from '@/contexts/PriceAlertModalContext';
import { Bell, Plus, Trash2, Tag, Store, Percent, LogIn } from 'lucide-react';

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
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500 dark:bg-violet-500/20 shadow-sm">
              <Bell className="h-5 w-5 fill-violet-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Meus Alertas de Preço
            </h1>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            Você será notificado imediatamente no seu navegador sempre que uma nova promoção atingir seus critérios.
          </p>
        </div>

        {isAuthenticated && (
          <button
            type="button"
            onClick={() => openAlertModal()}
            className="w-full sm:w-fit inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-violet-500/25 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Novo Alerta</span>
          </button>
        )}
      </div>

      {/* Não Autenticado */}
      {!isAuthenticated && !isAuthLoading && (
        <div className="mx-auto max-w-md my-12 p-8 text-center rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/90 shadow-card">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-500 shadow-inner">
            <Bell className="h-8 w-8 fill-current" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Acompanhe Alertas de Preço
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Crie sua conta ou entre para programar alertas de marcas, categorias ou produtos específicos.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-sm shadow-md shadow-violet-500/25 transition-all cursor-pointer active:scale-95"
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
              className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse border border-slate-200/60 dark:border-slate-800"
            />
          ))}
        </div>
      )}

      {/* Vazio (Logado mas sem alertas) */}
      {isAuthenticated && !isAlertsLoading && alerts.length === 0 && (
        <div className="mx-auto max-w-md my-12 p-8 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <Bell className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5">
            Nenhum alerta cadastrado
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Defina palavras-chave, categorias ou lojas para ser notificado assim que uma pechincha surgir!
          </p>
          <button
            type="button"
            onClick={() => openAlertModal()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-violet-500/25 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
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
              className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/95 shadow-card hover:border-violet-300 dark:hover:border-violet-500/40 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 dark:bg-violet-500/20 font-bold text-xs">
                      <Bell className="w-4 h-4 fill-current" />
                    </span>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      {alert.keyword ? `"${alert.keyword}"` : 'Qualquer produto'}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(alert.id)}
                    disabled={deleteAlertMutation.isPending}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Excluir alerta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Filtros do Alerta */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300 text-xs font-bold border border-fuchsia-200/60 dark:border-fuchsia-900/40">
                    <Percent className="w-3 h-3" />
                    {alert.target_discount}% OFF ou mais
                  </span>

                  {alert.store && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                      <Store className="w-3 h-3" />
                      {alert.store}
                    </span>
                  )}

                  {alert.category && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold capitalize">
                      <Tag className="w-3 h-3" />
                      {alert.category.replace(/-/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
