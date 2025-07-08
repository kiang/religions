const CACHE_NAME = 'religion-map-v2.00001';
const urlsToCache = [
  'https://kiang.github.io/religions/',
  'https://kiang.github.io/religions/index.html',
  'https://kiang.github.io/religions/js/routie.min.js',
  'https://kiang.github.io/religions/js/jquery.min.js',
  'https://kiang.github.io/religions/js/main_leaflet.js',
  'https://kiang.github.io/religions/manifest.json',
  'https://kiang.github.io/religions/icon-192x192.png',
  'https://kiang.github.io/religions/icon-512x512.png',
  // External dependencies - these will be cached when first loaded
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css',
  'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js',
  'https://unpkg.com/topojson@3',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.0.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.0.0/dist/js/bootstrap.bundle.min.js',
  'https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css',
  'https://code.jquery.com/ui/1.12.1/jquery-ui.js'
];

self.addEventListener('install', function(event) {
  // Force the new service worker to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  // Skip caching for certain URLs
  const url = new URL(event.request.url);
  
  // Don't cache API calls or dynamic data
  if (url.pathname.includes('/data/poi/') || 
      url.pathname.includes('/api/') ||
      url.hostname.includes('docs.google.com') ||
      url.hostname.includes('drive.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          function(response) {
            // Check if we received a valid response
            if(!response || response.status !== 200 || 
               (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }

            // Don't cache non-GET requests
            if (event.request.method !== 'GET') {
              return response;
            }

            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', function(event) {
  var cacheWhitelist = [CACHE_NAME];
  
  // Take control of all pages immediately
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      // Force all tabs to use the new service worker
      return self.clients.claim();
    })
  );
});
