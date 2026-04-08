const CACHE_NAME = 'figuraprokat-v4';
const BASE_PATH = self.location.pathname.replace(/\/sw\.js$/, '');
const ASSETS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/css/style.css`,
  `${BASE_PATH}/js/app.js`,
  `${BASE_PATH}/manifest.json`,
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];
const APP_SHELL_PATHS = new Set(ASSETS.map(asset => new URL(asset, self.location.origin).pathname));

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const fallback = await cache.match(`${BASE_PATH}/index.html`);
      if (fallback) return fallback;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  const response = await networkPromise;
  if (response) return response;
  if (request.mode === 'navigate') return cache.match(`${BASE_PATH}/index.html`);
  throw new Error('Network request failed');
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAppShell = e.request.mode === 'navigate' || (isSameOrigin && APP_SHELL_PATHS.has(url.pathname));
  e.respondWith(isAppShell ? networkFirst(e.request) : staleWhileRevalidate(e.request));
});
