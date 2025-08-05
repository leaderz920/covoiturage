import { NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebaseAdmin';
import webpush from 'web-push';

// Configuration de web-push
if (process.env.NEXT_PUBLIC_VAPID_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:votre-email@example.com',
    process.env.NEXT_PUBLIC_VAPID_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("Les clés VAPID ne sont pas définies. L'envoi de notifications push échouera.");
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const db = adminDb();

    const subscriptionsSnapshot = await db.collection('subscriptions').get();
    
    if (subscriptionsSnapshot.empty) {
      console.log("Aucun abonnement trouvé pour l'envoi de notifications.");
      return NextResponse.json({ success: true, message: "Aucun abonnement trouvé." });
    }

    const notificationPromises = subscriptionsSnapshot.docs.map(doc => {
      const subscription = doc.data();
      return webpush.sendNotification(subscription, JSON.stringify(payload))
        .catch(error => {
          console.error(`Erreur lors de l'envoi à ${subscription.endpoint}:`, error);
          // Si l'abonnement est expiré (code 410), on peut le supprimer
          if (error.statusCode === 410) {
            return doc.ref.delete();
          }
        });
    });

    await Promise.all(notificationPromises);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur lors de l'envoi des notifications push :", error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, message: `Erreur interne du serveur: ${errorMessage}` }, { status: 500 });
  }
}
