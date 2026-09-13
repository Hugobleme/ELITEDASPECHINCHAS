'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Flame, Search, X, Heart, Bell } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import CategoryChips from './CategoryChips';
import { UserMenu } from './user/UserMenu';

interface HeaderProps {
  showCategorySubbar?: boolean;
}

export default function Header({ showCategorySubbar = true }: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0b0f19]/85">
      {/* Top Navbar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 text-white shadow-md shadow-orange-500/30 transition-transform group-hover:scale-105">
            <Flame className="h-6 w-6 fill-white stroke-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                PROMO<span className="text-orange-500">RADAR</span>
              </span>
              <span className="hidden rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-orange-600 sm:inline-block dark:bg-orange-950/60 dark:text-orange-400">
                AO VIVO
              </span>
            </div>
            <span className="hidden text-[10px] font-semibold text-slate-400 sm:block">
              As melhores promoções e cupons
            </span>
          </div>
        </Link>

        {/* Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative max-w-lg flex-1 sm:mx-4"
        >
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Buscar produtos, marcas, celulares..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-100/80 py-2.5 pl-10 pr-10 text-xs font-medium text-slate-800 transition-all placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 sm:text-sm dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-500 dark:focus:bg-slate-900"
            />
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/favoritos"
            title="Meus Favoritos"
            className="p-2 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-slate-800 transition-colors"
          >
            <Heart className="w-5 h-5" />
          </Link>

          <Link
            href="/alertas"
            title="Meus Alertas de Preço"
            className="p-2 rounded-xl text-slate-500 hover:text-orange-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-orange-400 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-5 h-5" />
          </Link>

          <ThemeToggle />

          <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5" />

          <UserMenu />
        </div>
      </div>

      {/* Categories Subbar */}
      {showCategorySubbar && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 dark:border-slate-800/60 dark:bg-slate-900/30 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <CategoryChips />
          </div>
        </div>
      )}
    </header>
  );
}
