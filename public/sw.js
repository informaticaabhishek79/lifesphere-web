/* LifeSphere service worker: shows web push notifications. Payload text follows the user's lock-screen setting. */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'LifeSphere', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'LifeSphere';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag || undefined,
      data: { url: data.url || '/notifications' },
      icon: '/icon.svg',
      badge: '/icon.svg',
      requireInteraction: data.category === 'help' || data.category === 'checkins',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
