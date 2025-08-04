import { cert, getApps, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const serviceAccountEncoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

export let adminDb: ReturnType<typeof getFirestore> | undefined;
export let adminMessaging: ReturnType<typeof getMessaging> | undefined;

if (serviceAccountEncoded) {
  try {
    const decoded = Buffer.from(serviceAccountEncoded, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(decoded) as ServiceAccount;

    const adminApp = getApps().length
      ? getApps()[0]
      : initializeApp({ 
          credential: cert(serviceAccount),
          projectId: serviceAccount.projectId || (serviceAccount as any).project_id
        });

    adminDb = getFirestore(adminApp);
    adminMessaging = getMessaging(adminApp);
    
    console.log('[FIREBASE ADMIN] Firestore et Messaging initialisés avec succès');
  } catch (e) {
    console.error('Failed to initialize Firebase Admin', e);
  }
} else {
  console.warn('[FIREBASE ADMIN] FIREBASE_SERVICE_ACCOUNT_BASE64 non défini');
}
