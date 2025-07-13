// EcoTrajet Service Worker
const CACHE_NAME = 'ecotrajet-cache-v1';

// Ressources à mettre en cache lors de l'installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/EcoTrajet_Icon_500x500.png',
  '/manifest.json',
  '/images/background.png',
  '/images/default-avatar.png'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('Installation du Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Mise en cache des ressources statiques');
        return cache.addAll(STATIC_ASSETS);
      })
  );
});

// Activation du Service Worker et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activé');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Suppression de l\'ancien cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Stratégie de cache pour les requêtes
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non GET ou vers Firebase
  if (event.request.method !== 'GET' || 
      event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('firebasestorage.googleapis.com') ||
      event.request.url.includes('identitytoolkit.googleapis.com')) {
    return;
  }
  
  // Stratégie: Network First pour les API, Cache First pour les ressources statiques
  if (event.request.url.includes('/api/')) {
    // Network first pour les API
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Mettre en cache la réponse
          let responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Si le réseau échoue, essayer le cache
          return caches.match(event.request);
        })
    );
  } else {
    // Cache first pour les ressources statiques (images, CSS, JS)
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // Retourner la réponse mise en cache si elle existe
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Sinon, faire une requête réseau
          return fetch(event.request)
            .then(response => {
              // Vérifier que la réponse est valide
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Mettre en cache la réponse
              let responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
              
              return response;
            });
        })
    );
  }
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/EcoTrajet_Icon_500x500.png',
      badge: '/EcoTrajet_Icon_500x500.png',
      data: {
        url: data.url || '/'
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'EcoTrajet', options)
    );
  }
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
