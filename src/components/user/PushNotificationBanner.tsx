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
      <div className="bg-white dark:bg-gray-900 border border-brand-200 dark:border-brand-900/60 rounded-2xl shadow-xl p-4 sm:p-5 relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-amber-400 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-brand-500/20">
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>

          <div className="flex-1 pr-6">
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 mb-0.5">
              <Sparkles className="w-3 h-3" />
              <span>SUPER ALERTA</span>
            </div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
              Não perca nenhuma pechincha!
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Ative as notificações da Elite das Pechinchas e receba na hora quando surgir uma oferta relâmpago ou erro de preço.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={isLoading}
                className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Ativando...
                  </>
                ) : isSubscribed ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Ativado!
                  </>
                ) : (
                  'Ativar Notificações'
                )}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
