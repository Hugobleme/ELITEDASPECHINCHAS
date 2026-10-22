'use client';

import React, { useState, useEffect } from 'react';
import { Flame, Snowflake } from 'lucide-react';

interface TemperatureVoteProps {
  offerId: string;
  initialTemperature?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export default function TemperatureVote({
  offerId,
  initialTemperature = 120,
  size = 'md',
  className = '',
}: TemperatureVoteProps) {
  const [temperature, setTemperature] = useState(initialTemperature);
  const [userVote, setUserVote] = useState<'hot' | 'cold' | null>(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setTemperature(initialTemperature);
  }, [initialTemperature]);

  useEffect(() => {
    try {
      const savedVote = localStorage.getItem(`pechinchas_vote_${offerId}`);
      if (savedVote === 'hot' || savedVote === 'cold') {
        setUserVote(savedVote);
      }
    } catch {}
  }, [offerId]);

  const handleVote = (type: 'hot' | 'cold', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (userVote === type) return;

    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);

    let delta = 0;
    if (type === 'hot') {
      delta = userVote === 'cold' ? 2 : 1;
    } else {
      delta = userVote === 'hot' ? -2 : -1;
    }

    setTemperature((prev) => prev + delta);
    setUserVote(type);

    try {
      localStorage.setItem(`pechinchas_vote_${offerId}`, type);
    } catch {}
  };

  const isHot = temperature >= 0;

  if (size === 'sm') {
    return (
      <div
        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-black transition-transform ${
          animating ? 'scale-110' : 'scale-100'
        } ${
          isHot
            ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20'
            : 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400'
        } ${className}`}
        title={`Temperatura da oferta: ${temperature}°`}
      >
        <Flame className="h-3 w-3 fill-current stroke-current" />
        <span>{temperature > 0 ? `+${temperature}°` : `${temperature}°`}</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-2xl border border-slate-200/90 bg-white p-1 shadow-sm dark:border-amber-500/20 dark:bg-[#111116] ${className}`}
    >
      {/* Botão Frio */}
      <button
        type="button"
        onClick={(e) => handleVote('cold', e)}
        title="Oferta fria"
        className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all cursor-pointer ${
          userVote === 'cold'
            ? 'bg-sky-500 text-white shadow-sm'
            : 'text-slate-400 hover:bg-slate-100 hover:text-sky-500 dark:hover:bg-[#1a1a26]'
        }`}
      >
        <Snowflake className="h-4 w-4" />
      </button>

      {/* Indicador de Graus */}
      <div
        className={`px-2.5 text-xs font-black tracking-tight transition-transform ${
          animating ? 'scale-110' : 'scale-100'
        } ${
          isHot
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-sky-600 dark:text-sky-400'
        }`}
      >
        <div className="flex items-center gap-1">
          <Flame className="h-3.5 w-3.5 fill-current" />
          <span>{temperature > 0 ? `+${temperature}°` : `${temperature}°`}</span>
        </div>
      </div>

      {/* Botão Quente */}
      <button
        type="button"
        onClick={(e) => handleVote('hot', e)}
        title="Oferta muito quente!"
        className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all cursor-pointer ${
          userVote === 'hot'
            ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/30'
            : 'text-slate-400 hover:bg-slate-100 hover:text-amber-500 dark:hover:bg-[#1a1a26]'
        }`}
      >
        <Flame className="h-4 w-4 fill-current" />
      </button>
    </div>
  );
}
