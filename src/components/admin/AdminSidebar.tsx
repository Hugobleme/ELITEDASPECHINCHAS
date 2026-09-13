'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminOffers } from '@/hooks/useAdminOffers';
import {
  Flame,
  LayoutDashboard,
  Inbox,
  BarChart3,
  Radio,
  ExternalLink,
  LogOut,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { data: pendingData } = useAdminOffers({ status: 'pending', limit: 1 });
  const pendingCount = pendingData?.total ?? 0;

  const NAV_ITEMS = [
    {
      label: 'Visão Geral',
      href: '/admin',
      icon: <LayoutDashboard className="h-4 w-4" />,
      exact: true,
    },
    {
      label: 'Fila de Curadoria',
      href: '/admin/ofertas',
      icon: <Inbox className="h-4 w-4" />,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      label: 'Métricas & Gráficos',
      href: '/admin/metricas',
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      label: 'Fontes Telegram',
      href: '/admin/fontes',
      icon: <Radio className="h-4 w-4" />,
    },
  ];

  return (
    <aside className="hidden w-64 flex-col justify-between border-r border-slate-200/80 bg-white p-5 lg:flex dark:border-slate-800 dark:bg-slate-950">
      <div className="space-y-6">
        {/* Logo Admin */}
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-md shadow-orange-500/30">
            <Flame className="h-5 w-5 fill-white stroke-white" />
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
              PROMO<span className="text-orange-500">RADAR</span>
            </span>
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              <ShieldCheck className="h-3 w-3" />
              <span>Painel de Curadoria</span>
            </div>
          </div>
        </div>

        {/* Card de Status da Automação Telegram */}
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 dark:border-emerald-950 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span>Bot Telethon Conectado</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700/90 dark:text-emerald-400/80">
            Links trocados automaticamente para o seu afiliado antes de salvar.
          </p>
        </div>

        {/* Links de Navegação */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      isActive
                        ? 'bg-white text-orange-600'
                        : 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer da Sidebar */}
      <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        {/* Link para Vitrine Pública */}
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-orange-500" />
            <span>Ver Vitrine Pública</span>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
        </Link>

        {/* Usuário e Logout */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="truncate">
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {user?.name || 'Administrador'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">{user?.email || 'admin@promoradar.com.br'}</div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
            title="Sair do painel"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
