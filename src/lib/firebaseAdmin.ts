import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';

interface ServiceAccount {
  type: 'service_account';
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  projectId?: string;
}

export function initializeFirebaseAdmin(): boolean {
  // Vérifier si Firebase Admin est déjà initialisé
  if (getApps().length > 0) {
    console.log('[FIREBASE ADMIN] ✅ Déjà initialisé');
    return true;
  }

  // Méthode 0: Lire le fichier JSON local (pour le développement)
  if (process.env.NODE_ENV === 'development') {
    try {
      const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
      if (fs.existsSync(serviceAccountPath)) {
        console.log('[FIREBASE ADMIN] 🔧 Lecture du fichier serviceAccountKey.json...');
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        
        initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id,
          databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com/`,
          storageBucket: `${serviceAccount.project_id}.appspot.com`
        });

        console.log('[FIREBASE ADMIN] ✅ Initialisé avec succès via serviceAccountKey.json');
        return true;
      }
    } catch (error) {
      console.error('[FIREBASE ADMIN] ❌ Erreur avec serviceAccountKey.json:', error);
      // Continuer pour essayer les autres méthodes
    }
  }

  // Méthode 1: Utiliser les variables séparées (plus fiable)
  const serviceAccountType = process.env.FIREBASE_SERVICE_ACCOUNT_TYPE;
  const projectId = process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID;
  const privateKeyId = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID;
  const privateKey = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL;
  const clientId = process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_ID;
  const authUri = process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_URI;
  const tokenUri = process.env.FIREBASE_SERVICE_ACCOUNT_TOKEN_URI;
  const authProviderX509CertUrl = process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL;
  const clientX509CertUrl = process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL;

  if (serviceAccountType && projectId && privateKey && clientEmail) {
    console.log('[FIREBASE ADMIN] 🔧 Utilisation des variables séparées...');
    
    try {
      // Construire l'objet Service Account à partir des variables
      const cleanPrivateKey = privateKey
        .replace(/\\n/g, '\n') // Convertir les \\n en vraies nouvelles lignes
        .replace(/\r/g, '')     // Supprimer les retours chariot
        .trim();                // Supprimer les espaces en début/fin
      
      console.log('[FIREBASE ADMIN] Clé privée - longueur:', cleanPrivateKey.length);
      console.log('[FIREBASE ADMIN] Clé privée - début:', cleanPrivateKey.substring(0, 50));
      console.log('[FIREBASE ADMIN] Clé privée - fin:', cleanPrivateKey.substring(cleanPrivateKey.length - 50));
      
      const serviceAccount: ServiceAccount = {
        type: serviceAccountType as 'service_account',
        project_id: projectId,
        private_key_id: privateKeyId!,
        private_key: cleanPrivateKey,
        client_email: clientEmail,
        client_id: clientId!,
        auth_uri: authUri!,
        token_uri: tokenUri!,
        auth_provider_x509_cert_url: authProviderX509CertUrl!,
        client_x509_cert_url: clientX509CertUrl!
      };

      console.log('[FIREBASE ADMIN] ✅ Service Account construit avec succès');
      
      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId,
        databaseURL: `https://${projectId}-default-rtdb.firebaseio.com/`,
        storageBucket: `${projectId}.appspot.com`
      });

      console.log('[FIREBASE ADMIN] ✅ Initialisé avec succès via variables séparées');
      return true;

    } catch (error) {
      console.error('[FIREBASE ADMIN] ❌ Erreur avec variables séparées:', error);
    }
  }

  // Méthode 2 (fallback): Essayer l'encodage Base64 si disponible
  const serviceAccountEncoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (serviceAccountEncoded) {
    console.log('[FIREBASE ADMIN] 🔧 Tentative avec Base64...');
    
    try {
      const decoded = Buffer.from(serviceAccountEncoded, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(decoded) as ServiceAccount;

      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
        databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com/`,
        storageBucket: `${serviceAccount.project_id}.appspot.com`
      });

      console.log('[FIREBASE ADMIN] ✅ Initialisé avec succès via Base64');
      return true;

    } catch (error) {
      console.error('[FIREBASE ADMIN] ❌ Erreur avec Base64:', error);
    }
  }

  // Méthode 3 (fallback ultime): Configuration par défaut
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDEeSsGQaF_D8edXVFYXqv-OmfAh322BfRg',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'trae-33588.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'trae-33588',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'trae-33588.firebasestorage.app',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '783318756643',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:783318756643:web:581f8d18cf0016ebf07096'
  };

  console.log('[FIREBASE ADMIN] 🔧 Fallback: configuration par défaut');
  
  try {
    const app = initializeApp({
      projectId: firebaseConfig.projectId,
      databaseURL: `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com/`,
      storageBucket: firebaseConfig.storageBucket
    });

    console.log('[FIREBASE ADMIN] ⚠️ Initialisé en mode dégradé (sans Service Account)');
    return false; // Retourne false car sans Service Account, les fonctionnalités sont limitées

  } catch (error) {
    console.error('[FIREBASE ADMIN] ❌ Échec complet de l\'initialisation:', error);
    return false;
  }
}

// Export des services Firebase Admin
export const adminAuth = () => {
  if (getApps().length === 0) {
    initializeFirebaseAdmin();
  }
  try {
    return getAuth();
  } catch (error) {
    console.error('[FIREBASE ADMIN] Erreur lors de l\'accès à Auth:', error);
    return null;
  }
};

export const adminDb = () => {
  if (getApps().length === 0) {
    initializeFirebaseAdmin();
  }
  return getFirestore();
};

export const adminMessaging = () => {
  if (getApps().length === 0) {
    initializeFirebaseAdmin();
  }
  try {
    return getMessaging();
  } catch (error) {
    console.error('[FIREBASE ADMIN] Erreur lors de l\'accès à Messaging:', error);
    return null;
  }
};

// Initialisation automatique
if (typeof window === 'undefined') {
  // Côté serveur uniquement
  try {
    initializeFirebaseAdmin();
  } catch (error) {
    console.error('[FIREBASE ADMIN] Erreur lors de l\'initialisation automatique:', error);
  }
}
