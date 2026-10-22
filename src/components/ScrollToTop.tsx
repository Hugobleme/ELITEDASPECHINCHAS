'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 350) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Voltar ao topo da página"
      title="Voltar ao topo"
      className="fixed bottom-20 left-4 sm:bottom-6 sm:left-6 z-40 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 text-slate-700 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-amber-400 hover:bg-gradient-to-r hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 hover:text-slate-950 active:scale-95 dark:border-amber-500/20 dark:bg-[#111116]/90 dark:text-zinc-300 dark:hover:border-amber-400 dark:hover:text-slate-950 cursor-pointer animate-in fade-in slide-in-from-bottom-4"
    >
      <ArrowUp className="h-5 w-5 stroke-[2.5]" />
    </button>
  );
}
