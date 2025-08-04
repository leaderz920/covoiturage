import { adminDb, adminMessaging, initializeFirebaseAdmin } from './firebaseAdmin';

/**
 * Fonction utilitaire pour s'assurer que Firebase Admin est initialisé
 * Retourne true si l'initialisation réussit, false sinon
 */
export async function ensureFirebaseAdmin(): Promise<boolean> {
  // Si déjà initialisé, on retourne true
  if (adminDb && adminMessaging) {
    return true;
  }

  // Sinon, on tente d'initialiser
  return initializeFirebaseAdmin();
}

/**
 * Fonction pour vérifier que Firebase Admin est prêt
 * Lance une erreur si pas initialisé
 */
export function requireFirebaseAdmin() {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized. Check FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable.');
  }
  return { adminDb, adminMessaging };
}

export { adminDb, adminMessaging };
