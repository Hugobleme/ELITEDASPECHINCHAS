'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCategories } from '@/hooks/useTaxonomies';

interface CategoryChipsProps {
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  isFilterMode?: boolean;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  todas: '✨',
  eletronicos: '📱',
  informatica: '💻',
  games: '🎮',
  'casa-e-cozinha': '🍳',
  'tv-e-audio': '📺',
  'moda-e-calcados': '👟',
  'beleza-e-saude': '💄',
  esportes: '⚽',
  livros: '📚',
  automotivo: '🚗',
  bebes: '🍼',
  supermercado: '🛒',
  ferramentas: '🔧',
};

function getCategoryEmoji(slugOrName: string): string {
  const norm = (slugOrName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-');

  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (norm.includes(key) || key.includes(norm)) {
      return emoji;
    }
  }

  if (norm.includes('eletro') || norm.includes('celular') || norm.includes('fone')) return '📱';
  if (norm.includes('info') || norm.includes('pc') || norm.includes('computador')) return '💻';
  if (norm.includes('game') || norm.includes('jogo') || norm.includes('console')) return '🎮';
  if (norm.includes('casa') || norm.includes('cozinha') || norm.includes('lar')) return '🍳';
  if (norm.includes('tv') || norm.includes('audio') || norm.includes('som')) return '📺';
  if (norm.includes('moda') || norm.includes('calcado') || norm.includes('roupa') || norm.includes('tenis')) return '👟';
  if (norm.includes('beleza') || norm.includes('saude') || norm.includes('perfum')) return '💄';
  if (norm.includes('esporte') || norm.includes('fitness') || norm.includes('treino')) return '⚽';
  if (norm.includes('livro') || norm.includes('papelaria')) return '📚';
  if (norm.includes('auto') || norm.includes('carro')) return '🚗';
  if (norm.includes('bebe') || norm.includes('infantil') || norm.includes('crianca')) return '🍼';
  if (norm.includes('mercado') || norm.includes('alimento') || norm.includes('bebida')) return '🛒';
  if (norm.includes('ferramenta') || norm.includes('construcao')) return '🔧';

  return '🏷️';
}

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
        className="hidden md:flex absolute left-0 z-10 h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-600 shadow-md backdrop-blur-md opacity-0 group-hover/chips:opacity-100 transition-opacity hover:bg-violet-50 hover:text-violet-600 dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-300 -translate-x-3 cursor-pointer"
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

          const emoji = getCategoryEmoji(cat.slug || cat.name);

          if (isFilterMode && onSelectCategory) {
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => onSelectCategory(cat.slug)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[38px] ${
                  isSelected
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/25 scale-[1.02]'
                    : 'border border-slate-200/90 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50/60 hover:text-violet-600 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:border-violet-500/40 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-sm leading-none shrink-0" aria-hidden="true">{emoji}</span>
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
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/25 scale-[1.02]'
                  : 'border border-slate-200/90 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50/60 hover:text-violet-600 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:border-violet-500/40 dark:hover:bg-slate-800'
              }`}
            >
              <span className="text-sm leading-none shrink-0" aria-hidden="true">{emoji}</span>
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
        className="hidden md:flex absolute right-0 z-10 h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-600 shadow-md backdrop-blur-md opacity-0 group-hover/chips:opacity-100 transition-opacity hover:bg-violet-50 hover:text-violet-600 dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-300 translate-x-3 cursor-pointer"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
