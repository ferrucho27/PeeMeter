// A simple, no-op service worker that takes over network requests.
self.addEventListener('install', (event) => {
  // Perform install steps
  console.log('Service Worker installing.');
});

self.addEventListener('fetch', (event) => {
  // This is a basic pass-through.
  // A real-world app would have caching strategies.
  event.respondWith(fetch(event.request));
});
