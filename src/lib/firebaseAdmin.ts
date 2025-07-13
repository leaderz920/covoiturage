import { cert, getApps, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountEncoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

export let adminDb: ReturnType<typeof getFirestore> | undefined;

if (serviceAccountEncoded) {
  try {
    const decoded = serviceAccountEncoded.trim().startsWith('{')
      ? serviceAccountEncoded
      : Buffer.from(serviceAccountEncoded, 'base64').toString('utf8');

    const serviceAccount = JSON.parse(decoded) as ServiceAccount;

    const adminApp = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert(serviceAccount) });

    adminDb = getFirestore(adminApp);
  } catch (e) {
    console.error('Failed to initialize Firebase Admin', e);
  }
}
