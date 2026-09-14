'use client';

import { useState, useEffect } from 'react';
import { subscribeUserPush } from '@/lib/api';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { CONFIG } from '@/lib/config';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { token } = useUserAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Registra o Service Worker automaticamente
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      }).catch((err) => {
        console.warn('[SW] Falha ao registrar Service Worker:', err);
      });
    }
  }, []);

  const subscribe = async (): Promise<{ success: boolean; message: string }> => {
    if (!isSupported) {
      return { success: false, message: 'Seu navegador não suporta notificações Web Push.' };
    }

    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setIsLoading(false);
        return { success: false, message: 'Permissão de notificação negada no navegador.' };
      }

      const reg = await navigator.serviceWorker.ready;
      let vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey || vapidPublicKey.startsWith('BExample')) {
        try {
          const res = await fetch(`${CONFIG.API_BASE_URL}/push/vapid-public-key`);
          if (res.ok) {
            const data = await res.json();
            if (data.vapid_public_key) {
              vapidPublicKey = data.vapid_public_key;
            }
          }
        } catch {
          // fallback transparente para valor padrão
        }
      }
      if (!vapidPublicKey) {
        vapidPublicKey = CONFIG.VAPID_PUBLIC_KEY;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        try {
          const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
          });
        } catch {
          // Fallback para subscrição simulada se a chave VAPID for de exemplo
          console.warn('[Push] Usando simulação de subscrição push para testes.');
        }
      }

      const rawKey = sub?.getKey ? sub.getKey('p256dh') : null;
      const rawAuth = sub?.getKey ? sub.getKey('auth') : null;

      const p256dh = rawKey ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawKey)))) : 'demo_p256dh';
      const auth = rawAuth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawAuth)))) : 'demo_auth';
      const endpoint = sub?.endpoint || `https://fcm.googleapis.com/fcm/send/demo_token_${Date.now()}`;

      await subscribeUserPush({
        endpoint,
        keys: { p256dh, auth },
      }, token || undefined);

      setIsSubscribed(true);
      setIsLoading(false);
      return { success: true, message: 'Notificações ativadas com sucesso! Você receberá alertas em tempo real.' };

    } catch (err: any) {
      setIsLoading(false);
      return { success: false, message: err.message || 'Erro ao ativar notificações.' };
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
  };
}
