const CACHE_NAME = 'trazia-shell-v63';
const APP_FILES = [
  './',
  './index.html',
  './styles.css?v=60',
  './app.js?v=63',
  './auth.mjs?v=58',
  './settings.mjs?v=61',
  './voice-search.mjs?v=59',
  './reports.mjs?v=60',
  './map-palette.mjs?v=33',
  './live-traffic.mjs?v=32',
  './speed-cameras.mjs?v=35',
  './data/speed-cameras.json?v=30',
  './assets/speed-camera.png',
  './assets/saved-places/home.png',
  './assets/saved-places/work.png',
  './assets/saved-places/shop.png',
  './assets/saved-places/clinic.png',
  './assets/saved-places/school.png',
  './assets/saved-places/favorite.png',
  './assets/saved-places/other.png',
  './config.js?v=57',
  './tomtom-geocoding.mjs?v=37',
  './cali-addresses.mjs?v=63',
  './local-cali-addresses.mjs?v=63',
  './igac-cadastre.mjs?v=49',
  './data/cadastre/igac.json',
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
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => (await caches.match(request)) || Response.error()),
  );
});

