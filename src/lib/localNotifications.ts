// Service de notifications locales (sans dépendance serveur/Firestore)

export interface LocalNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
}

class LocalNotificationService {
  private isInitialized = false;

  // Initialiser le service de notifications
  async initialize(): Promise<boolean> {
    try {
      // Vérifier le support des notifications
      if (!('Notification' in window)) {
        console.warn('[LOCAL_NOTIFICATIONS] Les notifications ne sont pas supportées');
        return false;
      }

      // Demander la permission si nécessaire
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        this.isInitialized = true;
        console.log('[LOCAL_NOTIFICATIONS] Service initialisé avec succès');
        return true;
      } else {
        console.warn('[LOCAL_NOTIFICATIONS] Permission refusée');
        return false;
      }
    } catch (error) {
      console.error('[LOCAL_NOTIFICATIONS] Erreur lors de l\'initialisation:', error);
      return false;
    }
  }

  // Envoyer une notification locale
  async sendNotification(options: LocalNotificationOptions): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          console.warn('[LOCAL_NOTIFICATIONS] Service non initialisé, abandon de la notification');
          return false;
        }
      }

      const notificationOptions: NotificationOptions = {
        body: options.body,
        icon: options.icon || '/EcoTrajet_Icon_500x500.png',
        badge: options.badge || '/EcoTrajet_Icon_500x500.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        data: options.data || {}
      };

      // Utiliser le Service Worker si disponible pour une meilleure persistance
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(options.title, {
            ...notificationOptions,
            actions: [
              {
                action: 'view',
                title: '👀 Voir',
                icon: '/EcoTrajet_Icon_500x500.png'
              },
              {
                action: 'dismiss',
                title: '✖️ Ignorer'
              }
            ]
          } as any); // Utiliser 'as any' pour contourner les limitations TypeScript
          console.log('[LOCAL_NOTIFICATIONS] Notification envoyée via Service Worker');
          return true;
        } catch (swError) {
          console.warn('[LOCAL_NOTIFICATIONS] Erreur Service Worker, fallback vers notification basique:', swError);
        }
      }

      // Fallback : notification basique du navigateur
      try {
        const notification = new Notification(options.title, notificationOptions);
        
        // Gérer les clics sur la notification
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          if (options.data?.url) {
            window.location.href = options.data.url;
          }
          notification.close();
        };

        console.log('[LOCAL_NOTIFICATIONS] Notification basique envoyée');
        return true;
      } catch (notificationError) {
        console.warn('[LOCAL_NOTIFICATIONS] Impossible d\'envoyer la notification basique:', notificationError);
        return false;
      }

    } catch (error) {
      console.error('[LOCAL_NOTIFICATIONS] Erreur lors de l\'envoi:', error);
      return false;
    }
  }

  // Notifications spécifiques pour les annonces
  async notifyNewAnnouncement(announcementData: {
    id: string;
    type: 'driver' | 'passenger';
    from: string;
    to: string;
    userName?: string;
  }): Promise<boolean> {
    const typeText = announcementData.type === 'driver' ? 'Conducteur' : 'Passager';
    const title = `🚗 Nouvelle annonce EcoTrajet !`;
    const body = `${typeText} : ${announcementData.from} → ${announcementData.to}`;

    return this.sendNotification({
      title,
      body,
      tag: `announcement-${announcementData.id}`,
      requireInteraction: false,
      data: {
        type: 'new_announcement',
        announcementId: announcementData.id,
        url: `/?announcement=${announcementData.id}`
      }
    });
  }

  // Notification de bienvenue
  async notifyWelcome(userName: string): Promise<boolean> {
    return this.sendNotification({
      title: '🎉 Bienvenue sur EcoTrajet !',
      body: `Salut ${userName} ! Votre première annonce a été publiée avec succès.`,
      tag: 'welcome',
      requireInteraction: false,
      data: {
        type: 'welcome',
        url: '/'
      }
    });
  }

  // Notification de succès de publication
  async notifyPublishSuccess(announcementData: {
    type: 'driver' | 'passenger';
    from: string;
    to: string;
  }): Promise<boolean> {
    const typeText = announcementData.type === 'driver' ? 'conducteur' : 'passager';
    
    return this.sendNotification({
      title: '✅ Annonce publiée !',
      body: `Votre annonce ${typeText} pour ${announcementData.from} → ${announcementData.to} est maintenant visible.`,
      tag: 'publish-success',
      requireInteraction: false,
      data: {
        type: 'publish_success',
        url: '/'
      }
    });
  }

  // Vérifier le statut des notifications
  getNotificationStatus(): {
    supported: boolean;
    permission: NotificationPermission;
    initialized: boolean;
  } {
    return {
      supported: 'Notification' in window,
      permission: 'Notification' in window ? Notification.permission : 'denied',
      initialized: this.isInitialized
    };
  }
}

// Instance singleton du service
export const localNotificationService = new LocalNotificationService();

// Fonctions utilitaires pour faciliter l'utilisation
export const sendLocalNotification = (options: LocalNotificationOptions) => 
  localNotificationService.sendNotification(options);

export const notifyNewAnnouncement = (announcementData: {
  id: string;
  type: 'driver' | 'passenger';
  from: string;
  to: string;
  userName?: string;
}) => localNotificationService.notifyNewAnnouncement(announcementData);

export const notifyPublishSuccess = (announcementData: {
  type: 'driver' | 'passenger';
  from: string;
  to: string;
}) => localNotificationService.notifyPublishSuccess(announcementData);

export const initializeLocalNotifications = () => localNotificationService.initialize();
