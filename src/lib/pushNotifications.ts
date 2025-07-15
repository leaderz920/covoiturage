export async function initPushNotifications() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('[PUSH] Permission de notification refusée');
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    if (!vapidPublicKey) {
      console.error('[PUSH] Clé VAPID publique manquante');
      return;
    }
    const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    });
    console.log('[PUSH] Nouvelle souscription push créée', subscription);
  } else {
    console.log('[PUSH] Souscription push existante trouvée', subscription);
  }

  try {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });
    if (res.ok) {
      console.log('[PUSH] Souscription envoyée à l’API et collection Firestore attendue');
    } else {
      const errText = await res.text();
      console.error('[PUSH] Erreur API /api/push/subscribe:', res.status, errText);
    }
  } catch (err) {
    console.error('[PUSH] Erreur lors de l’envoi de la souscription à l’API:', err);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
