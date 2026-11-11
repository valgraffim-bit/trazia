const CACHE_NAME = 'trazia-shell-v29';
const APP_FILES = [
  './',
  './index.html',
  './styles.css?v=23',
  './app.js?v=29',
  './config.js?v=28',
  './tomtom-geocoding.mjs?v=28',
  './waze-links.mjs?v=27',
  './manifest.webmanifest',
  './assets/trazia-app-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(async () => (await caches.match(request)) || Response.error()),
  );
});

