'use client';

import React from 'react';
import { ArrowUpDown } from 'lucide-react';

interface SortDropdownProps {
  value: 'recent' | 'discount' | 'price';
  onChange: (value: 'recent' | 'discount' | 'price') => void;
}

export default function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-select" className="hidden text-xs font-semibold text-slate-500 sm:inline-block dark:text-slate-400">
        Ordenar:
      </label>
      <div className="relative">
        <select
          id="sort-select"
          value={value}
          onChange={(e) => onChange(e.target.value as 'recent' | 'discount' | 'price')}
          className="cursor-pointer appearance-none rounded-xl border border-slate-200/90 bg-white py-2 pl-3.5 pr-8 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-amber-300 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/[0.08] dark:bg-[#111116] dark:text-zinc-200 dark:hover:border-amber-500/40"
        >
          <option value="recent">Mais Recentes</option>
          <option value="discount">Maior Desconto (% OFF)</option>
          <option value="price">Menor Preço (R$)</option>
        </select>
        <ArrowUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}
