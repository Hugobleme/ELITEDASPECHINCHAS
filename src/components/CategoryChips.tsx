'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Smartphone,
  Laptop,
  Gamepad2,
  Home,
  Tv,
  Shirt,
  HeartPulse,
  Tag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useCategories } from '@/hooks/useTaxonomies';

interface CategoryChipsProps {
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  isFilterMode?: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  todas: <Sparkles className="h-4 w-4" />,
  eletronicos: <Smartphone className="h-4 w-4" />,
  informatica: <Laptop className="h-4 w-4" />,
  games: <Gamepad2 className="h-4 w-4" />,
  'casa-e-cozinha': <Home className="h-4 w-4" />,
  'tv-e-audio': <Tv className="h-4 w-4" />,
  'moda-e-calcados': <Shirt className="h-4 w-4" />,
  'beleza-e-saude': <HeartPulse className="h-4 w-4" />,
};

export default function CategoryChips({
  selectedCategory = 'todas',
  onSelectCategory,
  isFilterMode = false,
}: CategoryChipsProps) {
  const { data: categories = [] } = useCategories();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);

  const fullCategories = categories.some((c) => c.slug === 'todas')
    ? categories
    : [{ name: 'Todas', slug: 'todas', icon: 'Sparkles' }, ...categories];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative flex items-center py-2 group/chips">
      {/* Botão Scroll Esquerda (Desktop) */}
      <button
        type="button"
        onClick={() => scroll('left')}
        aria-label="Rolar categorias para a esquerda"
        className="hidden md:flex absolute left-0 z-10 h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-600 shadow-md backdrop-blur-md opacity-0 group-hover/chips:opacity-100 transition-opacity hover:bg-orange-50 hover:text-orange-600 dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-300 -translate-x-3 cursor-pointer"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto scroll-smooth py-1 px-0.5"
      >
        {fullCategories.map((cat) => {
          const isSelected =
            selectedCategory === cat.slug ||
            (pathname === `/categoria/${cat.slug}` && !isFilterMode);

          const icon = ICON_MAP[cat.slug] || <Tag className="h-4 w-4" />;

          if (isFilterMode && onSelectCategory) {
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => onSelectCategory(cat.slug)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[38px] ${
                  isSelected
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]'
                    : 'border border-slate-200/90 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50/60 hover:text-orange-600 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:border-orange-500/40 dark:hover:bg-slate-800'
                }`}
              >
                {icon}
                <span>{cat.name}</span>
              </button>
            );
          }

          // Modo link normal para navegação direta
          const href = cat.slug === 'todas' ? '/' : `/categoria/${cat.slug}`;

          return (
            <Link
              key={cat.slug}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 whitespace-nowrap min-h-[38px] ${
                isSelected
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]'
                  : 'border border-slate-200/90 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50/60 hover:text-orange-600 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:border-orange-500/40 dark:hover:bg-slate-800'
              }`}
            >
              {icon}
              <span>{cat.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Botão Scroll Direita (Desktop) */}
      <button
        type="button"
        onClick={() => scroll('right')}
        aria-label="Rolar categorias para a direita"
        className="hidden md:flex absolute right-0 z-10 h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-600 shadow-md backdrop-blur-md opacity-0 group-hover/chips:opacity-100 transition-opacity hover:bg-orange-50 hover:text-orange-600 dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-300 translate-x-3 cursor-pointer"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
