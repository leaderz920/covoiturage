import { NextResponse } from 'next/server';
import { adminDb, initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import NotificationService from '@/services/notificationService';
import { AnnouncementType } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface NotificationRequest {
  type: 'new_announcement' | 'announcement_match' | 'announcement_updated' | 'contact_request';
  announcementId: string;
  targetUsers?: string[];
  metadata?: any;
}

export async function POST(request: Request) {
  console.log('[NOTIFICATION API] === Début de la route POST /api/notifications/send ===');
  
  try {
    // Validation de l'authentification (optionnelle pour les webhooks internes)
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    
    // Vérification de la clé API interne pour les déclenchements automatiques
    if (apiKey !== process.env.INTERNAL_API_KEY && !authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lecture des données de la requête
    let notificationData: NotificationRequest;
    try {
      notificationData = await request.json();
    } catch (err) {
      return NextResponse.json({ 
        error: 'Invalid JSON body', 
        details: String(err) 
      }, { status: 400 });
    }

    if (!notificationData.type || !notificationData.announcementId) {
      return NextResponse.json({ 
        error: 'Missing required fields: type, announcementId' 
      }, { status: 400 });
    }

    // Récupération des détails de l'annonce
    if (!adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const announcementDoc = await adminDb
      .collection('announcements')
      .doc(notificationData.announcementId)
      .get();

    if (!announcementDoc.exists) {
      return NextResponse.json({ 
        error: 'Announcement not found' 
      }, { status: 404 });
    }

    const announcementData = announcementDoc.data() as AnnouncementType;
    
    // Conversion de la date Firestore en Date JavaScript
    if (announcementData.date && typeof announcementData.date === 'object') {
      announcementData.date = (announcementData.date as any).toDate();
    }
    if (announcementData.createdAt && typeof announcementData.createdAt === 'object') {
      announcementData.createdAt = (announcementData.createdAt as any).toDate();
    }

    let success = false;

    // Traitement selon le type de notification
    switch (notificationData.type) {
      case 'new_announcement':
        console.log('[NOTIFICATION API] Traitement nouvelle annonce');
        
        // Notification à tous les utilisateurs
        success = await NotificationService.notifyNewAnnouncement(announcementData);
        
        // Recherche et notification des utilisateurs potentiellement intéressés
        const interestedUsers = await NotificationService.findInterestedUsers(announcementData);
        if (interestedUsers.length > 0) {
          console.log('[NOTIFICATION API] Utilisateurs intéressés trouvés:', interestedUsers.length);
          await NotificationService.notifyAnnouncementMatch(announcementData, interestedUsers);
        }
        break;

      case 'announcement_match':
        console.log('[NOTIFICATION API] Traitement correspondance d\'annonce');
        if (notificationData.targetUsers && notificationData.targetUsers.length > 0) {
          success = await NotificationService.notifyAnnouncementMatch(
            announcementData, 
            notificationData.targetUsers
          );
        } else {
          return NextResponse.json({ 
            error: 'targetUsers required for announcement_match' 
          }, { status: 400 });
        }
        break;

      case 'announcement_updated':
        console.log('[NOTIFICATION API] Traitement mise à jour d\'annonce');
        success = await NotificationService.sendToAllUsers({
          title: '📝 Annonce mise à jour',
          body: `Le trajet ${announcementData.from} → ${announcementData.to} a été modifié`,
          data: {
            type: 'announcement_updated',
            announcementId: announcementData.id,
            from: announcementData.from,
            to: announcementData.to
          },
          clickAction: '/'
        });
        break;

      case 'contact_request':
        console.log('[NOTIFICATION API] Traitement demande de contact');
        if (notificationData.targetUsers && notificationData.targetUsers.length > 0) {
          const requesterName = notificationData.metadata?.requesterName || 'Un utilisateur';
          success = await NotificationService.sendToUsers(notificationData.targetUsers, {
            title: '📞 Demande de contact',
            body: `${requesterName} souhaite vous contacter pour le trajet ${announcementData.from} → ${announcementData.to}`,
            data: {
              type: 'contact_request',
              announcementId: announcementData.id,
              requesterName,
              from: announcementData.from,
              to: announcementData.to
            },
            clickAction: '/'
          });
        } else {
          return NextResponse.json({ 
            error: 'targetUsers required for contact_request' 
          }, { status: 400 });
        }
        break;

      default:
        return NextResponse.json({ 
          error: 'Invalid notification type' 
        }, { status: 400 });
    }

    // Enregistrement de l'événement de notification
    try {
      await adminDb.collection('notification_logs').add({
        type: notificationData.type,
        announcementId: notificationData.announcementId,
        targetUsers: notificationData.targetUsers || [],
        success,
        timestamp: new Date(),
        metadata: notificationData.metadata || {}
      });
    } catch (logError) {
      console.warn('[NOTIFICATION API] Erreur lors de l\'enregistrement du log:', logError);
      // Non bloquant
    }

    console.log('[NOTIFICATION API] === Fin de la route POST /api/notifications/send ===');
    return NextResponse.json({ 
      success,
      message: success ? 'Notifications envoyées avec succès' : 'Échec de l\'envoi des notifications'
    });

  } catch (error) {
    console.error('[NOTIFICATION API] Erreur inattendue:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(error) 
    }, { status: 500 });
  }
}

// Route GET pour vérifier le statut des notifications
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    let stats = {
      totalNotifications: 0,
      activeTokens: 0,
      recentNotifications: []
    };

    // Statistiques générales
    const notificationLogsSnapshot = await adminDb
      .collection('notification_logs')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    stats.totalNotifications = notificationLogsSnapshot.size;
    stats.recentNotifications = notificationLogsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Tokens actifs
    const activeTokensSnapshot = await adminDb
      .collection('fcm_tokens')
      .where('active', '==', true)
      .get();

    stats.activeTokens = activeTokensSnapshot.size;

    // Statistiques par utilisateur si spécifié
    if (userId) {
      const userTokensSnapshot = await adminDb
        .collection('fcm_tokens')
        .where('userId', '==', userId)
        .where('active', '==', true)
        .get();

      stats = {
        ...stats,
        userTokens: userTokensSnapshot.size,
        lastActivity: userTokensSnapshot.docs[0]?.data()?.lastUsed || null
      };
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[NOTIFICATION API] Erreur GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
