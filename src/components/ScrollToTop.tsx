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
      className="fixed bottom-6 left-6 z-40 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-orange-300 hover:bg-orange-500 hover:text-white dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:border-orange-500 dark:hover:bg-orange-500 dark:hover:text-white animate-in fade-in slide-in-from-bottom-4"
    >
      <ArrowUp className="h-5 w-5 stroke-[2.5]" />
    </button>
  );
}
