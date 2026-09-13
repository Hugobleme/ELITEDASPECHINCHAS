'use client';

import React, { useState } from 'react';
import {
  useAdminOffers,
  useUpdateAdminOffer,
  usePublishAdminOffer,
  useBulkAdminOffers,
} from '@/hooks/useAdminOffers';
import { useStores } from '@/hooks/useTaxonomies';
import { useAdminSources } from '@/hooks/useAdminSources';
import CurationCard from '@/components/admin/CurationCard';
import BulkActionBar from '@/components/admin/BulkActionBar';
import OfferEditModal from '@/components/admin/OfferEditModal';
import { Offer, OfferStatus } from '@/types/offer';
import {
  Inbox,
  Filter,
  Search,
  RotateCcw,
  CheckCircle2,
  Send,
  Trash2,
  Percent,
  Store,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';

export default function AdminOffersPage() {
  const [activeStatus, setActiveStatus] = useState<OfferStatus | 'all'>('pending');
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [minDiscount, setMinDiscount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Seleção múltipla para ações em lote
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  const { data: stores = [] } = useStores();
  const { data: sources = [] } = useAdminSources();

  const { data, isLoading } = useAdminOffers({
    status: activeStatus,
    store: selectedStore,
    source: selectedSource,
    min_discount: minDiscount,
    search: searchQuery,
  });

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
    setSelectedSource('');
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
      {/* Top Banner Explicativo da Curadoria */}
      <div className="rounded-2xl border border-orange-200/80 bg-orange-50/70 p-4 dark:border-orange-950 dark:bg-orange-950/20">
        <div className="flex items-center gap-2 text-xs font-bold text-orange-900 dark:text-orange-300">
          <CheckCircle2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <span>Fila de Curadoria Ativa — Alimentação Automática pelo Telegram</span>
        </div>
        <p className="mt-1 text-xs text-orange-800/90 dark:text-orange-400/90">
          Cada oferta abaixo foi capturada do Telegram e já possui o link substituído automaticamente pela sua tag de afiliado. Aprove ou publique com 1 clique para enviar diretamente à vitrine!
        </p>
      </div>

      {/* Abas por Status */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2 dark:border-slate-800">
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
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex flex-wrap items-center gap-3">
          {/* Busca por título */}
          <div className="relative min-w-[220px]">
            <input
              type="text"
              placeholder="Filtrar por produto ou loja..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Filtro por Loja */}
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            <option value="">Todas as Lojas</option>
            {stores.map((s) => (
              <option key={s.slug} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Filtro por Fonte Telegram */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            <option value="">Todos os Canais Telegram</option>
            {sources.map((src) => (
              <option key={src.id} value={src.name}>
                {src.name}
              </option>
            ))}
          </select>

          {/* Slider de Desconto Mínimo */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
            <Percent className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              Min: {minDiscount}%
            </span>
            <input
              type="range"
              min="0"
              max="70"
              step="5"
              value={minDiscount}
              onChange={(e) => setMinDiscount(Number(e.target.value))}
              className="h-1.5 w-16 cursor-pointer accent-orange-500"
            />
          </div>

          {(selectedStore || selectedSource || minDiscount > 0 || searchQuery) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>

        {/* Seleção em lote */}
        {offers.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              {selectedIds.length === offers.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
            </button>
            <span className="text-xs font-semibold text-slate-400">
              {totalOffers} {totalOffers === 1 ? 'oferta' : 'ofertas'}
            </span>
          </div>
        )}
      </div>

      {/* Lista de Cards de Curadoria */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 w-full animate-pulse rounded-2xl bg-white dark:bg-slate-900" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <Inbox className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-slate-200">
            Nenhuma oferta nesta categoria de status
          </h3>
          <p className="mt-1 text-xs text-slate-400">
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
    </div>
  );
}
