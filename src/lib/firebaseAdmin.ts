import admin from 'firebase-admin';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';

let db: admin.firestore.Firestore | null = null;
let auth: admin.auth.Auth | null = null;
let messaging: admin.messaging.Messaging | null = null;

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    console.log('[FIREBASE ADMIN] Already initialized.');
    if (!db) db = getFirestore();
    if (!auth) auth = getAuth();
    if (!messaging) messaging = getMessaging();
    return;
  }

  try {
    console.log('[FIREBASE ADMIN] Initializing...');
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON as string
    );

    initializeApp({
      credential: cert(serviceAccount),
    });

    db = getFirestore();
    auth = getAuth();
    messaging = getMessaging();
    console.log('[FIREBASE ADMIN] ✅ Initialized successfully from environment variable.');
  } catch (error) {
    console.error('[FIREBASE ADMIN] ❌ Error initializing from environment variable:', error);
    // Fallback to default initialization if service account fails
    try {
      initializeApp();
      db = getFirestore();
      auth = getAuth();
      messaging = getMessaging();
      console.log('[FIREBASE ADMIN] ⚠️ Initialized in degraded mode (without service account).');
    } catch (fallbackError) {
      console.error('[FIREBASE ADMIN] ❌ Complete initialization failure:', fallbackError);
    }
  }
}

// N'initialise pas automatiquement - seulement quand nécessaire

export const adminDb = () => {
    if (!db) {
        initializeFirebaseAdmin();
    }
    return db;
};

export const adminAuth = () => {
    if (!auth) {
        initializeFirebaseAdmin();
    }
    return auth;
};

export const adminMessaging = () => {
    if (!messaging) {
        initializeFirebaseAdmin();
    }
    return messaging;
};
