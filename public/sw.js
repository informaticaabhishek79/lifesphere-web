/*
 * LifeSphere service worker.
 * - Shows web push notifications (payload text follows the user's lock-screen setting).
 * - Shows a friendly offline page when there is no connection.
 * - Keeps the app's own static files (scripts, styles, fonts, icons) for faster starts.
 * Personal data (anything under /api/) is never stored here.
 */
const VERSION = 'ls-v2';
const OFFLINE_URL = '/offline';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/icons/badge-96.png'];
const LOCAL = ['localhost', '127.0.0.1'].includes(self.location.hostname);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Pages: always from the network (they hold personal data); the offline page when there is none.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL).then((r) => r || new Response('Offline', { status: 503 }))));
    return;
  }
  // The app's own built files never change once published, so a stored copy is safe to reuse.
  const immutable = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');
  if (immutable && !LOCAL) {
    event.respondWith(
      caches.open(VERSION).then((cache) =>
        cache.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok) cache.put(req, res.clone());
              return res;
            }),
        ),
      ),
    );
  }
});

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
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
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
