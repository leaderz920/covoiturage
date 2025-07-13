import { cert, getApps, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

export let adminDb: ReturnType<typeof getFirestore> | undefined;

if (serviceAccountBase64) {
  try {
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountBase64, 'base64').toString('utf8')
    ) as ServiceAccount;

    const adminApp = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert(serviceAccount) });

    adminDb = getFirestore(adminApp);
  } catch (e) {
    console.error('Failed to initialize Firebase Admin', e);
  }
}
