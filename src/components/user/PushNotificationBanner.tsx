'use client';

import React, { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { BellRing, X, Check, Loader2, Sparkles } from 'lucide-react';

export function PushNotificationBanner() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Verifica se o usuário já dispensou nos últimos 3 dias
    const dismissedAt = localStorage.getItem('promoradar_push_dismissed');
    if (dismissedAt) {
      const diffDays = (Date.now() - Number(dismissedAt)) / (1000 * 3600 * 24);
      if (diffDays < 3) return;
    }

    if (isSupported && !isSubscribed && permission === 'default') {
      // Delay de 2.5s para não ser agressivo ao carregar a página
      const timer = setTimeout(() => {
        setDismissed(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed, permission]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('promoradar_push_dismissed', String(Date.now()));
  };

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      setTimeout(() => {
        setDismissed(true);
      }, 2000);
    }
  };

  if (dismissed || !isSupported || isSubscribed || permission === 'denied') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-md w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl p-4 sm:p-5 shadow-card dark:border-slate-800 dark:bg-slate-900/95">
        {/* Glow de fundo */}
        <div className="pointer-events-none absolute right-0 top-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-violet-500/15 blur-2xl" />

        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-glow-brand">
            <BellRing className="h-5 w-5 animate-bounce" />
          </div>

          <div className="flex-1 pr-6">
            <div className="mb-0.5 flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
              <Sparkles className="h-3 w-3" />
              <span>SUPER ALERTA</span>
            </div>
            <h4 className="text-sm font-bold leading-snug text-slate-900 dark:text-white">
              Não perca nenhuma pechincha!
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Ative as notificações da Elite das Pechinchas e receba na hora quando surgir uma oferta relâmpago ou erro de preço.
            </p>

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={isLoading}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-fuchsia-500 active:scale-95 disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Ativando...</span>
                  </>
                ) : isSubscribed ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Ativado!</span>
                  </>
                ) : (
                  'Ativar Notificações'
                )}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="flex min-h-[38px] items-center rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                Agora não
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            aria-label="Fechar banner"
            className="absolute right-3 top-3 rounded-xl p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
