'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  href?: string;
  colorScheme?: 'violet' | 'orange' | 'emerald' | 'blue' | 'purple' | 'amber';
}

const COLOR_MAP = {
  violet: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'hover:border-amber-400 dark:hover:border-amber-500/50',
  },
  orange: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'hover:border-amber-400 dark:hover:border-amber-500/50',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'hover:border-emerald-300 dark:hover:border-emerald-500/50',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'hover:border-blue-300 dark:hover:border-blue-500/50',
  },
  purple: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'hover:border-amber-400 dark:hover:border-amber-500/50',
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'hover:border-amber-400 dark:hover:border-amber-500/50',
  },
};

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  href,
  colorScheme = 'amber',
}: MetricCardProps) {
  const scheme = COLOR_MAP[colorScheme] || COLOR_MAP.amber;

  const content = (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-200 dark:border-amber-500/15 dark:bg-[#111116] ${
        href ? `hover:-translate-y-0.5 hover:shadow-card-hover ${scheme.border}` : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 ${scheme.bg} ${scheme.text}`}>
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          {value}
        </div>

        <div className="mt-1 flex items-center justify-between">
          {subtitle && (
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{subtitle}</span>
          )}

          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-bold ${
                trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
              }`}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              <span>{trend.value}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
