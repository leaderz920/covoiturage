import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog-simple";
import { AnnouncementCard } from '../announcements/AnnouncementCard';
import { AnnouncementType } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatVehicleType, getVehicleIconAndColor } from '@/utils/formatVehicleType';

interface MyAnnouncementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcements: AnnouncementType[];
  onDeleteAnnouncement?: (id: string) => void;
  onEditAnnouncement?: (id: string) => void;
  loading?: boolean;
  onOpenPublishModal?: () => void;
}

export function MyAnnouncementsModal({ 
  open, 
  onOpenChange, 
  announcements,
  onDeleteAnnouncement,
  onEditAnnouncement,
  loading = false,
  onOpenPublishModal
}: MyAnnouncementsModalProps) {
  // Log des props reçues
  console.log('[MyAnnouncementsModal] Props reçues:', {
    open,
    announcementsCount: announcements?.length,
    loading,
    hasDeleteHandler: !!onDeleteAnnouncement,
    hasEditHandler: !!onEditAnnouncement
  });
  
  if (announcements?.length > 0) {
    console.log('[MyAnnouncementsModal] Première annonce:', announcements[0]);
  }
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

  // Effet pour logger quand la modale s'ouvre/se ferme
  useEffect(() => {
    console.log(`[MyAnnouncementsModal] La modale est maintenant ${open ? 'ouverte' : 'fermée'}`);
    if (open) {
      console.log('[MyAnnouncementsModal] Données des annonces:', announcements);
    }
  }, [open, announcements]);

  // Fonction utilitaire pour formater le type de véhicule
  const formatVehicleType = (vehicleType: string | string[] | undefined): string => {
    if (!vehicleType) return '';
    if (Array.isArray(vehicleType)) {
      return vehicleType.join(', ').toLowerCase();
    }
    return String(vehicleType).toLowerCase();
  };

  const openConfirmDialog = (id: string) => {
    setAnnouncementToDelete(id);
    setShowConfirmDialog(true);
  };

  const closeConfirmDialog = () => {
    setShowConfirmDialog(false);
    setAnnouncementToDelete(null);
  };

  const handleEdit = (id: string) => {
    try {
      console.log('Début de la modification d\'annonce - ID:', id);
      
      if (onEditAnnouncement) {
        // Fermer d'abord la modale actuelle
        onOpenChange(false);
        
        // Puis lancer l'édition avec un court délai pour éviter les conflits entre modales
        setTimeout(() => {
          console.log('Exécution de onEditAnnouncement avec ID:', id);
          onEditAnnouncement(id);
        }, 100);
      } else {
        console.error('La fonction onEditAnnouncement n\'est pas définie');
        toast.error('Impossible de modifier cette annonce');
      }
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast.error('Une erreur est survenue');
    }
  };

  const handleDelete = () => {
    if (announcementToDelete && onDeleteAnnouncement) {
      // Supprimer définitivement l'annonce
      onDeleteAnnouncement(announcementToDelete);
      toast.success('Annonce supprimée avec succès');
      closeConfirmDialog();
    }
  };

  // Générer un ID unique pour l'accessibilité
  const titleId = React.useId();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[90vw] max-w-[90vw] sm:max-w-md p-0 border-0 shadow-xl rounded-xl overflow-hidden max-h-[90vh] flex flex-col modal-content"
        aria-labelledby={titleId}
      >
        {/* En-tête avec dégradé - maintenant fixe */}
        <DialogHeader className="block p-0 m-0">
          <div className="relative py-3 px-6 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            <DialogClose className="absolute right-3 top-3 bg-white/20 text-white hover:bg-white/30 rounded-full p-1" />
            <div className="flex items-center">
              <DialogClose className="mr-2 text-white hover:bg-white/20 rounded-full p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </DialogClose>
              <div className="bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md mr-3">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <DialogTitle id={titleId} className="text-base font-bold text-white leading-tight">Mes Annonces</DialogTitle>
                <p className="text-green-50 text-xs">Gérez vos trajets partagés</p>
              </div>
            </div>
          </div>
          {/* Suppression du titre caché pour l'accessibilité */}
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto p-6">
          {announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 rounded-xl">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-emerald-50">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-1">Aucune annonce publiée</h3>
              <p className="text-gray-500 mb-4 text-center">Vous n'avez pas encore publié d'annonces de trajets</p>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-800">Vos annonces <span className="text-xs sm:text-sm font-normal text-gray-500">({announcements.length})</span></h3>
                <div className="text-xs bg-emerald-50 px-2 py-1 rounded-md text-emerald-600 font-medium">
                  Plus récentes d'abord
                </div>
              </div>
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="relative rounded-xl group hover:shadow-md" style={{ overflow: 'hidden' }}>
                    {/* Custom implementation of AnnouncementCard with modified display for Mes Annonces */}
                    <Card className="bg-white rounded-xl shadow-sm p-0 overflow-hidden hover:shadow-md">
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
                          {/* Moved time elapsed to a position that won't overlap with buttons */}
                          <div className="mr-20 text-xs text-gray-500">
                            {/* Using the same getTimeAgo logic from AnnouncementCard */}
                            {(() => {
                              const createdAt = announcement.createdAt;
                              if (!createdAt) return 'Date inconnue';
                              
                              let timestamp = 0;
                              
                              try {
                                if (createdAt instanceof Date) {
                                  timestamp = createdAt.getTime();
                                } else if (typeof createdAt === 'object') {
                                  if ('seconds' in createdAt && typeof createdAt.seconds === 'number') {
                                    timestamp = createdAt.seconds * 1000;
                                  } else if ('toDate' in createdAt && typeof createdAt.toDate === 'function') {
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
                                
                                if (!timestamp || isNaN(timestamp)) return 'Date inconnue';
                                
                                const dateObj = new Date(timestamp);
                                if (isNaN(dateObj.getTime())) return 'Date inconnue';
                                
                                const now = new Date();
                                const diffMs = now.getTime() - dateObj.getTime();
                                
                                const diffMins = Math.round(diffMs / 60000);
                                const diffHours = Math.round(diffMs / 3600000);
                                const diffDays = Math.round(diffMs / 86400000);
                                
                                if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
                                if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
                                if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
                                
                                return `Le ${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
                              } catch (error) {
                                return 'Récemment';
                              }
                            })()}
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
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center text-sm text-gray-500">
                                <i className="far fa-calendar-alt mr-2"></i>
                                <span className="whitespace-nowrap">
                                  {(() => {
                                    const date = announcement.date;
                                    if (!date) return 'Date non disponible';
                                    
                                    let timestamp = 0;
                                    
                                    try {
                                      if (date instanceof Date) {
                                        timestamp = date.getTime();
                                      } else if (typeof date === 'object') {
                                        if ('seconds' in date && typeof date.seconds === 'number') {
                                          timestamp = date.seconds * 1000;
                                        } else if ('toDate' in date && typeof date.toDate === 'function') {
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
                                      
                                      if (!timestamp || isNaN(timestamp)) return 'Date non disponible';
                                      
                                      const dateObj = new Date(timestamp);
                                      if (isNaN(dateObj.getTime())) return 'Date non disponible';
                                      
                                      return new Intl.DateTimeFormat('fr-FR', {
                                        day: 'numeric', 
                                        month: 'long', 
                                        year: 'numeric'
                                      }).format(dateObj);
                                    } catch {
                                      return 'Date non disponible';
                                    }
                                  })()} • {announcement.time}
                                </span>
                              </div>
                              
                              {/* Afficher le type de véhicule pour tous les types d'annonce */}
                              {announcement.vehicleType && (
                                <div className="flex items-center text-sm">
                                  {(() => {
                                    const { icon, color } = getVehicleIconAndColor(announcement.vehicleType);
                                    return <i className={`${icon} mr-2 ${color}`}></i>;
                                  })()}
                                  <span className="font-medium text-gray-800">
                                    {announcement.type === 'driver' 
                                      ? "Véhicule: " 
                                      : "Véhicule souhaité: "}
                                    {formatVehicleType(announcement.vehicleType)}
                                  </span>
                                </div>
                              )}
                              
                              {/* Affichage du nombre de places avec icône */}
                              {announcement.seats && (
                                <div className="flex items-center text-sm text-gray-500">
                                  <i className="fas fa-user-friends mr-2 text-gray-500"></i>
                                  <span>{announcement.seats} place{announcement.seats > 1 ? 's' : ''} {announcement.type === 'driver' ? 'disponible(s)' : 'recherchée(s)'}</span>
                                </div>
                              )}
                              {/* Détails supplémentaires déplacés à la fin de la carte */}
                            </div>
                          </div>
                          <div className="text-right">

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
                        
                        {/* Afficher les détails supplémentaires à la fin de la carte */}
                        {announcement.additionalInfo && (
                          <div className="mt-3 p-2 bg-blue-50 rounded-md border border-blue-200 shadow-sm">
                            <p className="font-medium text-blue-700 mb-1 flex items-center">
                              <i className="fas fa-info-circle mr-2"></i>
                              Détails supplémentaires:
                            </p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{announcement.additionalInfo}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    {/* Repositioned edit and delete buttons to avoid overlap */}
                    <div className="absolute top-2 right-2 opacity-70 sm:opacity-70 group-hover:opacity-100 flex space-x-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full shadow-md bg-blue-500 hover:bg-blue-600"
                        onClick={() => handleEdit(announcement.id)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full shadow-md bg-red-500 hover:bg-red-600"
                        onClick={() => openConfirmDialog(announcement.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Boîte de dialogue de confirmation de suppression */}
      {showConfirmDialog && (
        <Dialog open={showConfirmDialog} onOpenChange={closeConfirmDialog}>
          <DialogContent 
            className="w-[350px] rounded-xl p-0 overflow-hidden"
            aria-labelledby="confirm-delete-title"
          >
            <DialogHeader className="p-4 bg-red-50">
              <DialogTitle id="confirm-delete-title" className="text-lg font-medium text-red-600">Confirmer la suppression</DialogTitle>
            </DialogHeader>
            {/* Fallback visually hidden title for accessibility */}
            {/* Titre de confirmation supprimé pour éviter les erreurs d'accessibilité */}
            <div className="p-4">
              <p className="text-gray-700 mb-4">Êtes-vous sûr de vouloir supprimer cette annonce ?</p>
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={closeConfirmDialog}
                  className="border-gray-300 text-gray-700"
                >
                  Annuler
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Supprimer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
