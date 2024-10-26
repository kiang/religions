const CACHE_NAME = 'religion-map-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/ol.css',
  '/css/ol3-sidebar.min.css',
  '/js/routie.min.js',
  '/js/jquery.min.js',
  '/js/ol.js',
  '/js/ol5-sidebar.min.js',
  '/js/main.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
