import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import NotificationService from '@/services/notificationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SubscriptionRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: string;
  deviceInfo?: any;
}

export async function POST(request: Request) {
  console.log('[FCM SUBSCRIBE] === Début de la route POST /api/push/subscribe ===');
  
  try {
    // Étape 1 : lecture et validation du body
    let subscriptionData: SubscriptionRequest;
    try {
      subscriptionData = await request.json();
      console.log('[FCM SUBSCRIBE] Données de souscription reçues');
    } catch (err) {
      console.error('[FCM SUBSCRIBE] Erreur parsing JSON:', err);
      return NextResponse.json({ 
        error: 'Invalid JSON body', 
        details: String(err) 
      }, { status: 400 });
    }

    // Étape 2 : validation des données
    if (!subscriptionData?.endpoint || !subscriptionData?.keys?.p256dh || !subscriptionData?.keys?.auth) {
      console.error('[FCM SUBSCRIBE] Données de souscription invalides:', subscriptionData);
      return NextResponse.json({ 
        error: 'Invalid subscription data' 
      }, { status: 400 });
    }

    // Étape 3 : vérification adminDb
    if (!adminDb) {
      console.error('[FCM SUBSCRIBE] Firebase Admin non configuré');
      return NextResponse.json({
        error: 'Server not configured'
      }, { status: 500 });
    }

    // Étape 4 : gestion de l'authentification (optionnelle)
    let userId = subscriptionData.userId;
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decodedToken = await getAuth().verifyIdToken(token);
        userId = decodedToken.uid;
        console.log('[FCM SUBSCRIBE] Utilisateur authentifié:', userId);
      } catch (authError) {
        console.warn('[FCM SUBSCRIBE] Token d\'authentification invalide:', authError);
        // Continue sans authentification
      }
    }

    // Étape 5 : création d'un token FCM fictif (pour compatibilité)
    // Dans un vrai système FCM, vous obtiendriez ce token côté client
    const fcmToken = `web-token-${Buffer.from(subscriptionData.endpoint).toString('base64').slice(0, 20)}`;

    // Étape 6 : sauvegarde du token et de l'abonnement
    try {
      // Sauvegarde de l'abonnement push (format existant)
      const subscriptionId = encodeURIComponent(subscriptionData.endpoint);
      await adminDb.collection('subscriptions').doc(subscriptionId).set({
        ...subscriptionData,
        createdAt: new Date(),
        lastUsed: new Date(),
        userId: userId || null
      });

      // Sauvegarde du token FCM (nouveau format)
      if (userId) {
        const success = await NotificationService.saveUserToken(
          userId, 
          fcmToken, 
          {
            endpoint: subscriptionData.endpoint,
            userAgent: request.headers.get('user-agent'),
            ...subscriptionData.deviceInfo
          }
        );
        
        if (success) {
          console.log('[FCM SUBSCRIBE] Token FCM sauvegardé avec succès');
        }
      }

      console.log('[FCM SUBSCRIBE] Abonnement sauvegardé avec succès');
    } catch (firestoreError) {
      console.error('[FCM SUBSCRIBE] Erreur Firestore:', firestoreError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: String(firestoreError) 
      }, { status: 500 });
    }

    // Étape 7 : notification de test (optionnelle)
    if (userId) {
      try {
        await NotificationService.sendToUsers([userId], {
          title: '🎉 Notifications activées !',
          body: 'Vous recevrez maintenant les notifications EcoTrajet',
          data: {
            type: 'welcome',
            timestamp: new Date().toISOString()
          },
          clickAction: '/'
        });
        console.log('[FCM SUBSCRIBE] Notification de bienvenue envoyée');
      } catch (notifError) {
        console.warn('[FCM SUBSCRIBE] Erreur notification de bienvenue:', notifError);
        // Non bloquant
      }
    }

    console.log('[FCM SUBSCRIBE] === Fin de la route POST /api/push/subscribe ===');
    return NextResponse.json({ 
      success: true,
      message: 'Notifications configurées avec succès'
    });

  } catch (error) {
    console.error('[FCM SUBSCRIBE] Erreur inattendue:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(error) 
    }, { status: 500 });
  }
}

// Route pour désabonner un utilisateur
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const userId = searchParams.get('userId');

    if (!adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Suppression de l'abonnement push
    if (endpoint) {
      const subscriptionId = encodeURIComponent(endpoint);
      await adminDb.collection('subscriptions').doc(subscriptionId).delete();
    }

    // Désactivation des tokens FCM de l'utilisateur
    if (userId) {
      const tokensSnapshot = await adminDb
        .collection('fcm_tokens')
        .where('userId', '==', userId)
        .get();

      const batch = adminDb.batch();
      tokensSnapshot.forEach(doc => {
        batch.update(doc.ref, { active: false, unsubscribedAt: new Date() });
      });
      await batch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[FCM UNSUBSCRIBE] Erreur:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
