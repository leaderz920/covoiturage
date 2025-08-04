import { adminDb, adminMessaging } from '@/lib/firebaseAdmin';
import { AnnouncementType } from '@/types';

// Types pour les notifications Firebase
export interface FCMNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  clickAction?: string;
  tag?: string;
}

export interface FCMDataPayload {
  [key: string]: string;
}

export interface NotificationTemplate {
  title: string;
  body: string;
  data?: FCMDataPayload;
  clickAction?: string;
}

// Templates de notifications pour différents événements
export const NOTIFICATION_TEMPLATES = {
  NEW_ANNOUNCEMENT: (announcement: AnnouncementType): NotificationTemplate => ({
    title: '🚗 Nouveau trajet disponible !',
    body: `${announcement.type === 'driver' ? 'Conducteur' : 'Passager'} recherche un covoiturage de ${announcement.from} vers ${announcement.to}`,
    data: {
      type: 'new_announcement',
      announcementId: announcement.id,
      from: announcement.from,
      to: announcement.to,
      userId: announcement.userId,
      price: announcement.price.toString(),
      date: announcement.date.toISOString()
    },
    clickAction: '/'
  }),
  
  ANNOUNCEMENT_MATCH: (announcement: AnnouncementType): NotificationTemplate => ({
    title: '🎯 Trajet correspondant trouvé !',
    body: `Un ${announcement.type === 'driver' ? 'conducteur' : 'passager'} propose ${announcement.from} → ${announcement.to}`,
    data: {
      type: 'announcement_match',
      announcementId: announcement.id,
      from: announcement.from,
      to: announcement.to,
      price: announcement.price.toString()
    },
    clickAction: '/'
  }),

  ANNOUNCEMENT_UPDATED: (announcement: AnnouncementType): NotificationTemplate => ({
    title: '📝 Annonce mise à jour',
    body: `Le trajet ${announcement.from} → ${announcement.to} a été modifié`,
    data: {
      type: 'announcement_updated',
      announcementId: announcement.id,
      from: announcement.from,
      to: announcement.to
    },
    clickAction: '/'
  }),

  CONTACT_REQUEST: (announcement: AnnouncementType, requesterName: string): NotificationTemplate => ({
    title: '📞 Demande de contact',
    body: `${requesterName} souhaite vous contacter pour le trajet ${announcement.from} → ${announcement.to}`,
    data: {
      type: 'contact_request',
      announcementId: announcement.id,
      requesterName,
      from: announcement.from,
      to: announcement.to
    },
    clickAction: '/'
  })
};

// Service principal de notifications
export class NotificationService {
  
  /**
   * Envoie une notification à tous les utilisateurs abonnés
   */
  static async sendToAllUsers(template: NotificationTemplate): Promise<boolean> {
    try {
      if (!adminDb || !adminMessaging) {
        console.error('[NOTIFICATION] Firebase Admin non configuré');
        return false;
      }

      // Récupération de tous les tokens FCM
      const tokensSnapshot = await adminDb.collection('fcm_tokens').get();
      
      if (tokensSnapshot.empty) {
        console.warn('[NOTIFICATION] Aucun token FCM trouvé');
        return false;
      }

      const tokens: string[] = [];
      tokensSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.token && data.active !== false) {
          tokens.push(data.token);
        }
      });

      if (tokens.length === 0) {
        console.warn('[NOTIFICATION] Aucun token actif trouvé');
        return false;
      }

      // Préparation du message
      const message = {
        notification: {
          title: template.title,
          body: template.body,
          imageUrl: '/EcoTrajet_Icon_500x500.png'
        },
        data: template.data || {},
        webpush: {
          headers: {
            'TTL': '86400' // 24 heures
          },
          notification: {
            title: template.title,
            body: template.body,
            icon: '/EcoTrajet_Icon_500x500.png',
            badge: '/EcoTrajet_Icon_500x500.png',
            tag: 'ecotrajet',
            requireInteraction: true,
            actions: [
              {
                action: 'view',
                title: 'Voir le trajet',
                icon: '/EcoTrajet_Icon_500x500.png'
              }
            ]
          },
          fcm_options: {
            link: template.clickAction || '/'
          }
        },
        tokens
      };

      // Envoi des notifications
      const response = await adminMessaging.sendEachForMulticast(message);
      
      console.log('[NOTIFICATION] Notifications envoyées:', {
        successCount: response.successCount,
        failureCount: response.failureCount,
        totalTokens: tokens.length
      });

      // Nettoyage des tokens invalides
      if (response.failureCount > 0) {
        await this.cleanupInvalidTokens(response.responses, tokens);
      }

      return response.successCount > 0;
    } catch (error) {
      console.error('[NOTIFICATION] Erreur lors de l\'envoi:', error);
      return false;
    }
  }

  /**
   * Envoie une notification à des utilisateurs spécifiques
   */
  static async sendToUsers(userIds: string[], template: NotificationTemplate): Promise<boolean> {
    try {
      if (!adminDb || !adminMessaging) {
        console.error('[NOTIFICATION] Firebase Admin non configuré');
        return false;
      }

      // Récupération des tokens pour les utilisateurs spécifiés
      const tokens: string[] = [];
      for (const userId of userIds) {
        const userTokensSnapshot = await adminDb
          .collection('fcm_tokens')
          .where('userId', '==', userId)
          .where('active', '==', true)
          .get();
          
        userTokensSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.token) {
            tokens.push(data.token);
          }
        });
      }

      if (tokens.length === 0) {
        console.warn('[NOTIFICATION] Aucun token trouvé pour les utilisateurs spécifiés');
        return false;
      }

      // Préparation et envoi du message
      const message = {
        notification: {
          title: template.title,
          body: template.body
        },
        data: template.data || {},
        webpush: {
          notification: {
            title: template.title,
            body: template.body,
            icon: '/EcoTrajet_Icon_500x500.png',
            badge: '/EcoTrajet_Icon_500x500.png',
            tag: 'ecotrajet-targeted'
          },
          fcm_options: {
            link: template.clickAction || '/'
          }
        },
        tokens
      };

      const response = await adminMessaging.sendEachForMulticast(message);
      
      console.log('[NOTIFICATION] Notifications ciblées envoyées:', {
        successCount: response.successCount,
        failureCount: response.failureCount,
        targetUsers: userIds.length
      });

      return response.successCount > 0;
    } catch (error) {
      console.error('[NOTIFICATION] Erreur lors de l\'envoi ciblé:', error);
      return false;
    }
  }

  /**
   * Notification pour nouvelle annonce
   */
  static async notifyNewAnnouncement(announcement: AnnouncementType): Promise<boolean> {
    console.log('[NOTIFICATION] Envoi notification nouvelle annonce:', announcement.id);
    
    const template = NOTIFICATION_TEMPLATES.NEW_ANNOUNCEMENT(announcement);
    return await this.sendToAllUsers(template);
  }

  /**
   * Notification de correspondance de trajet
   */
  static async notifyAnnouncementMatch(announcement: AnnouncementType, targetUserIds: string[]): Promise<boolean> {
    console.log('[NOTIFICATION] Envoi notification correspondance:', announcement.id);
    
    const template = NOTIFICATION_TEMPLATES.ANNOUNCEMENT_MATCH(announcement);
    return await this.sendToUsers(targetUserIds, template);
  }

  /**
   * Sauvegarde du token FCM pour un utilisateur
   */
  static async saveUserToken(userId: string, token: string, deviceInfo?: any): Promise<boolean> {
    try {
      if (!adminDb) {
        console.error('[NOTIFICATION] Firebase Admin non configuré');
        return false;
      }

      const tokenData = {
        userId,
        token,
        active: true,
        createdAt: new Date(),
        lastUsed: new Date(),
        deviceInfo: deviceInfo || {},
        platform: 'web'
      };

      // Utiliser le token comme ID de document pour éviter les doublons
      const tokenId = Buffer.from(token).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
      
      await adminDb.collection('fcm_tokens').doc(tokenId).set(tokenData, { merge: true });
      
      console.log('[NOTIFICATION] Token FCM sauvegardé pour l\'utilisateur:', userId);
      return true;
    } catch (error) {
      console.error('[NOTIFICATION] Erreur sauvegarde token:', error);
      return false;
    }
  }

  /**
   * Nettoyage des tokens invalides
   */
  private static async cleanupInvalidTokens(responses: any[], tokens: string[]): Promise<void> {
    try {
      if (!adminDb) return;

      const invalidTokens: string[] = [];
      responses.forEach((response, index) => {
        if (!response.success) {
          invalidTokens.push(tokens[index]);
        }
      });

      // Suppression des tokens invalides
      const batch = adminDb.batch();
      for (const token of invalidTokens) {
        const tokenId = Buffer.from(token).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
        const tokenRef = adminDb.collection('fcm_tokens').doc(tokenId);
        batch.update(tokenRef, { active: false, invalidatedAt: new Date() });
      }

      await batch.commit();
      console.log('[NOTIFICATION] Tokens invalides nettoyés:', invalidTokens.length);
    } catch (error) {
      console.error('[NOTIFICATION] Erreur nettoyage tokens:', error);
    }
  }

  /**
   * Recherche d'utilisateurs intéressés par un trajet
   */
  static async findInterestedUsers(announcement: AnnouncementType): Promise<string[]> {
    try {
      if (!adminDb) return [];

      // Recherche des utilisateurs avec des critères de recherche correspondants
      const interestedUsers: string[] = [];
      
      // Recherche des annonces opposées (conducteur cherche passager et vice versa)
      const oppositeType = announcement.type === 'driver' ? 'passenger' : 'driver';
      
      const similarAnnouncementsSnapshot = await adminDb
        .collection('announcements')
        .where('type', '==', oppositeType)
        .where('from', '==', announcement.from)
        .where('to', '==', announcement.to)
        .get();

      similarAnnouncementsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.userId && data.userId !== announcement.userId) {
          interestedUsers.push(data.userId);
        }
      });

      return [...new Set(interestedUsers)]; // Suppression des doublons
    } catch (error) {
      console.error('[NOTIFICATION] Erreur recherche utilisateurs intéressés:', error);
      return [];
    }
  }
}

export default NotificationService;
