import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '../../../../lib/firebaseAdmin';
import { MulticastMessage } from 'firebase-admin/messaging';

interface NotificationData {
  type: string;
  announcementId: string;
  tokens: string[];
  title: string;
  body: string;
  data?: { [key: string]: string };
}

export async function POST(request: Request) {
  const db = adminDb();
  const messaging = adminMessaging();

  if (!db || !messaging) {
    return NextResponse.json(
      { success: false, message: "Erreur: les services Firebase Admin ne sont pas initialisés." },
      { status: 500 }
    );
  }

  try {
    const notificationData: Partial<NotificationData> = await request.json();
    let { tokens } = notificationData;
    const { title, body, data, type, announcementId } = notificationData;

    // Validation des champs requis
    if (!type || !announcementId) {
      return NextResponse.json(
        { error: 'Les champs requis type et announcementId sont manquants' },
        { status: 400 }
      );
    }

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      // Si aucun token n'est fourni, récupérer tous les tokens d'abonnement
      console.log('[NOTIFICATIONS] Aucun token fourni, récupération de tous les abonnements...');
      
      try {
        const subscriptionsSnapshot = await db.collection('subscriptions').get();
        const allTokens: string[] = [];
        
        subscriptionsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.endpoint && data.keys) {
            // Pour les notifications FCM, nous devons utiliser le token FCM stocké
            if (data.token) {
              allTokens.push(data.token);
            }
          }
        });
        
        if (allTokens.length === 0) {
          console.warn('[NOTIFICATIONS] Aucun token d\'abonnement trouvé');
          return NextResponse.json(
            { success: false, message: 'Aucun token d\'abonnement trouvé.' },
            { status: 400 }
          );
        }
        
        tokens = allTokens;
        console.log(`[NOTIFICATIONS] ${tokens.length} tokens récupérés automatiquement`);
        
      } catch (error) {
        console.error('[NOTIFICATIONS] Erreur lors de la récupération des abonnements:', error);
        return NextResponse.json(
          { success: false, message: 'Erreur lors de la récupération des abonnements.' },
          { status: 500 }
        );
      }
    }

    const message: MulticastMessage = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        ...data,
        url: data?.url || `/announcements/${announcementId}`,
      },
      tokens: tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    
    const failedTokens = response.responses
      .map((resp, idx) => (resp.success ? null : tokens[idx]))
      .filter((token): token is string => token !== null);

    if (failedTokens.length > 0) {
      console.warn(`Échec de l'envoi de notifications à ${failedTokens.length} tokens.`, failedTokens);
    }

    // Enregistrement du log de notification
    const notificationLog = {
      type,
      announcementId,
      title,
      body,
      data: message.data,
      tokens,
      sentAt: new Date(),
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens: failedTokens,
    };

    const logRef = await db.collection('notificationLogs').add(notificationLog);
    
    return NextResponse.json({ 
      success: true, 
      message: `Notifications envoyées avec succès à ${response.successCount} tokens.`,
      logId: logRef.id 
    });

  } catch (error) {
    console.error("Erreur lors de l'envoi des notifications :", error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json(
      { success: false, message: `Erreur interne du serveur: ${errorMessage}` },
      { status: 500 }
    );
  }
}
