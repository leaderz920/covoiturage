// Types pour les notifications
export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  actions?: NotificationAction[];
  data?: any;
}

export interface NotificationSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: string;
  createdAt?: Date;
  lastUsed?: Date;
}

// Configuration des notifications
const NOTIFICATION_CONFIG = {
  icon: '/EcoTrajet_Icon_500x500.png',
  badge: '/EcoTrajet_Icon_500x500.png',
  tag: 'ecotrajet-notification',
  requireInteraction: true,
  silent: false,
  renotify: true
};

// Initialisation du systeme de notifications push
export async function initPushNotifications(userId?: string): Promise<boolean> {
  console.log('[PUSH] Initialisation des notifications push...');
  
  // Verification du support
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[PUSH] Les notifications push ne sont pas supportees');
    return false;
  }

  try {
    // Demande de permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('[PUSH] Permission de notification refusee');
      return false;
    }

    // Enregistrement du service worker
    const registration = await navigator.serviceWorker.ready;
    console.log('[PUSH] Service Worker pret');

    // Gestion de l\'abonnement push
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await createPushSubscription(registration);
      if (!subscription) {
        console.error('[PUSH] Impossible de creer l\'abonnement push');
        return false;
      }
    }

    // Envoi de l\'abonnement au serveur
    const success = await sendSubscriptionToServer(subscription, userId);
    if (success) {
      console.log('[PUSH] Notifications push configurees avec succes');
      
      // Stockage local de l\'etat
      localStorage.setItem('push-notifications-enabled', 'true');
      if (userId) {
        localStorage.setItem('push-user-id', userId);
      }
    }

    return success;
  } catch (error) {
    console.error('[PUSH] Erreur lors de l\'initialisation:', error);
    return false;
  }
}

// Demande de permission avec gestion elegante
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[PUSH] Les notifications ne sont pas supportees');
    return 'denied';
  }

  // Si deja accordee
  if (Notification.permission === 'granted') {
    return 'granted';
  }

  // Si bloquee
  if (Notification.permission === 'denied') {
    console.warn('[PUSH] Les notifications sont bloquees par l\'utilisateur');
    return 'denied';
  }

  // Demande de permission
  const permission = await Notification.requestPermission();
  console.log('[PUSH] Permission accordee:', permission);
  return permission;
}

// Creation d\'un abonnement push
async function createPushSubscription(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    if (!vapidPublicKey) {
      console.error('[PUSH] Cle VAPID publique manquante');
      return null;
    }

    const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    });

    console.log('[PUSH] Nouvelle souscription push creee');
    return subscription;
  } catch (error) {
    console.error('[PUSH] Erreur lors de la creation de l\'abonnement:', error);
    return null;
  }
}

// Envoi de l'abonnement au serveur
async function sendSubscriptionToServer(subscription: PushSubscription, userId?: string): Promise<boolean> {
  try {
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.getKey('p256dh') ? 
          btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('p256dh')!)))) : '',
        auth: subscription.getKey('auth') ? 
          btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('auth')!)))) : ''
      },
      userId: userId,
    };

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData),
    });

    if (response.ok) {
      console.log('[PUSH] Abonnement envoyé avec succès au serveur');
      return true;
    } else {
      const errorData = await response.json();
      console.error('[PUSH] Erreur serveur lors de l\'abonnement:', errorData.message);
      return false;
    }
  } catch (error) {
    console.error('[PUSH] Erreur lors de l\'envoi au serveur:', error);
    return false;
  }
}

// Desabonnement des notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log('[PUSH] Desabonnement reussi');
      
      // Nettoyage du stockage local
      localStorage.removeItem('push-notifications-enabled');
      localStorage.removeItem('push-user-id');
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('[PUSH] Erreur lors du desabonnement:', error);
    return false;
  }
}

// Verification du statut des notifications
export function getNotificationStatus(): {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
} {
  return {
    supported: typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator,
    permission: typeof window !== 'undefined' ? Notification.permission : 'denied',
    subscribed: localStorage.getItem('push-notifications-enabled') === 'true'
  };
}

// Test d\'envoi de notification locale
export async function sendTestNotification(): Promise<void> {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return;

  new Notification('EcoTrajet - Test', {
    body: 'Les notifications fonctionnent correctement !',
    icon: NOTIFICATION_CONFIG.icon,
    badge: NOTIFICATION_CONFIG.badge,
    tag: 'test-notification'
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
