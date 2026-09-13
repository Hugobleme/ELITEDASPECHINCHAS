'use client';

import React from 'react';
import { useAdminSources, useToggleAdminSource } from '@/hooks/useAdminSources';
import SourceToggle from '@/components/admin/SourceToggle';
import { Radio, ShieldCheck, Zap, Info, Plus, MessageSquare } from 'lucide-react';

export default function AdminSourcesPage() {
  const { data: sources = [], isLoading } = useAdminSources();
  const toggleSource = useToggleAdminSource();

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await toggleSource.mutateAsync({ id, is_active: !currentStatus });
  };

  const activeCount = sources.filter((s) => s.is_active).length;
  const totalCaptured = sources.reduce((acc, s) => acc + s.total_captured, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Grupos-Fonte Monitorados no Telegram
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Canais autorizados que alimentam automaticamente o sistema através do userbot Telethon.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {activeCount} de {sources.length} ativos
            </span>
          </div>
        </div>
      </div>

      {/* Explicação da Arquitetura de Alimentação Automática */}
      <div className="rounded-3xl border border-blue-200/80 bg-blue-50/70 p-6 dark:border-blue-950 dark:bg-blue-950/20">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Zap className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-blue-950 dark:text-blue-200">
              Como funciona o fluxo de dados em tempo real:
            </h3>
            <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-blue-900/90 dark:text-blue-300/90">
              <li>
                <strong>Captura:</strong> O bot Python em segundo plano escuta cada nova mensagem enviada nos canais ativos abaixo.
              </li>
              <li>
                <strong>Parser & Troca de Afiliado:</strong> O link da loja é identificado e <strong>substituído automaticamente</strong> pelo seu link de afiliado oficial. O link original fica salvo apenas para conferência no admin.
              </li>
              <li>
                <strong>Gravação no Banco:</strong> A oferta é inserida com status <code className="font-mono font-bold">pending</code> e aparece instantaneamente na sua Fila de Curadoria para aprovação em 1 clique.
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Grid de Canais / Grupos */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Canais Cadastrados ({sources.length})
          </h3>
          <span className="text-xs font-medium text-slate-400">
            Total capturado acumulado: <strong>{totalCaptured} ofertas</strong>
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-white dark:bg-slate-900" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sources.map((source) => (
              <SourceToggle
                key={source.id}
                source={source}
                onToggle={handleToggle}
                isLoading={toggleSource.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Requisitos para adicionar nova fonte */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-violet-500" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Como adicionar novos grupos-fonte?
          </h4>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Para adicionar um novo canal do Telegram ao monitoramento, adicione o identificador do canal no arquivo de configuração do seu script Python Telethon e registre a rota no backend FastAPI. O painel web detectará automaticamente o novo grupo e passará a exibir as promoções recebidas na fila de curadoria.
        </p>
      </div>
    </div>
  );
}
