import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import webpush from 'web-push';

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
  try {
    const payload = await request.json();
    const message = JSON.stringify(payload);
  if (!adminDb) {
    return NextResponse.json(
      { error: 'Server not configured' },
      { status: 500 }
    );
  }
  const subsSnapshot = await adminDb.collection('subscriptions').get();
  const sendPromises: Promise<void>[] = [];
  subsSnapshot.forEach(doc => {
    const sub = doc.data() as webpush.PushSubscription;
    sendPromises.push(
      webpush.sendNotification(sub, message).catch(err => {
        console.error('Push error', err);
      })
    );
  });
    await Promise.all(sendPromises);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Send error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
