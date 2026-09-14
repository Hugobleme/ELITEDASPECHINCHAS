'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { useAlerts, useDeleteAlert, useCreateAlert } from '@/hooks/useAlerts';
import { mockStore } from '@/lib/api/mock-store';
import { MOCK_CATEGORIES, MOCK_STORES } from '@/lib/mock-data';
import { PriceAlertItem } from '@/types/user';
import {
  Bell,
  Plus,
  Trash2,
  Tag,
  Store,
  Percent,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Search,
} from 'lucide-react';

export default function AlertasPage() {
  const { isAuthenticated, openAuthModal, isLoading: isAuthLoading } = useUserAuth();
  const { data: serverAlerts = [], isLoading: isAlertsLoading } = useAlerts();
  const deleteAlertMutation = useDeleteAlert();
  const createAlertMutation = useCreateAlert();

  // Estado local para criação de alertas inline
  const [keyword, setKeyword] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [targetDiscount, setTargetDiscount] = useState(20);
  const [guestAlerts, setGuestAlerts] = useState<PriceAlertItem[]>([...mockStore.alerts]);
  const [successMessage, setSuccessMessage] = useState('');

  const activeAlerts = isAuthenticated ? serverAlerts : guestAlerts;
  const isLoading = isAuthLoading || (isAuthenticated && isAlertsLoading);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() && !selectedCategory && !selectedStore) {
      alert('Informe ao menos uma palavra-chave, categoria ou loja.');
      return;
    }

    const newAlertData = {
      keyword: keyword.trim() || undefined,
      store: selectedStore || undefined,
      category: selectedCategory || undefined,
      target_discount: targetDiscount,
    };

    if (isAuthenticated) {
      await createAlertMutation.mutateAsync(newAlertData);
    } else {
      const createdItem: PriceAlertItem = {
        id: `guest_alt_${Date.now()}`,
        user_id: 'guest_user',
        keyword: newAlertData.keyword,
        store: newAlertData.store,
        category: newAlertData.category,
        target_discount: newAlertData.target_discount,
        active: true,
        created_at: new Date().toISOString(),
      };
      setGuestAlerts((prev) => [createdItem, ...prev]);
      mockStore.alerts.unshift(createdItem);
    }

    setSuccessMessage('Alerta de preço cadastrado com sucesso!');
    setKeyword('');
    setSelectedStore('');
    setSelectedCategory('');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir este alerta de preço?')) {
      if (isAuthenticated) {
        deleteAlertMutation.mutate(id);
      } else {
        setGuestAlerts((prev) => prev.filter((a) => a.id !== id));
        mockStore.alerts = mockStore.alerts.filter((a) => a.id !== id);
      }
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
          Início
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <span className="font-semibold text-slate-900 dark:text-slate-200">Alertas de Preço</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800/80">
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
            Cadastre termos e seja notificado quando surgir uma promoção abaixo do preço de mercado.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-900/50 text-xs font-bold text-violet-700 dark:text-violet-300 w-fit">
          <Bell className="h-3.5 w-3.5 fill-current" />
          <span>{activeAlerts.length} {activeAlerts.length === 1 ? 'alerta ativo' : 'alertas ativos'}</span>
        </div>
      </div>

      {/* Formulário Inline de Criação de Alerta */}
      <div className="rounded-3xl border border-slate-200/85 bg-white p-6 sm:p-8 shadow-card dark:border-zinc-800 dark:bg-[#121217]">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white text-xs font-bold">
            <Plus className="h-4 w-4" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            Criar Novo Alerta de Preço
          </h2>
        </div>

        {successMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleCreateAlert} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Palavra-chave */}
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="alert-keyword" className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                Palavra-chave do produto
              </label>
              <div className="relative">
                <input
                  id="alert-keyword"
                  type="text"
                  placeholder="Ex: PlayStation 5, Galaxy S24, Air Fryer..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 min-h-[44px]"
                />
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Loja */}
            <div className="space-y-1.5">
              <label htmlFor="alert-store" className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                Loja específica
              </label>
              <select
                id="alert-store"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs sm:text-sm font-bold text-slate-700 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 min-h-[44px]"
              >
                <option value="">Todas as Lojas</option>
                {MOCK_STORES.map((s) => (
                  <option key={s.slug} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
              <label htmlFor="alert-category" className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                Categoria
              </label>
              <select
                id="alert-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs sm:text-sm font-bold text-slate-700 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 min-h-[44px]"
              >
                <option value="">Todas as Categorias</option>
                {MOCK_CATEGORIES.filter((c) => c.slug !== 'todas').map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Desconto Mínimo & Botão Salvar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-3">
              <label htmlFor="alert-discount" className="text-xs font-bold text-slate-700 dark:text-zinc-300 shrink-0">
                Desconto mínimo desejado:
              </label>
              <div className="flex items-center gap-1.5">
                {[10, 20, 30, 40, 50].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTargetDiscount(val)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
                      targetDiscount === val
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={createAlertMutation.isPending}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-violet-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Salvar Alerta de Preço</span>
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Alertas Ativos */}
      <div className="space-y-4">
        <h2 className="text-base font-black text-slate-900 dark:text-white">
          Alertas Ativos Monitorados
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-slate-100 dark:bg-zinc-850 animate-pulse border border-slate-200/60 dark:border-zinc-800"
              />
            ))}
          </div>
        ) : activeAlerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-200/80 bg-white dark:border-zinc-800 dark:bg-[#121217] shadow-card hover:border-violet-300 dark:hover:border-violet-500/40 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 dark:bg-violet-500/20 font-bold text-xs">
                        <Bell className="w-4 h-4 fill-current" />
                      </span>
                      <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                        {alert.keyword ? `"${alert.keyword}"` : 'Qualquer produto'}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(alert.id)}
                      aria-label="Excluir alerta"
                      className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold">
                        <Store className="w-3 h-3" />
                        {alert.store}
                      </span>
                    )}

                    {alert.category && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold capitalize">
                        <Tag className="w-3 h-3" />
                        {alert.category.replace(/-/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800 p-8 text-center bg-white/60 dark:bg-zinc-900/40">
            <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">
              Nenhum alerta cadastrado no momento.
            </p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
              Utilize o formulário acima para criar seu primeiro alerta e monitorar ofertas automaticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
