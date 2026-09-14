'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Flame,
  Search,
  X,
  Heart,
  Bell,
  Ticket,
  Menu,
  Home,
  Tag,
  Store,
  ChevronRight,
} from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: favorites = [] } = useFavorites();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/95 transition-colors">
      {/* Top Navbar */}
      <div className="mx-auto max-w-7xl px-3 py-2.5 sm:px-6 sm:py-3">
        {/* Row 1: Logo & Actions on Mobile, or Inline with Search on Desktop */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Hamburger Menu on Mobile (< 768px) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            aria-expanded={isMobileMenuOpen}
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-fuchsia-500 text-white shadow-md shadow-violet-500/25 transition-transform duration-200 group-hover:scale-105">
              <Flame className="h-5 w-5 sm:h-6 sm:w-6 fill-white stroke-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                ELITEDAS<span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">PECHINCHAS</span>
              </span>
              <span className="hidden text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:block">
                Promoções e cupons verificados
              </span>
            </div>
          </Link>

          {/* Search Bar - Inline on desktop (md: and up) */}
          <form
            onSubmit={handleSearchSubmit}
            role="search"
            className="hidden md:block relative max-w-lg flex-1 sm:mx-4"
          >
            <div className="relative flex items-center">
              <input
                type="text"
                id="header-search-desktop"
                aria-label="Buscar promoções e cupons"
                placeholder="Buscar produtos, marcas, celulares, tvs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-100/90 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-800 transition-all placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/15 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-900"
              />
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Limpar busca"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Link de Cupons no Desktop */}
            <Link
              href="/cupons"
              title="Cupons de Desconto Verificados"
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 border border-slate-200/80 dark:border-zinc-800 transition-colors min-h-[44px]"
            >
              <Ticket className="w-4 h-4 text-red-500" />
              <span>Cupons</span>
            </Link>

            {/* Favoritos com touch target >= 44x44px */}
            <Link
              href="/favoritos"
              title="Meus Favoritos"
              aria-label="Meus Favoritos"
              className="relative p-2 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-slate-850 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              <Heart className="w-5 h-5" />
              {favorites.length > 0 && (
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
              )}
            </Link>

            {/* Alertas com touch target >= 44x44px */}
            <Link
              href="/alertas"
              title="Meus Alertas de Preço"
              aria-label="Meus Alertas de Preço"
              className="p-2 rounded-xl text-slate-500 hover:text-violet-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-violet-400 dark:hover:bg-slate-850 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              <Bell className="w-5 h-5" />
            </Link>

            <ThemeToggle />

            <div className="h-5 w-[1px] bg-slate-200 dark:border-slate-800 dark:bg-slate-800 mx-0.5 hidden xs:block" />

            <UserMenu />
          </div>
        </div>

        {/* Search Bar - Full-width dedicated Mobile Row */}
        <div className="md:hidden pt-2.5">
          <form onSubmit={handleSearchSubmit} role="search" className="relative w-full">
            <div className="relative flex items-center">
              <input
                type="text"
                id="header-search-mobile"
                aria-label="Buscar promoções e cupons"
                placeholder="Buscar promoções, celulares, tvs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-100/90 py-2.5 pl-10 pr-10 text-sm sm:text-base font-medium text-slate-800 transition-all placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/15 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-900"
              />
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Limpar busca"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/80 bg-white/95 px-4 py-4 dark:border-slate-800/80 dark:bg-slate-950/95 shadow-xl transition-all">
          <nav aria-label="Navegação Mobile" className="flex flex-col space-y-1">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Home className="h-4 w-4 text-violet-500" />
                <span>Página Inicial</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/cupons"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Ticket className="h-4 w-4 text-red-500" />
                <span>Cupons de Desconto</span>
              </div>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-950/50 dark:text-red-400">
                Novos
              </span>
            </Link>

            <Link
              href="/favoritos"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Heart className="h-4 w-4 text-rose-500" />
                <span>Meus Favoritos</span>
              </div>
              {favorites.length > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                  {favorites.length}
                </span>
              )}
            </Link>

            <Link
              href="/alertas"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-violet-500" />
                <span>Alertas de Preço</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          </nav>
        </div>
      )}

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
