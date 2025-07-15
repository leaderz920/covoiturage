import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnnouncementType } from '@/types';
import { formatVehicleType, getVehicleIconAndColor } from '@/utils/formatVehicleType';

interface ExtendedAnnouncementType extends AnnouncementType {
  _source?: string; // Propriu00e9tu00e9 optionnelle pour le du00e9bogage
}
import { ContactModal } from "../modals/ContactModal";
// Temporairement commenté en attendant l'installation de date-fns
// import { formatDistanceToNow } from 'date-fns';
// import { fr } from 'date-fns/locale';

interface AnnouncementCardProps {
  announcement: ExtendedAnnouncementType;
  onClick?: () => void;
  showContact?: boolean;
}

export function AnnouncementCard({ announcement, onClick, showContact = false }: AnnouncementCardProps) {
  const [contactModalOpen, setContactModalOpen] = useState(false);
  // Fonction sécurisée pour formater les dates sans erreurs de console
  const formatDate = (date: any) => {
    // Retourner directement le texte par défaut pour toute valeur non valide
    if (!date) {
      return 'Date non disponible';
    }

    // Utiliser une approche plus simple et robuste pour éviter les erreurs de console
    let timestamp = 0;
    
    try {
      // Transformer la date en timestamp de manière sécurisée
      if (date instanceof Date) {
        timestamp = date.getTime();
      } else if (typeof date === 'object') {
        // Cas des timestamps Firestore
        if ('seconds' in date && typeof date.seconds === 'number') {
          timestamp = date.seconds * 1000;
        } 
        // Cas des objets Firestore avec toDate()
        else if ('toDate' in date && typeof date.toDate === 'function') {
          const dateObj = date.toDate();
          if (dateObj instanceof Date) {
            timestamp = dateObj.getTime();
          }
        }
      } else if (typeof date === 'string') {
        const parsedDate = new Date(date);
        timestamp = parsedDate.getTime();
      } else if (typeof date === 'number') {
        timestamp = date;
      }
      
      // Si le timestamp n'est pas valide, retourner le texte par défaut
      if (!timestamp || isNaN(timestamp)) {
        return 'Date non disponible';
      }
      
      // Créer une nouvelle date et la formater
      const dateObj = new Date(timestamp);
      if (isNaN(dateObj.getTime())) {
        return 'Date non disponible';
      }
      
      // Formater la date sans erreur
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric', 
        month: 'long', 
        year: 'numeric'
      }).format(dateObj);
    } catch {
      // Ignorer silencieusement l'erreur (pas de console.error)
      return 'Date non disponible';
    }
  };

  // Calculer le temps écoulé depuis la publication
  const getTimeAgo = (createdAt: any) => {
    // Retourner directement le texte par défaut pour toute valeur non valide
    if (!createdAt) {
      return 'Date inconnue';
    }
    
    // Utiliser une approche plus simple et robuste pour éviter les erreurs de console
    let timestamp = 0;
    
    try {
      // Transformer la date en timestamp de manière sécurisée
      if (createdAt instanceof Date) {
        timestamp = createdAt.getTime();
      } else if (typeof createdAt === 'object') {
        // Cas des timestamps Firestore
        if ('seconds' in createdAt && typeof createdAt.seconds === 'number') {
          timestamp = createdAt.seconds * 1000;
        } 
        // Cas des objets Firestore avec toDate()
        else if ('toDate' in createdAt && typeof createdAt.toDate === 'function') {
          const dateObj = createdAt.toDate();
          if (dateObj instanceof Date) {
            timestamp = dateObj.getTime();
          }
        }
      } else if (typeof createdAt === 'string') {
        const parsedDate = new Date(createdAt);
        timestamp = parsedDate.getTime();
      } else if (typeof createdAt === 'number') {
        timestamp = createdAt;
      }
      
      // Si le timestamp n'est pas valide, retourner le texte par défaut
      if (!timestamp || isNaN(timestamp)) {
        return 'Date inconnue';
      }
      
      // Créer une nouvelle date
      const dateObj = new Date(timestamp);
      if (isNaN(dateObj.getTime())) {
        return 'Date inconnue';
      }
      
      // Temporairement remplacé en attendant l'installation de date-fns
      // return formatDistanceToNow(dateObj, { addSuffix: true, locale: fr });
      const now = new Date();
      const diffMs = now.getTime() - dateObj.getTime();
      
      // Conversion en minutes, heures et jours
      const diffMins = Math.round(diffMs / 60000);
      const diffHours = Math.round(diffMs / 3600000);
      const diffDays = Math.round(diffMs / 86400000);
      
      if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
      if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
      if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
      
      // Format simple pour les dates plus anciennes
      return `Le ${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
    } catch (error) {
      console.error('Erreur lors du calcul du temps écoulé:', error);
      return 'Récemment';
    }
  };
  
  // Gérer le clic sur le numéro de téléphone
  const handlePhoneClick = () => {
    // Vérifier si l'annonce a un numéro de téléphone avant d'ouvrir la modale
    if (announcement.phoneNumber || announcement.phone) {
      setContactModalOpen(true);
    }
  };

  return (
    <Card 
      className="bg-white rounded-xl shadow-sm p-0 overflow-hidden hover:shadow-md transition-shadow duration-200"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="inline-flex items-center gap-1">
            <span className="px-2 py-1 rounded-full text-xs font-medium" 
              style={{
                backgroundColor: announcement.type === 'driver' ? '#e0f2fe' : '#fef3c7',
                color: announcement.type === 'driver' ? '#0284c7' : '#b45309'
              }}>
              {announcement.type === 'driver' ? 'Conducteur' : 'Passager'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {getTimeAgo(announcement.createdAt)}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start">
          <div className="w-full sm:w-auto">
            <div className="flex items-center mb-2">
              <div className="flex flex-col items-center mr-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <div className="w-0.5 h-6 bg-gray-300 my-1"></div>
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
              </div>
              <div className="w-full sm:w-auto overflow-hidden">
                <p className="font-medium truncate"><span className="text-blue-500 font-medium">Départ:</span> {announcement.from}</p>
                <p className="font-medium truncate"><span className="text-red-500 font-medium">Destination:</span> {announcement.to}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center text-sm text-gray-500">
              <i className="far fa-calendar-alt mr-2"></i>
              <span className="whitespace-nowrap">{formatDate(announcement.date)} • {announcement.time}</span>
            </div>
          </div>
          <div className="text-right">
            {announcement.type === 'driver' && (
              <div className="text-lg font-bold text-blue-600">
                {announcement.price} FCFA
              </div>
            )}
            {announcement.seats && (
              <div className="text-sm text-gray-500 flex items-center">
                <i className="fas fa-user-friends mr-1 text-gray-500"></i>
                <span>{announcement.seats} place{announcement.seats > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
        {announcement.vehiclePhotoUrl && (
          <div className="mt-3 flex justify-center">
            <img 
              src={announcement.vehiclePhotoUrl} 
              alt="Véhicule" 
              className="w-full h-48 object-cover rounded-lg shadow-sm"
              onError={(e) => {
                // En cas d'erreur de chargement de l'image
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}
        
        {/* Afficher le type de véhicule avec icône */}
        {announcement.vehicleType && (
          <div className="mt-3 text-sm flex items-center">
            {(() => {
              const { icon, color } = getVehicleIconAndColor(announcement.vehicleType);
              return <i className={`${icon} mr-2 ${color}`}></i>;
            })()}
            <span className="font-medium text-gray-800">
              {announcement.type === 'driver' 
                ? "Type de véhicule proposé: " 
                : "Type de véhicule souhaité: "}
              {formatVehicleType(announcement.vehicleType)}
            </span>
          </div>
        )}
        
        <div className="mt-3 pt-3 border-t border-gray-100">
          {/* Logs de débogage pour les détails supplémentaires */}
          {(() => {
            console.log('[DEBUG AnnouncementCard] ID:', announcement.id, 'additionalInfo présent:', !!announcement.additionalInfo);
            if (announcement.additionalInfo) {
              console.log('[DEBUG AnnouncementCard] Contenu additionalInfo:', announcement.additionalInfo.substring(0, 50) + (announcement.additionalInfo.length > 50 ? '...' : ''));
            }
            console.log('[DEBUG AnnouncementCard] Composant parent:', announcement._source || 'non spécifié');
            return null;
          })()}
        </div>
        
        {/* Modale de contact */}
        {(announcement.phoneNumber || announcement.phone) && (
          <ContactModal
            open={contactModalOpen}
            onOpenChange={setContactModalOpen}
            phoneNumber={announcement.phoneNumber || announcement.phone || ''}
          />
        )}
        
        {/* Détails supplémentaires déplacés à la fin de la carte */}
        {announcement.additionalInfo && (
          <div className="mt-3 p-2 bg-blue-50 rounded-md border border-blue-200 shadow-sm">
            <p className="font-medium text-blue-700 mb-1 flex items-center">
              <i className="fas fa-info-circle mr-2"></i>
              Détails supplémentaires:
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{announcement.additionalInfo}</p>
          </div>
        )}
        
        {/* Bouton de contact déplacé à la fin de la carte */}
        <div className="mt-3">
          {(announcement.phoneNumber || announcement.phone) ? (
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2 text-green-600 border-green-300 hover:bg-green-50"
              onClick={handlePhoneClick}
            >
              <i className="fas fa-phone"></i>
              <span>Contacter l'annonceur</span>
            </Button>
          ) : (
            <div className="text-center text-sm text-gray-500">
              <i className="fas fa-info-circle mr-1"></i>
              Aucun numéro de contact disponible
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
