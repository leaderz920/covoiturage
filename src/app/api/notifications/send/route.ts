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
    const { tokens, title, body, data, type, announcementId } = notificationData;

    // Validation des champs requis
    if (!type || !announcementId) {
      return NextResponse.json(
        { error: 'Les champs requis type et announcementId sont manquants' },
        { status: 400 }
      );
    }

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Erreur : Aucun token fourni.' },
        { status: 400 }
      );
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
