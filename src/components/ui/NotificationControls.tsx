import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  getNotificationStatus, 
  initPushNotifications, 
  unsubscribeFromPush,
  sendTestNotification 
} from '@/lib/pushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NotificationControlsProps {
  className?: string;
}

export function NotificationControls({ className }: NotificationControlsProps) {
  const { currentUser } = useAuth();
  const [notificationStatus, setNotificationStatus] = useState({
    supported: false,
    permission: 'default' as NotificationPermission,
    subscribed: false
  });
  const [loading, setLoading] = useState(false);

  // Mise à jour du statut des notifications
  const updateStatus = () => {
    const status = getNotificationStatus();
    setNotificationStatus(status);
  };

  useEffect(() => {
    updateStatus();
    
    // Écouter les changements de permission
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Activation des notifications
  const handleEnableNotifications = async () => {
    if (!currentUser) {
      toast.error('Vous devez être connecté pour activer les notifications');
      return;
    }

    setLoading(true);
    try {
      const success = await initPushNotifications(currentUser.id);
      if (success) {
        toast.success('Notifications activées avec succès !', {
          icon: '🔔'
        });
        updateStatus();
      } else {
        toast.error('Impossible d\'activer les notifications');
      }
    } catch (error) {
      console.error('Erreur activation notifications:', error);
      toast.error('Erreur lors de l\'activation des notifications');
    } finally {
      setLoading(false);
    }
  };

  // Désactivation des notifications
  const handleDisableNotifications = async () => {
    setLoading(true);
    try {
      const success = await unsubscribeFromPush();
      if (success) {
        toast.success('Notifications désactivées');
        updateStatus();
      } else {
        toast.error('Impossible de désactiver les notifications');
      }
    } catch (error) {
      console.error('Erreur désactivation notifications:', error);
      toast.error('Erreur lors de la désactivation');
    } finally {
      setLoading(false);
    }
  };

  // Test des notifications
  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
      toast.success('Notification de test envoyée !');
    } catch (error) {
      console.error('Erreur test notification:', error);
      toast.error('Impossible d\'envoyer la notification de test');
    }
  };

  // Rendu conditionnel selon le support
  if (!notificationStatus.supported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-600">
            <span>🔕</span>
            Notifications non supportées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Votre navigateur ne supporte pas les notifications push.
            Veuillez utiliser un navigateur moderne pour profiter de cette fonctionnalité.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{notificationStatus.subscribed ? '🔔' : '🔕'}</span>
          Notifications Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut actuel */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Permission :</span>
            <span className={`font-medium ${
              notificationStatus.permission === 'granted' 
                ? 'text-green-600' 
                : notificationStatus.permission === 'denied'
                ? 'text-red-600'
                : 'text-yellow-600'
            }`}>
              {notificationStatus.permission === 'granted' ? 'Accordée' :
               notificationStatus.permission === 'denied' ? 'Refusée' : 'En attente'}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span>Statut :</span>
            <span className={`font-medium ${
              notificationStatus.subscribed ? 'text-green-600' : 'text-gray-600'
            }`}>
              {notificationStatus.subscribed ? 'Activées' : 'Désactivées'}
            </span>
          </div>
        </div>

        {/* Actions selon l'état */}
        <div className="space-y-2">
          {notificationStatus.permission === 'denied' ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 mb-2">
                Les notifications sont bloquées. Pour les activer :
              </p>
              <ol className="text-xs text-red-600 space-y-1 list-decimal list-inside">
                <li>Cliquez sur l'icône de cadenas dans la barre d'adresse</li>
                <li>Autorisez les notifications pour ce site</li>
                <li>Rechargez la page</li>
              </ol>
            </div>
          ) : notificationStatus.subscribed ? (
            <div className="space-y-2">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  ✅ Vous recevrez les notifications pour les nouveaux trajets !
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestNotification}
                  className="flex-1"
                >
                  Tester
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisableNotifications}
                  disabled={loading}
                  className="flex-1 text-red-600 hover:text-red-700"
                >
                  {loading ? 'Chargement...' : 'Désactiver'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  Activez les notifications pour être alerté des nouveaux trajets correspondant à vos recherches !
                </p>
              </div>
              
              <Button
                onClick={handleEnableNotifications}
                disabled={loading || !currentUser}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Activation...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>🔔</span>
                    Activer les notifications
                  </div>
                )}
              </Button>
              
              {!currentUser && (
                <p className="text-xs text-gray-500 text-center">
                  Connexion requise pour activer les notifications
                </p>
              )}
            </div>
          )}
        </div>

        {/* Informations supplémentaires */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Recevez des alertes en temps réel</p>
          <p>• Notifications pour trajets correspondants</p>
          <p>• Alertes de demandes de contact</p>
          <p>• Désactivation possible à tout moment</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default NotificationControls;
