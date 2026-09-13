'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Flame, Search, X, Heart, Bell } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import CategoryChips from './CategoryChips';
import { UserMenu } from './user/UserMenu';
import { useFavorites } from '@/hooks/useFavorites';

interface HeaderProps {
  showCategorySubbar?: boolean;
}

export default function Header({ showCategorySubbar = true }: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: favorites = [] } = useFavorites();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90 transition-colors">
      {/* Top Navbar */}
      <div className="mx-auto max-w-7xl px-3 py-2.5 sm:px-6 sm:py-3">
        {/* Row 1: Logo & Actions on Mobile, or Inline with Search on Desktop */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 text-white shadow-md shadow-orange-500/25 transition-transform duration-200 group-hover:scale-105">
              <Flame className="h-5 w-5 sm:h-6 sm:w-6 fill-white stroke-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                ELITEDAS<span className="text-orange-500">PECHINCHAS</span>
              </span>
              <span className="hidden text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:block">
                Promoções e cupons verificados
              </span>
            </div>
          </Link>

          {/* Search Bar - Inline on tablet & desktop (sm: and up) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden sm:block relative max-w-lg flex-1 sm:mx-4"
          >
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Buscar produtos, marcas, celulares..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-100/90 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-800 transition-all placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/15 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-500 dark:focus:bg-slate-900"
              />
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Limpar busca"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link
              href="/favoritos"
              title="Meus Favoritos"
              aria-label="Meus Favoritos"
              className="relative p-2 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-slate-850 transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center"
            >
              <Heart className="w-5 h-5" />
              {favorites.length > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
              )}
            </Link>

            <Link
              href="/alertas"
              title="Meus Alertas de Preço"
              aria-label="Meus Alertas de Preço"
              className="p-2 rounded-xl text-slate-500 hover:text-orange-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-orange-400 dark:hover:bg-slate-850 transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center"
            >
              <Bell className="w-5 h-5" />
            </Link>

            <ThemeToggle />

            <div className="h-5 w-[1px] bg-slate-200 dark:border-slate-800 dark:bg-slate-800 mx-0.5 hidden xs:block" />

            <UserMenu />
          </div>
        </div>

        {/* Search Bar - Full-width dedicated Mobile Row */}
        <div className="sm:hidden pt-2.5">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Buscar produtos, marcas, celulares..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-100/90 py-2.5 pl-10 pr-10 text-base font-medium text-slate-800 transition-all placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/15 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-500 dark:focus:bg-slate-900"
              />
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Limpar busca"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Categories Subbar */}
      {showCategorySubbar && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 dark:border-slate-800/60 dark:bg-slate-900/40 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <CategoryChips />
          </div>
        </div>
      )}
    </header>
  );
}
