'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import {
  Menu,
  X,
  Flame,
  LayoutDashboard,
  Inbox,
  BarChart3,
  Radio,
  ExternalLink,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAdminOffers } from '@/hooks/useAdminOffers';

interface AdminHeaderProps {
  title?: string;
}

export default function AdminHeader({ title }: AdminHeaderProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: pendingData } = useAdminOffers({ status: 'pending', limit: 1 });
  const pendingCount = pendingData?.total ?? 0;

  const getPageTitle = () => {
    if (title) return title;
    if (pathname === '/admin') return 'Visão Geral & Métricas';
    if (pathname.startsWith('/admin/ofertas')) return 'Fila de Curadoria';
    if (pathname.startsWith('/admin/metricas')) return 'Métricas de Engajamento';
    if (pathname.startsWith('/admin/fontes')) return 'Fontes do Telegram';
    return 'Painel Administrativo';
  };

  const NAV_ITEMS = [
    { label: 'Visão Geral', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
    {
      label: 'Fila de Curadoria',
      href: '/admin/ofertas',
      icon: <Inbox className="h-4 w-4" />,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { label: 'Métricas', href: '/admin/metricas', icon: <BarChart3 className="h-4 w-4" /> },
    { label: 'Fontes Telegram', href: '/admin/fontes', icon: <Radio className="h-4 w-4" /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6 dark:border-slate-800 dark:bg-slate-950/90">
        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden dark:border-slate-800 dark:text-slate-300"
            aria-label="Abrir menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div>
            <h1 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 sm:flex dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Alimentação Automática Ativa</span>
          </div>

          <ThemeToggle />

          <button
            type="button"
            onClick={logout}
            className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            title="Sair do painel"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="relative flex h-full w-72 flex-col justify-between bg-white p-5 shadow-2xl dark:bg-slate-950">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white">
                    <Flame className="h-4 w-4 fill-white stroke-white" />
                  </div>
                  <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                    PROMO<span className="text-orange-500">RADAR</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold ${
                      pathname === item.href
                        ? 'bg-orange-500 text-white'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-600 dark:bg-orange-950">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Link
                href="/"
                target="_blank"
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <span>Ver Vitrine Pública</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-2.5 text-xs font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair do Painel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
