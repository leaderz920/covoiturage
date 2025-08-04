import { cert, getApps, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const serviceAccountEncoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

export let adminDb: ReturnType<typeof getFirestore> | undefined;
export let adminMessaging: ReturnType<typeof getMessaging> | undefined;

// Initialisation différée pour éviter les erreurs de build
export function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    const app = getApps()[0];
    adminDb = getFirestore(app);
    adminMessaging = getMessaging(app);
    return true;
  }

  if (!serviceAccountEncoded) {
    console.warn('[FIREBASE ADMIN] FIREBASE_SERVICE_ACCOUNT_BASE64 non défini');
    return false;
  }

  try {
    // Nettoyage robuste du Base64
    let cleanBase64 = serviceAccountEncoded
      .replace(/\s+/g, '')           // Supprimer tous les espaces et whitespace
      .replace(/[\r\n\t]/g, '')      // Supprimer retours à la ligne et tabulations
      .replace(/[^A-Za-z0-9+/=]/g, ''); // Garder seulement les caractères Base64 valides

    // Ajouter le padding manquant si nécessaire
    const remainder = cleanBase64.length % 4;
    if (remainder > 0) {
      cleanBase64 += '='.repeat(4 - remainder);
    }

    console.log('[FIREBASE ADMIN] Tentative de décodage Base64, longueur:', cleanBase64.length);

    let decoded: string;
    try {
      decoded = Buffer.from(cleanBase64, 'base64').toString('utf8');
    } catch (decodeError) {
      console.error('[FIREBASE ADMIN] Erreur de décodage Base64:', decodeError);
      throw new Error('Invalid Base64 encoding');
    }
    
    // Validation que c'est bien du JSON
    if (!decoded.trim().startsWith('{') || !decoded.trim().endsWith('}')) {
      console.error('[FIREBASE ADMIN] Le contenu décodé n\'est pas un JSON valide');
      console.error('[FIREBASE ADMIN] Début du contenu:', decoded.substring(0, 100));
      throw new Error('Decoded content is not valid JSON');
    }

    let serviceAccount: ServiceAccount;
    try {
      serviceAccount = JSON.parse(decoded);
    } catch (parseError) {
      console.error('[FIREBASE ADMIN] Erreur de parsing JSON:', parseError);
      console.error('[FIREBASE ADMIN] JSON invalide à la position:', String(parseError).match(/position (\d+)/)?.[1]);
      
      // Essayer de nettoyer le JSON
      const cleanedJson = decoded
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Supprimer caractères de contrôle
        .replace(/\0/g, '')                    // Supprimer null bytes
        .trim();
      
      try {
        serviceAccount = JSON.parse(cleanedJson);
        console.log('[FIREBASE ADMIN] JSON nettoyé avec succès');
      } catch (secondParseError) {
        console.error('[FIREBASE ADMIN] Impossible de parser même après nettoyage:', secondParseError);
        throw new Error('Service Account JSON is corrupted');
      }
    }
    
    // Validation des champs requis
    if (!(serviceAccount as any).project_id && !serviceAccount.projectId) {
      throw new Error('Service Account invalide: project_id manquant');
    }

    const adminApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId || (serviceAccount as any).project_id
    });

    adminDb = getFirestore(adminApp);
    adminMessaging = getMessaging(adminApp);
    
    console.log('[FIREBASE ADMIN] Firestore et Messaging initialisés avec succès');
    return true;
  } catch (e) {
    console.error('[FIREBASE ADMIN] Erreur d\'initialisation:', e);
    console.error('[FIREBASE ADMIN] Longueur du Service Account encodé:', serviceAccountEncoded?.length || 0);
    return false;
  }
}

// Initialisation lazy - seulement quand c'est nécessaire
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'development') {
  // En production, on initialise seulement si on n'est pas en phase de build
  if (process.env.VERCEL_ENV || process.env.NODE_ENV === 'production') {
    initializeFirebaseAdmin();
  }
}
