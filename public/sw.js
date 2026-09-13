// Service Worker para Notificações Web Push do PromoRadar

self.addEventListener('push', function (event) {
  if (!event.data) {
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'Promoção Imperdível!',
      body: event.data.text(),
    };
  }

  const title = data.title || '🔥 Alerta de Oferta no PromoRadar';
  const options = {
    body: data.body || 'Confira um super desconto disponível agora!',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    image: data.image || undefined,
    vibrate: [100, 50, 100],
    data: {
      url: (data.data && data.data.url) || '/',
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      { action: 'explore', title: 'Ver Oferta' },
      { action: 'close', title: 'Fechar' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // Se já houver uma aba aberta no PromoRadar, foca nela e navega
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Se não houver, abre uma nova aba
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
