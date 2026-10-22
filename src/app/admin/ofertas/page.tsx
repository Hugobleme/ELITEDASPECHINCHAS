'use client';

import React, { useState } from 'react';
import {
  useAdminOffers,
  useCreateAdminOffer,
  useUpdateAdminOffer,
  usePublishAdminOffer,
  useBulkAdminOffers,
} from '@/hooks/useAdminOffers';
import { useStores, useCategories } from '@/hooks/useTaxonomies';
import CurationCard from '@/components/admin/CurationCard';
import BulkActionBar from '@/components/admin/BulkActionBar';
import OfferEditModal from '@/components/admin/OfferEditModal';
import OfferCreateModal from '@/components/admin/OfferCreateModal';
import { Offer, OfferStatus, OfferCreatePayload } from '@/types/offer';
import {
  Inbox,
  Filter,
  Search,
  RotateCcw,
  CheckCircle2,
  PlusCircle,
  Percent,
  Store,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function AdminOffersPage() {
  const [activeStatus, setActiveStatus] = useState<OfferStatus | 'all'>('pending');
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minDiscount, setMinDiscount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Seleção múltipla para ações em lote
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: stores = [] } = useStores();
  const { data: categories = [] } = useCategories();

  const { data, isLoading } = useAdminOffers({
    status: activeStatus,
    store: selectedStore,
    min_discount: minDiscount,
    search: searchQuery,
  });

  const createOffer = useCreateAdminOffer();
  const updateOffer = useUpdateAdminOffer();
  const publishOffer = usePublishAdminOffer();
  const bulkAction = useBulkAdminOffers();

  const offers = data?.items || [];
  const totalOffers = data?.total ?? offers.length;

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === offers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(offers.map((o) => o.id));
    }
  };

  const handleApprove = async (id: string) => {
    await updateOffer.mutateAsync({ id, payload: { status: 'approved' } });
  };

  const handlePublish = async (id: string) => {
    await publishOffer.mutateAsync(id);
  };

  const handleReject = async (id: string) => {
    await updateOffer.mutateAsync({ id, payload: { status: 'rejected' } });
  };

  const handleCreateOffer = async (newOfferData: OfferCreatePayload) => {
    await createOffer.mutateAsync(newOfferData);
  };

  const handleSaveEdit = async (id: string, updatedData: Partial<Offer>) => {
    await updateOffer.mutateAsync({ id, payload: updatedData });
  };

  // Ações em lote
  const handleBulkApprove = async () => {
    await bulkAction.mutateAsync({ ids: selectedIds, action: 'approve' });
    setSelectedIds([]);
  };

  const handleBulkPublish = async () => {
    await bulkAction.mutateAsync({ ids: selectedIds, action: 'publish' });
    setSelectedIds([]);
  };

  const handleBulkReject = async () => {
    await bulkAction.mutateAsync({ ids: selectedIds, action: 'reject' });
    setSelectedIds([]);
  };

  const handleResetFilters = () => {
    setSelectedStore('');
    setSelectedCategory('');
    setMinDiscount(0);
    setSearchQuery('');
  };

  const STATUS_TABS: { label: string; value: OfferStatus | 'all' }[] = [
    { label: 'Pendentes de Curadoria', value: 'pending' },
    { label: 'Aprovadas', value: 'approved' },
    { label: 'Publicadas na Vitrine', value: 'published' },
    { label: 'Rejeitadas', value: 'rejected' },
    { label: 'Todas as Ofertas', value: 'all' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Explicativo da Curadoria com Ação de Nova Oferta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 dark:border-amber-500/20 dark:bg-[#111116]">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-400">
            <CheckCircle2 className="h-4 w-4 text-amber-500" />
            <span>Gestão e Curadoria da Vitrine Web — ELITEDASPECHINCHAS</span>
          </div>
          <p className="mt-1 text-xs text-amber-900/80 dark:text-zinc-400">
            Gerencie o catálogo de ofertas, aprove promoções pendentes, edite detalhes e publique diretamente no site com tags de afiliados automáticas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 px-4 py-2.5 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-300 active:scale-95 transition-all cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Nova Oferta</span>
        </button>
      </div>

      {/* Abas por Status */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2 dark:border-amber-500/15">
        {STATUS_TABS.map((tab) => {
          const isActive = activeStatus === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setActiveStatus(tab.value);
                setSelectedIds([]);
              }}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-white/[0.05]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card md:flex-row md:items-center md:justify-between dark:border-amber-500/15 dark:bg-[#111116]">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Busca por título */}
          <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
            <input
              type="text"
              placeholder="Filtrar por produto ou loja..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200/80 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-medium focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/[0.08] dark:bg-[#070709] dark:text-zinc-100"
            />
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro por Loja */}
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 sm:flex-none dark:border-white/[0.08] dark:bg-[#070709] dark:text-zinc-300"
            >
              <option value="">Todas as Lojas</option>
              {stores.map((s) => (
                <option key={s.slug} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Filtro por Categoria */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 sm:flex-none dark:border-white/[0.08] dark:bg-[#070709] dark:text-zinc-300"
            >
              <option value="">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Slider de Desconto Mínimo */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 dark:border-white/[0.08] dark:bg-[#070709]">
              <Percent className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300">
                Min: {minDiscount}%
              </span>
              <input
                type="range"
                min="0"
                max="70"
                step="5"
                value={minDiscount}
                onChange={(e) => setMinDiscount(Number(e.target.value))}
                className="h-1.5 w-16 cursor-pointer accent-amber-500"
              />
            </div>

            {(selectedStore || selectedCategory || minDiscount > 0 || searchQuery) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-amber-600 hover:text-amber-500 dark:text-amber-400 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Limpar filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Seleção em lote */}
        {offers.length > 0 && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 pt-3 md:border-t-0 md:pt-0 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 dark:border-white/[0.08] dark:bg-[#1a1a26] dark:text-zinc-300 dark:hover:bg-white/[0.05] cursor-pointer"
            >
              {selectedIds.length === offers.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
            </button>
            <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
              {totalOffers} {totalOffers === 1 ? 'oferta' : 'ofertas'}
            </span>
          </div>
        )}
      </div>

      {/* Lista de Cards de Curadoria */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 w-full animate-pulse rounded-2xl bg-white dark:bg-[#111116] border dark:border-amber-500/15" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center dark:border-amber-500/20 dark:bg-[#111116]/60 backdrop-blur-sm">
          <Inbox className="h-12 w-12 text-slate-300 dark:text-zinc-600" />
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">
            Nenhuma oferta nesta categoria de status
          </h3>
          <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">
            Experimente alterar as abas de status ou limpar os filtros de pesquisa.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => (
            <CurationCard
              key={offer.id}
              offer={offer}
              isSelected={selectedIds.includes(offer.id)}
              onToggleSelect={handleToggleSelect}
              onApprove={handleApprove}
              onPublish={handlePublish}
              onReject={handleReject}
              onEdit={setEditingOffer}
              isActionLoading={updateOffer.isPending || publishOffer.isPending}
            />
          ))}
        </div>
      )}

      {/* Barra de Ações em Lote (Flutuante) */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onApproveAll={handleBulkApprove}
        onPublishAll={handleBulkPublish}
        onRejectAll={handleBulkReject}
        onClearSelection={() => setSelectedIds([])}
        isLoading={bulkAction.isPending}
      />

      {/* Modal de Edição */}
      <OfferEditModal
        offer={editingOffer}
        isOpen={!!editingOffer}
        onClose={() => setEditingOffer(null)}
        onSave={handleSaveEdit}
        isSaving={updateOffer.isPending}
      />

      {/* Modal de Criação Manual de Ofertas */}
      <OfferCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateOffer}
        isCreating={createOffer.isPending}
      />
    </div>
  );
}
