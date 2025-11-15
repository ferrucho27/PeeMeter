// sw.js

const CACHE_NAME = 'miccion-registro-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // Es importante no cachear el index.tsx o los scripts de React directamente
  // si sus nombres no tienen un hash que cambie con las actualizaciones.
  // Vercel y otros sistemas modernos de build suelen manejar esto.
  // Por ahora, nos centraremos en cachear el shell de la aplicación.
];

// Instalar el Service Worker y cachear los recursos principales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // Forzar al nuevo service worker a activarse inmediatamente
  self.skipWaiting(); 
});

// Activar el Service Worker y limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Borra las cachés que no coincidan con la versión actual
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tomar control de los clientes (pestañas) abiertos inmediatamente
  return self.clients.claim();
});

// Interceptar las peticiones de red (Estrategia: Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Si la petición fue exitosa, la guardamos en caché para la próxima vez
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });

        // Devolvemos la respuesta de la caché inmediatamente si existe,
        // mientras que en segundo plano actualizamos la caché con la respuesta de la red.
        return cachedResponse || fetchPromise;
      });
    })
  );
});