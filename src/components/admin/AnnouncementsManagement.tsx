'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where, writeBatch, deleteField } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { formatVehicleType } from '@/utils/formatVehicleType';
import { db, storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface AnnouncementData {
  id: string;
  isBlocked?: boolean;
  type: 'driver' | 'passenger';
  from: string;
  to: string;
  date: string;
  time: string;
  createdAt: any;
  userDisplayName?: string;
  userId?: string;
  phoneNumber?: string;
  phone?: string;
  price?: number;
  seats?: number;
  vehicleType?: string;
  vehiclePhoto?: string;
  vehiclePhotoUrl?: string; // URL de la photo du véhicule (après upload)
  additionalInfo?: string;
}

export function AnnouncementsManagement() {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'driver' | 'passenger'>('all');
  
  // États pour les modales de confirmation
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string>('');

  // Charger les annonces depuis Firestore
  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      let announcementsQuery;
      
      if (filterType === 'all') {
        announcementsQuery = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      } else {
        announcementsQuery = query(
          collection(db, 'announcements'),
          where('type', '==', filterType),
          orderBy('createdAt', 'desc')
        );
      }
      
      const announcementsSnapshot = await getDocs(announcementsQuery);
      const announcementsData = announcementsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type || 'passenger',
          from: data.from || '',
          to: data.to || '',
          date: data.date || '',
          time: data.time || '',
          createdAt: data.createdAt,
          userDisplayName: data.userDisplayName || '',
          userId: data.userId || '',
          phoneNumber: data.phoneNumber || '',
          phone: data.phone || '',
          price: data.price,
          seats: data.seats,
          vehicleType: data.vehicleType || '',
          vehiclePhoto: data.vehiclePhoto || '',
          vehiclePhotoUrl: data.vehiclePhotoUrl || '',
          additionalInfo: data.additionalInfo || '',
          isBlocked: data.isBlocked || false
        } as AnnouncementData;
      });
      
      setAnnouncements(announcementsData);
    } catch (error) {
      console.error('Erreur lors du chargement des annonces:', error);
      toast.error('Erreur lors du chargement des annonces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [filterType]);

  // Filtrer les annonces en fonction du terme de recherche
  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearchTerm = 
      announcement.from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.userDisplayName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearchTerm;
  });

  // Bloquer/Du00e9bloquer une annonce
  const toggleAnnouncementBlock = async (announcementId: string, isCurrentlyBlocked: boolean) => {
    try {
      const announcementRef = doc(db, 'announcements', announcementId);
      await updateDoc(announcementRef, {
        isBlocked: !isCurrentlyBlocked
      });
      
      // Mettre u00e0 jour l'u00e9tat local
      setAnnouncements(announcements.map(announcement => 
        announcement.id === announcementId ? {...announcement, isBlocked: !isCurrentlyBlocked} : announcement
      ));
      
      toast.success(`Annonce ${isCurrentlyBlocked ? 'du00e9bloquu00e9e' : 'bloquu00e9e'} avec succu00e8s`);
    } catch (error) {
      console.error('Erreur lors du blocage/du00e9blocage de l\'annonce:', error);
    }
  };

  // Demander confirmation avant de supprimer une annonce
  const confirmDeleteAnnouncement = (announcementId: string) => {
    setAnnouncementToDelete(announcementId);
    setShowDeleteConfirmation(true);
  };
  
  // Supprimer une annonce après confirmation
  const deleteAnnouncement = async () => {
    if (!announcementToDelete) return;
    
    try {
      // Trouver l'annonce dans l'état local pour obtenir son URL d'image
      const announcement = announcements.find(a => a.id === announcementToDelete);
      
      // Si l'annonce a une photo de véhicule, supprimer de Firebase Storage
      if (announcement?.vehiclePhoto) {
        try {
          // Extraire le chemin de l'URL de l'image
          const imageUrl = announcement.vehiclePhoto;
          if (imageUrl.includes('firebase') && imageUrl.includes('storage')) {
            // Construire une référence à partir de l'URL complète
            // Les URL Firebase Storage contiennent généralement un motif comme:
            // https://firebasestorage.googleapis.com/v0/b/[bucket]/o/[encoded_path]?token=...
            const urlParts = imageUrl.split('/o/');
            if (urlParts.length > 1) {
              let storagePath = urlParts[1];
              // Supprimer les paramètres de requête s'ils existent
              if (storagePath.includes('?')) {
                storagePath = storagePath.split('?')[0];
              }
              // Décoder l'URL pour obtenir le chemin réel
              storagePath = decodeURIComponent(storagePath);
              const storageRef = ref(storage, storagePath);
              await deleteObject(storageRef);
              console.log('Image supprimée avec succès de Firebase Storage');
            }
          }
        } catch (storageError) {
          console.error('Erreur lors de la suppression de l\'image:', storageError);
          // Continuer même si la suppression de l'image échoue
        }
      }
      
      // Supprimer le document de l'annonce de Firestore
      await deleteDoc(doc(db, 'announcements', announcementToDelete));
      
      // Mettre à jour l'état local
      setAnnouncements(announcements.filter(announcement => announcement.id !== announcementToDelete));
      setSelectedAnnouncement(null);
      setShowDeleteConfirmation(false);
      setAnnouncementToDelete('');
      
      toast.success('Annonce supprimée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'annonce:', error);
      toast.error('Erreur lors de la suppression de l\'annonce');
    }
  };

  // Demander confirmation avant de supprimer toutes les annonces
  const confirmDeleteAllAnnouncements = () => {
    setShowDeleteAllConfirmation(true);
  };
  
  // Supprimer toutes les annonces après confirmation
  const deleteAllAnnouncements = async () => {
    setShowDeleteAllConfirmation(false);
    setLoading(true);
    try {
      const announcementsToDelete = filterType === 'all' ? announcements : announcements.filter(a => a.type === filterType);
      
      // Limite de 500 opérations par batch dans Firestore
      const chunkSize = 450;
      for (let i = 0; i < announcementsToDelete.length; i += chunkSize) {
        const chunk = announcementsToDelete.slice(i, i + chunkSize);
        const currentBatch = writeBatch(db);
        
        // Pour chaque annonce dans le lot
        for (const announcement of chunk) {
          // 1. Suppression des images associées dans Firebase Storage
          if (announcement.vehiclePhoto) {
            try {
              const imageUrl = announcement.vehiclePhoto;
              if (imageUrl.includes('firebase') && imageUrl.includes('storage')) {
                const urlParts = imageUrl.split('/o/');
                if (urlParts.length > 1) {
                  let storagePath = urlParts[1];
                  if (storagePath.includes('?')) {
                    storagePath = storagePath.split('?')[0];
                  }
                  storagePath = decodeURIComponent(storagePath);
                  const storageRef = ref(storage, storagePath);
                  await deleteObject(storageRef);
                }
              }
            } catch (storageError) {
              console.error(`Erreur lors de la suppression de l'image pour l'annonce ${announcement.id}:`, storageError);
              // Continuer malgré l'erreur de suppression d'image
            }
          }
          
          // 2. Ajout de la suppression du document au batch
          const announcementRef = doc(db, 'announcements', announcement.id);
          currentBatch.delete(announcementRef);
        }
        
        // Exécution du batch pour ce lot
        await currentBatch.commit();
        toast.success(`Lot ${Math.floor(i/chunkSize) + 1} d'annonces supprimé`);
      }
      
      // Mettre à jour l'état local
      if (filterType === 'all') {
        setAnnouncements([]);
      } else {
        setAnnouncements(announcements.filter(a => a.type !== filterType));
      }
      
      setSelectedAnnouncement(null);
      toast.success(`Toutes les annonces ${filterType !== 'all' ? `de type ${filterType}` : ''} ont été supprimées avec succès`);
    } catch (error) {
      console.error('Erreur lors de la suppression des annonces:', error);
      toast.error('Erreur lors de la suppression des annonces');
    } finally {
      setLoading(false);
    }
  };

  // Formater la date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Date inconnue';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Date invalide';
    }
  };

  // Voir le détail d'une annonce
  const viewAnnouncementDetails = (announcement: AnnouncementData) => {
    setSelectedAnnouncement(announcement);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
        <h2 className="text-xl font-bold">Gestion des Annonces</h2>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <select
              className="w-full sm:w-auto px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'driver' | 'passenger')}
            >
              <option value="all">Tous les types</option>
              <option value="driver">Conducteurs</option>
              <option value="passenger">Passagers</option>
            </select>
            <input
              type="text"
              placeholder="Rechercher une annonce..."
              className="w-full sm:w-auto px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                loadAnnouncements();
              }}
            >
              Actualiser
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={confirmDeleteAllAnnouncements}
            >
              <span className="hidden sm:inline">Supprimer toutes les annonces</span>
              <span className="sm:hidden">Tout supprimer</span>
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Chargement des annonces...</p>
        </div>
      ) : (
        <div>
          {selectedAnnouncement ? (
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold">Détail de l'annonce</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAnnouncement(null)}
                >
                  Retour à la liste
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Informations générales</h4>
                  <div className="space-y-2">
                    <p><span className="font-medium">Type:</span> {selectedAnnouncement.type === 'driver' ? 'Conducteur' : 'Passager'}</p>
                    <p><span className="font-medium">De:</span> {selectedAnnouncement.from}</p>
                    <p><span className="font-medium">Vers:</span> {selectedAnnouncement.to}</p>
                    <p><span className="font-medium">Date:</span> {selectedAnnouncement.date} à {selectedAnnouncement.time}</p>
                    <p><span className="font-medium">Publié le:</span> {formatDate(selectedAnnouncement.createdAt)}</p>
                    <p><span className="font-medium">Statut:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${selectedAnnouncement.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {selectedAnnouncement.isBlocked ? 'Bloqué' : 'Actif'}
                      </span>
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Informations utilisateur</h4>
                  <div className="space-y-2">
                    <p><span className="font-medium">Utilisateur:</span> {selectedAnnouncement.userDisplayName || 'Non spécifié'}</p>
                    <p><span className="font-medium">ID Utilisateur:</span> {selectedAnnouncement.userId || 'Non spécifié'}</p>
                    <p><span className="font-medium">Téléphone:</span> {selectedAnnouncement.phoneNumber || selectedAnnouncement.phone || 'Non spécifié'}</p>
                    {selectedAnnouncement.type === 'driver' && (
                      <>
                        <p><span className="font-medium">Prix:</span> {selectedAnnouncement.price || 0} FCFA</p>
                        <p><span className="font-medium">Places:</span> {selectedAnnouncement.seats || 0}</p>
                        <p><span className="font-medium">Véhicule:</span> {selectedAnnouncement.vehicleType ? formatVehicleType(selectedAnnouncement.vehicleType) : 'Non spécifié'}</p>
                      </>
                    )}
                    <p><span className="font-medium">Informations supplémentaires:</span> {selectedAnnouncement.additionalInfo || 'Aucune'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <Button
                  variant="outline"
                  className={selectedAnnouncement.isBlocked ? 'text-green-600 border-green-300 hover:bg-green-50' : 'text-amber-600 border-amber-300 hover:bg-amber-50'}
                  onClick={() => toggleAnnouncementBlock(selectedAnnouncement.id, selectedAnnouncement.isBlocked || false)}
                >
                  {selectedAnnouncement.isBlocked ? 'Débloquer' : 'Bloquer'}
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => confirmDeleteAnnouncement(selectedAnnouncement.id)}
                >
                  Supprimer
                </Button>
              </div>

              {selectedAnnouncement.vehiclePhotoUrl && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-700 mb-2">Photo du véhicule</h4>
                  <img 
                    src={selectedAnnouncement.vehiclePhotoUrl} 
                    alt="Véhicule" 
                    className="mt-2 rounded-lg shadow-sm max-w-full h-auto max-h-64 object-cover"
                    onError={(e) => {
                      // En cas d'erreur de chargement de l'image
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="min-w-full bg-white rounded-lg overflow-hidden text-xs sm:text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-600">Type</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-600">Trajet</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 hidden sm:table-cell">Utilisateur</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 hidden md:table-cell">Date</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-600">Statut</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAnnouncements.length > 0 ? (
                    filteredAnnouncements.map((announcement) => (
                      <tr key={announcement.id} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                          <span className={`px-1 sm:px-2 py-1 rounded-full text-xs ${announcement.type === 'driver' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                            {announcement.type === 'driver' ? 'C' : 'P'}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                          <div className="truncate max-w-[100px] sm:max-w-full">
                            {announcement.from} → {announcement.to}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden sm:table-cell">{announcement.userDisplayName || 'N/A'}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden md:table-cell">{formatDate(announcement.createdAt)}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                          <span className={`px-1 sm:px-2 py-1 rounded-full text-xs ${announcement.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {announcement.isBlocked ? 'Bloqué' : 'Actif'}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                          <div className="flex flex-wrap items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs px-2 py-1 h-7"
                              onClick={() => viewAnnouncementDetails(announcement)}
                            >
                              Voir
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`text-xs px-2 py-1 h-7 ${announcement.isBlocked ? 'text-green-600 border-green-300 hover:bg-green-50' : 'text-amber-600 border-amber-300 hover:bg-amber-50'}`}
                              onClick={() => toggleAnnouncementBlock(announcement.id, announcement.isBlocked || false)}
                            >
                              <span className="hidden sm:inline">{announcement.isBlocked ? 'Débloquer' : 'Bloquer'}</span>
                              <span className="sm:hidden">{announcement.isBlocked ? 'Débl.' : 'Bloq.'}</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50 text-xs px-2 py-1 h-7"
                              onClick={() => confirmDeleteAnnouncement(announcement.id)}
                            >
                              <span className="hidden sm:inline">Supprimer</span>
                              <span className="sm:hidden">X</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                        {searchTerm ? 'Aucune annonce ne correspond à votre recherche' : 'Aucune annonce trouvée'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* Modale de confirmation pour la suppression d'une annonce */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        title="Supprimer cette annonce"
        message="Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={deleteAnnouncement}
        onCancel={() => setShowDeleteConfirmation(false)}
        isDanger={true}
      />
      
      {/* Modale de confirmation pour la suppression de toutes les annonces */}
      <ConfirmationDialog
        isOpen={showDeleteAllConfirmation}
        title="Supprimer toutes les annonces"
        message="ATTENTION : Êtes-vous absolument sûr de vouloir supprimer TOUTES les annonces ? Cette action est irréversible et supprimera toutes les annonces du système."
        confirmLabel="Tout supprimer"
        onConfirm={deleteAllAnnouncements}
        onCancel={() => setShowDeleteAllConfirmation(false)}
        isDanger={true}
      />
    </div>
  );
}
