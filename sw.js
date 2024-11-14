const CACHE_NAME = 'religion-map-v1.00001';
const urlsToCache = [
  'https://kiang.github.io/religions/',
  'https://kiang.github.io/religions/index.html',
  'https://kiang.github.io/religions/css/ol.css',
  'https://kiang.github.io/religions/css/ol3-sidebar.min.css',
  'https://kiang.github.io/religions/js/routie.min.js',
  'https://kiang.github.io/religions/js/jquery.min.js',
  'https://kiang.github.io/religions/js/ol.js',
  'https://kiang.github.io/religions/js/ol5-sidebar.min.js',
  'https://kiang.github.io/religions/js/main.js',
  'https://kiang.github.io/religions/manifest.json',
  'https://kiang.github.io/religions/icon-192x192.png',
  'https://kiang.github.io/religions/icon-512x512.png'
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
        return fetch(event.request).then(
          function(response) {
            if(!response || response.status !== 200 || response.type !== 'basic') {
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
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
