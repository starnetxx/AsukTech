// Service Worker for StarNetX PWA
// Version 1.0.0

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `starnetx-cache-${CACHE_VERSION}`;
const RUNTIME_CACHE = `starnetx-runtime-${CACHE_VERSION}`;

// Files to cache on install (static assets only)
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/starnetx-logo.svg',
  '/favicon.png',
  '/apple-touch-icon.png'
];

// API endpoints that should NEVER be cached
const NO_CACHE_PATTERNS = [
  /\/auth\//,
  /\/profiles/,
  /\/purchases/,
  /\/credentials/,
  /\/transactions/,
  /\/wallet/,
  /supabase/,  // Match any supabase URL
  /\/rest\//,  // Match any REST API
  /\.supabase\./,  // Match supabase domains
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing version:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        // Only cache static files, not API responses
        return cache.addAll(STATIC_CACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating version:', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old caches
              return cacheName.startsWith('starnetx-') && 
                     cacheName !== CACHE_NAME && 
                     cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
      .then(() => {
        // Send message to all clients about the update
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SERVICE_WORKER_UPDATED',
              version: CACHE_VERSION
            });
          });
        });
      })
  );
});

// Fetch event - network first strategy for API, cache first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Check if this is an API request that should not be cached
  const shouldNotCache = NO_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname) || pattern.test(url.href) || pattern.test(url.hostname));
  
  if (shouldNotCache) {
    // Network only strategy for API calls - never cache user data
    // Pass through the request without modification
    event.respondWith(
      fetch(request).catch((error) => {
        console.error('[Service Worker] Network request failed:', error);
        // Return a custom offline response for API calls
        return new Response(
          JSON.stringify({ 
            error: 'offline',
            message: 'You are currently offline. Please check your connection.'
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }
  
  // For static assets, use cache-first strategy
  if (request.destination === 'image' || 
      request.destination === 'style' || 
      request.destination === 'script' ||
      request.destination === 'font' ||
      url.pathname.includes('/assets/') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.jpeg')) {
    
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version and update cache in background
            const fetchPromise = fetch(request)
              .then((networkResponse) => {
                // Update cache with new version
                if (networkResponse && networkResponse.status === 200) {
                  const responseToCache = networkResponse.clone();
                  caches.open(RUNTIME_CACHE)
                    .then((cache) => {
                      cache.put(request, responseToCache);
                    });
                }
                return networkResponse;
              })
              .catch(() => {
                // Silently fail background update
              });
            
            return cachedResponse;
          }
          
          // Not in cache, fetch from network
          return fetch(request)
            .then((networkResponse) => {
              // Cache successful responses
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(RUNTIME_CACHE)
                  .then((cache) => {
                    cache.put(request, responseToCache);
                  });
              }
              return networkResponse;
            });
        })
        .catch((error) => {
          console.error('[Service Worker] Fetch failed:', error);
          // Return offline page for navigation requests
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
          throw error;
        })
    );
    return;
  }
  
  // For everything else, use network-first strategy
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Only cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(RUNTIME_CACHE)
            .then((cache) => {
              cache.put(request, responseToCache);
            });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fall back to cache if network fails
        return caches.match(request);
      })
  );
});

// Listen for messages from clients
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames
              .filter((cacheName) => cacheName.startsWith('starnetx-'))
              .map((cacheName) => caches.delete(cacheName))
          );
        })
        .then(() => {
          // Send confirmation back to client
          event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
        })
    );
  }
  
  if (event.data && event.data.type === 'FORCE_REFRESH') {
    // Clear all runtime caches to force fresh data
    event.waitUntil(
      caches.delete(RUNTIME_CACHE)
        .then(() => {
          event.ports[0].postMessage({ type: 'CACHE_REFRESHED' });
        })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-user-data') {
    event.waitUntil(
      // Notify clients to refresh their data
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_DATA',
            timestamp: Date.now()
          });
        });
      })
    );
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-user-data') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PERIODIC_SYNC',
            timestamp: Date.now()
          });
        });
      })
    );
  }
});