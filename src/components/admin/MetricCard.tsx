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
  colorScheme?: 'orange' | 'emerald' | 'blue' | 'purple' | 'amber';
}

const COLOR_MAP = {
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'hover:border-orange-300 dark:hover:border-orange-500/40',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'hover:border-emerald-300 dark:hover:border-emerald-500/40',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'hover:border-blue-300 dark:hover:border-blue-500/40',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'hover:border-purple-300 dark:hover:border-purple-500/40',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'hover:border-amber-300 dark:hover:border-amber-500/40',
  },
};

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  href,
  colorScheme = 'orange',
}: MetricCardProps) {
  const scheme = COLOR_MAP[colorScheme];

  const content = (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-900/90 ${
        href ? `hover:-translate-y-0.5 hover:shadow-md ${scheme.border}` : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${scheme.bg} ${scheme.text}`}>
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
