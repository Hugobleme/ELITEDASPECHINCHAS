'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useAlerts } from '@/hooks/useAlerts';
import { User, Heart, Bell, Sparkles, LogOut, ChevronDown, UserCheck } from 'lucide-react';
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
        className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm hover:shadow-brand-500/25"
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
        className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-500 to-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
          {initials}
        </div>
        <span className="hidden md:inline-block text-xs font-semibold text-gray-700 dark:text-gray-200 max-w-[90px] truncate">
          {user.name.split(' ')[0]}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Cabeçalho do usuário */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
              {user.name}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
          </div>

          <div className="py-1">
            <Link
              href="/favoritos"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>Meus Favoritos</span>
              </div>
              {favorites.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  {favorites.length}
                </span>
              )}
            </Link>

            <Link
              href="/alertas"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-brand-500" />
                <span>Alertas de Preço</span>
              </div>
              {alerts.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
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
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Personalizar Feed</span>
            </button>
          </div>

          <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left"
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
