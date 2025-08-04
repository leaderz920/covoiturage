import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import webpush from 'web-push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_CONTACT_EMAIL = process.env.VAPID_CONTACT_EMAIL || 'example@example.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${VAPID_CONTACT_EMAIL}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export async function POST(request: Request) {
  // Contrôle explicite de la méthode HTTP (utile si Next.js change le comportement par défaut)
  if (request.method && request.method !== 'POST') {
    console.warn('[API] Méthode non autorisée:', request.method);
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  try {
    const payload = await request.json();
    console.log('[API] Notification request body:', payload);
    const message = JSON.stringify(payload);
    if (!adminDb) {
      console.error('[API] Firestore non configuré');
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      );
    }
    const subsSnapshot = await adminDb.collection('subscriptions').get();
    console.log('[API] Nombre de souscriptions trouvées:', subsSnapshot.size);
    const sendPromises: Promise<void>[] = [];
    subsSnapshot.forEach(doc => {
      const sub = doc.data() as webpush.PushSubscription;
      sendPromises.push(
        webpush.sendNotification(sub, message)
          .then(() => {
            console.log('[API] Notification envoyée à:', sub.endpoint);
          })
          .catch(err => {
            console.error('[API] Erreur envoi à', sub.endpoint, err);
          })
      );
    });
    await Promise.all(sendPromises);
    console.log('[API] Notifications push envoyées à tous les abonnés');
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[API] Send error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
