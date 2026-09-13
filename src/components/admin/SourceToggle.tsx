'use client';

import React from 'react';
import { TelegramSource } from '@/types/admin';
import { formatRelativeDate } from '@/lib/formatters';
import { MessageSquare, ExternalLink, Activity, CheckCircle2, PauseCircle } from 'lucide-react';

interface SourceToggleProps {
  source: TelegramSource;
  onToggle: (id: string, currentStatus: boolean) => void;
  isLoading?: boolean;
}

export default function SourceToggle({ source, onToggle, isLoading = false }: SourceToggleProps) {
  const { id, name, channel_username, is_active, total_captured, last_activity_at, description } =
    source;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900/90">
      <div>
        {/* Header do Grupo */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                is_active
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{name}</h4>
              <a
                href={`https://t.me/${channel_username.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                <span>{channel_username}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={is_active}
            disabled={isLoading}
            onClick={() => onToggle(id, is_active)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50 ${
              is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                is_active ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {description && (
          <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>

      {/* Estatísticas do Canal */}
      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
        <div>
          <span className="text-[11px] font-medium text-slate-400">Ofertas Capturadas</span>
          <div className="font-extrabold text-slate-800 dark:text-slate-200">
            {total_captured} promoções
          </div>
        </div>

        <div>
          <span className="text-[11px] font-medium text-slate-400">Última Atividade</span>
          <div className="font-semibold text-slate-800 dark:text-slate-200">
            {formatRelativeDate(last_activity_at)}
          </div>
        </div>
      </div>

      {/* Status Footer */}
      <div className="mt-3 flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {is_active ? (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600 dark:text-emerald-400">Monitorando ativamente</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-slate-500">Monitoramento pausado</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
