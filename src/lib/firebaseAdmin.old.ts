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
    console.log('[FIREBASE ADMIN] Décodage du Service Account...');
    
    // Décodage simple du Base64 proprement encodé
    const decoded = Buffer.from(serviceAccountEncoded, 'base64').toString('utf8');
    
    // Debug: voir la structure
    console.log('[FIREBASE ADMIN] Premier caractère:', decoded.charAt(0), decoded.charCodeAt(0));
    console.log('[FIREBASE ADMIN] Échantillon du JSON:', decoded.substring(0, 50));
    
    // Approche alternative : utiliser JSON.parse avec un replacer pour gérer les clés privées
    // D'abord, transformer le JSON en échappant les nouvelles lignes dans private_key seulement
    const lines = decoded.split('\n');
    let inPrivateKey = false;
    const fixedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('"private_key":')) {
        inPrivateKey = true;
        // Commencer la reconstruction de la clé privée
        let privateKeyContent = line;
        i++; // Passer à la ligne suivante
        
        // Collecter toutes les lignes jusqu'à la fin de la clé privée
        while (i < lines.length && !lines[i].includes('-----END PRIVATE KEY-----')) {
          privateKeyContent += '\\n' + lines[i].trim();
          i++;
        }
        
        // Ajouter la ligne de fin
        if (i < lines.length) {
          privateKeyContent += '\\n' + lines[i].trim() + '",';
        }
        
        fixedLines.push(privateKeyContent);
        inPrivateKey = false;
      } else if (!inPrivateKey) {
        fixedLines.push(line);
      }
    }
    
    const fixedJson = fixedLines.join('\n');
    console.log('[FIREBASE ADMIN] JSON reconstruit, tentative de parsing...');
    const serviceAccount = JSON.parse(fixedJson) as ServiceAccount;
    
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
    
    console.log('[FIREBASE ADMIN] ✅ Firestore et Messaging initialisés avec succès');
    console.log('[FIREBASE ADMIN] ✅ Project ID:', (serviceAccount as any).project_id || serviceAccount.projectId);
    return true;
  } catch (e) {
    console.error('[FIREBASE ADMIN] ❌ Erreur d\'initialisation:', e);
    return false;
  }
}

// Initialisation conditionnelle - pas pendant le build
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Initialiser si variables d'environnement présentes
  if (serviceAccountEncoded) {
    initializeFirebaseAdmin();
  }
}
