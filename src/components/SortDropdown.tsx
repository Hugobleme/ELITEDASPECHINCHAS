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
          className="cursor-pointer appearance-none rounded-xl border border-slate-200/80 bg-white py-2 pl-3.5 pr-8 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
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
