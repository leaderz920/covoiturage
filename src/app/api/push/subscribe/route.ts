import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const subscription = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ success: false, message: 'Invalid subscription object' }, { status: 400 });
    }

    // Utiliser l'endpoint comme ID unique pour éviter les doublons
    const subscriptionId = Buffer.from(subscription.endpoint).toString('base64');

    await adminDb.collection('subscriptions').doc(subscriptionId).set({
      ...subscription,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de l'abonnement push :", error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, message: `Erreur interne du serveur: ${errorMessage}` }, { status: 500 });
  }
}
