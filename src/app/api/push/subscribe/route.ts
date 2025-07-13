import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import webpush from 'web-push';

export async function POST(request: Request) {
  try {
    const subscription = (await request.json()) as webpush.PushSubscription;
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      );
    }
    const docId = encodeURIComponent(subscription.endpoint);
    await adminDb.collection('subscriptions').doc(docId).set(subscription);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Subscribe error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
