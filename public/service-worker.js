// EcoTrajet Service Worker
const CACHE_NAME = 'ecotrajet-cache-v2';

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
  // Force l'activation immédiate du nouveau service worker
  self.skipWaiting();
});

// Activation du Service Worker et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activé');
  event.waitUntil(
    Promise.all([
      // Nettoyage des anciens caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.filter(cacheName => {
            return cacheName !== CACHE_NAME;
          }).map(cacheName => {
            console.log('Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Prise de contrôle de tous les clients
      self.clients.claim()
    ])
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

// Gestion des notifications push avec fonctionnalités avancées
self.addEventListener('push', (event) => {
  console.log('[SW] Notification push reçue:', event);
  
  if (!event.data) {
    console.warn('[SW] Notification push sans données');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Données de notification:', data);
    
    // Configuration par défaut de la notification
    const defaultOptions = {
      body: data.body || 'Nouvelle notification EcoTrajet',
      icon: '/EcoTrajet_Icon_500x500.png',
      badge: '/EcoTrajet_Icon_500x500.png',
      tag: data.tag || 'ecotrajet-notification',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: {
        url: data.url || data.clickAction || '/',
        timestamp: Date.now(),
        type: data.type || 'general',
        ...data.data
      },
      actions: [
        {
          action: 'view',
          title: '👀 Voir',
          icon: '/EcoTrajet_Icon_500x500.png'
        },
        {
          action: 'dismiss',
          title: '❌ Ignorer'
        }
      ]
    };

    // Personnalisation selon le type de notification
    let notificationOptions = { ...defaultOptions };
    
    switch (data.type) {
      case 'new_announcement':
        notificationOptions.actions = [
          {
            action: 'view-announcement',
            title: '🚗 Voir le trajet',
            icon: '/EcoTrajet_Icon_500x500.png'
          },
          {
            action: 'search-similar',
            title: '🔍 Rechercher'
          },
          {
            action: 'dismiss',
            title: '❌ Ignorer'
          }
        ];
        notificationOptions.tag = 'new-announcement';
        break;
        
      case 'announcement_match':
        notificationOptions.actions = [
          {
            action: 'contact-user',
            title: '📞 Contacter',
            icon: '/EcoTrajet_Icon_500x500.png'
          },
          {
            action: 'view-details',
            title: '📝 Détails'
          },
          {
            action: 'dismiss',
            title: '❌ Ignorer'
          }
        ];
        notificationOptions.tag = 'announcement-match';
        notificationOptions.requireInteraction = true;
        notificationOptions.vibrate = [300, 100, 300, 100, 300];
        break;
        
      case 'contact_request':
        notificationOptions.actions = [
          {
            action: 'respond',
            title: '💬 Répondre',
            icon: '/EcoTrajet_Icon_500x500.png'
          },
          {
            action: 'call-back',
            title: '📞 Rappeler'
          },
          {
            action: 'dismiss',
            title: '❌ Ignorer'
          }
        ];
        notificationOptions.tag = 'contact-request';
        notificationOptions.requireInteraction = true;
        break;
        
      case 'welcome':
        notificationOptions.actions = [
          {
            action: 'explore',
            title: '🎯 Explorer',
            icon: '/EcoTrajet_Icon_500x500.png'
          },
          {
            action: 'dismiss',
            title: '✅ OK'
          }
        ];
        notificationOptions.tag = 'welcome';
        notificationOptions.requireInteraction = false;
        break;
    }

    // Affichage de la notification
    event.waitUntil(
      self.registration.showNotification(
        data.title || 'EcoTrajet',
        notificationOptions
      ).then(() => {
        console.log('[SW] Notification affichée avec succès');
        
        // Enregistrer l'événement pour les statistiques
        if ('indexedDB' in self) {
          try {
            // Stocker la notification dans IndexedDB pour tracking
            // Implementation simplifiée
            console.log('[SW] Notification trackée');
          } catch (dbError) {
            console.warn('[SW] Erreur stockage notification:', dbError);
          }
        }
      }).catch(error => {
        console.error('[SW] Erreur affichage notification:', error);
      })
    );
    
  } catch (parseError) {
    console.error('[SW] Erreur parsing données notification:', parseError);
    
    // Afficher une notification générique en cas d'erreur
    event.waitUntil(
      self.registration.showNotification('EcoTrajet', {
        body: 'Nouvelle activité disponible',
        icon: '/EcoTrajet_Icon_500x500.png',
        badge: '/EcoTrajet_Icon_500x500.png',
        tag: 'generic-notification',
        data: { url: '/' }
      })
    );
  }
});

// Gestion des clics sur les notifications avec actions avancées
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clic sur notification:', event);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const action = event.action;
  
  console.log('[SW] Action sélectionnée:', action);
  console.log('[SW] Données notification:', notificationData);

  // Définir l'URL de destination selon l'action
  let targetUrl = '/';
  
  switch (action) {
    case 'view-announcement':
    case 'view-details':
    case 'view':
      targetUrl = notificationData.url || '/';
      break;
      
    case 'search-similar':
      targetUrl = '/?modal=search';
      break;
      
    case 'contact-user':
    case 'respond':
      targetUrl = `/?contact=${notificationData.userId || ''}`;
      break;
      
    case 'call-back':
      if (notificationData.phoneNumber) {
        targetUrl = `tel:${notificationData.phoneNumber}`;
      } else {
        targetUrl = '/';
      }
      break;
      
    case 'explore':
      targetUrl = '/';
      break;
      
    case 'dismiss':
      // Ne rien faire, juste fermer
      console.log('[SW] Notification ignorée');
      return;
      
    default:
      // Clic sur le corps de la notification
      targetUrl = notificationData.url || '/';
  }

  // Gestion de l'ouverture/focus de la fenêtre
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      console.log('[SW] Clients trouvés:', clientList.length);
      
      // Chercher un client existant avec l'URL cible
      for (const client of clientList) {
        if (client.url.includes(targetUrl.split('?')[0]) && 'focus' in client) {
          console.log('[SW] Focus sur client existant');
          return client.focus();
        }
      }
      
      // Si aucun client trouvé, ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        console.log('[SW] Ouverture nouvelle fenêtre:', targetUrl);
        return clients.openWindow(targetUrl);
      }
    }).catch(error => {
      console.error('[SW] Erreur gestion clic notification:', error);
    })
  );

  // Tracking de l'interaction (optionnel)
  try {
    // Envoyer des analytics sur l'interaction
    console.log('[SW] Interaction trackée:', {
      action,
      notificationType: notificationData.type,
      timestamp: Date.now()
    });
  } catch (trackingError) {
    console.warn('[SW] Erreur tracking interaction:', trackingError);
  }
});

// Gestion de la fermeture des notifications
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification fermée:', event.notification.tag);
  
  // Tracking de la fermeture (optionnel)
  try {
    console.log('[SW] Fermeture notification trackée');
  } catch (error) {
    console.warn('[SW] Erreur tracking fermeture:', error);
  }
});
