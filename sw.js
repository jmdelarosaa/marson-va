const CACHE_NAME = 'jumpstart-clockin-v1';
const STATIC_ASSETS = ['./clockin.html', './admin.html', './manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  // Let Supabase API calls go straight to network (no caching)
  if (!request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => null);
      return cached || networkFetch || caches.match('./clockin.html');
    })
  );
});

// Background sync — tell any open window to run the sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-clock-events') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' })
        .then(clients => clients.forEach(c => c.postMessage({ type: 'SYNC_NOW' })))
    );
  }
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
