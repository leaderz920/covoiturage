import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import webpush from 'web-push';
import { getAuth } from 'firebase-admin/auth';

export async function POST(request: Request) {
  console.log('[PUSH SUBSCRIBE] === Début de la route POST /api/push/subscribe ===');
  try {
    // Étape 1 : lecture du body
    let subscription: webpush.PushSubscription | null = null;
    try {
      subscription = (await request.json()) as webpush.PushSubscription;
      console.log('[PUSH SUBSCRIBE] Subscription reçue:', JSON.stringify(subscription));
    } catch (err) {
      console.error('[PUSH SUBSCRIBE] Erreur lors du parsing du body:', err);
      return NextResponse.json({ error: 'Invalid JSON body', details: String(err) }, { status: 400 });
    }

    // Étape 2 : vérification endpoint
    if (!subscription?.endpoint) {
      console.error('[PUSH SUBSCRIBE] Subscription sans endpoint:', subscription);
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // Étape 3 : vérification adminDb
    if (!adminDb) {
      console.error('[PUSH SUBSCRIBE] adminDb non configuré');
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      );
    }

    // Étape 4 : log de l'en-tête Authorization
    const authHeader = request.headers.get('authorization');
    console.log('[PUSH SUBSCRIBE] Authorization header reçu:', authHeader);

    // Étape 5 : écriture Firestore
    const docId = encodeURIComponent(subscription.endpoint);
    console.log('[PUSH SUBSCRIBE] Tentative d’écriture dans Firestore: subscriptions/' + docId);
    try {
      await adminDb.collection('subscriptions').doc(docId).set(subscription);
      console.log('[PUSH SUBSCRIBE] Document subscriptions/' + docId + ' créé avec succès');
    } catch (firestoreError) {
      console.error('[PUSH SUBSCRIBE] Erreur lors de l’écriture Firestore:', firestoreError);
      return NextResponse.json({ error: 'Firestore write error', details: String(firestoreError) }, { status: 500 });
    }
    console.log('[PUSH SUBSCRIBE] === Fin de la route POST /api/push/subscribe ===');
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[PUSH SUBSCRIBE] Erreur inattendue dans la route:', e);
    return NextResponse.json({ error: 'Internal server error', details: String(e) }, { status: 500 });
  }
}
