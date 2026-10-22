'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useAlerts } from '@/hooks/useAlerts';
import { User, Heart, Bell, Sparkles, LogOut, ChevronDown } from 'lucide-react';
import { UserPreferencesModal } from './UserPreferencesModal';

export function UserMenu() {
  const { user, isAuthenticated, openAuthModal, logout } = useUserAuth();
  const { data: favorites = [] } = useFavorites();
  const { data: alerts = [] } = useAlerts();

  const [isOpen, setIsOpen] = useState(false);
  const [isPrefOpen, setIsPrefOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal('login')}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-black rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 transition-all shadow-md shadow-amber-500/25 border border-amber-300/40 active:scale-95 cursor-pointer"
      >
        <User className="w-4 h-4" />
        <span>Entrar</span>
      </button>
    );
  }

  // Gera iniciais do nome
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-3 rounded-full border border-slate-200/90 dark:border-amber-500/20 bg-white dark:bg-[#111116] hover:bg-slate-50 dark:hover:bg-[#16161f] transition-all shadow-sm cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm">
          {initials}
        </div>
        <span className="hidden md:inline-block text-xs font-bold text-slate-800 dark:text-zinc-100 max-w-[100px] truncate">
          {user.name.split(' ')[0]}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-64 bg-white/95 dark:bg-[#111116]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-amber-500/20 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Cabeçalho do usuário */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-white/[0.06]">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {user.name}
            </p>
            <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 truncate">
              {user.email}
            </p>
          </div>

          <div className="py-1.5 space-y-0.5">
            <Link
              href="/favoritos"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100/80 dark:hover:bg-[#16161f] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>Meus Favoritos</span>
              </div>
              {favorites.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  {favorites.length}
                </span>
              )}
            </Link>

            <Link
              href="/alertas"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100/80 dark:hover:bg-[#16161f] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>Alertas de Preço</span>
              </div>
              {alerts.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                  {alerts.length}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsPrefOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100/80 dark:hover:bg-[#1a1a26] transition-colors text-left cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Personalizar Feed</span>
            </button>
          </div>

          <div className="pt-1.5 border-t border-slate-100 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      )}

      <UserPreferencesModal
        isOpen={isPrefOpen}
        onClose={() => setIsPrefOpen(false)}
      />
    </div>
  );
}
