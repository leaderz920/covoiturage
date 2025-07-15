'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserData } from '@/contexts/UserDataContext';
import { auth } from '@/lib/firebase';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchModal } from '@/components/modals/SearchModal';
import { PublishModal } from '@/components/modals/PublishModal';
import { MyAnnouncementsModal } from '@/components/modals/MyAnnouncementsModal';
import { ProfileModal } from '@/components/modals/ProfileModal';
import { AnnouncementType } from '@/types';
import { toast } from 'sonner';
import { memoizeComponent, useDeferredState, useRenderMonitor, useLazyData } from '@/utils/performanceUtils';
// Import des hooks React Query personnalisés
import { 
  useAllAnnouncements, 
  useUserAnnouncements, 
  useCreateAnnouncement, 
  useUpdateAnnouncement, 
  useDeleteAnnouncement 
} from '@/hooks/useAnnouncements';

// Données d'exemple pour les démonstrations
const sampleAnnouncements: AnnouncementType[] = [
  {
    id: '1',
    userName: "Sophie Martin",
    userPhoto: "https://readdy.ai/api/search-image?query=professional%20headshot%20photo%20of%20a%20young%20woman%20with%20brown%20hair%20and%20friendly%20smile%2C%20business%20attire%2C%20natural%20lighting%2C%20studio%20background%2C%20high%20quality%20portrait&width=100&height=100&seq=10&orientation=squarish",
    type: "driver",
    from: "Abidjan",
    to: "Yamoussoukro",
    date: new Date('2025-04-29'),
    time: "08:30",
    price: 5000,
    seats: 3,
    userId: "user1",
    createdAt: new Date('2025-04-20'),
    vehiclePhoto: "https://readdy.ai/api/search-image?query=modern%20silver%20SUV%20car%20on%20clean%20white%20background%2C%20professional%20automotive%20photography%2C%20showroom%20quality%2C%20front%20three%20quarter%20view%2C%20high%20end%20vehicle&width=400&height=300&seq=11&orientation=landscape"
  },
  {
    id: '2',
    userName: "Marc Koné",
    userPhoto: "https://readdy.ai/api/search-image?query=professional%20headshot%20photo%20of%20a%20middle%20aged%20african%20man%20with%20glasses%2C%20business%20casual%20attire%2C%20warm%20smile%2C%20studio%20lighting%2C%20clean%20background&width=100&height=100&seq=12&orientation=squarish",
    type: "passenger",
    from: "Bouaké",
    to: "Korhogo",
    date: new Date('2025-04-30'),
    time: "10:00",
    price: 4000,
    userId: "user2",
    createdAt: new Date('2025-04-21')
  },
  {
    id: '3',
    userName: "Emma Touré",
    userPhoto: "https://readdy.ai/api/search-image?query=professional%20headshot%20of%20a%20young%20african%20woman%20with%20natural%20hair%20and%20professional%20attire%2C%20confident%20smile%2C%20studio%20lighting%2C%20neutral%20background&width=100&height=100&seq=13&orientation=squarish",
    type: "driver",
    from: "San Pedro",
    to: "Abidjan",
    date: new Date('2025-05-01'),
    time: "09:15",
    price: 7500,
    seats: 4,
    userId: "user3",
    createdAt: new Date('2025-04-22'),
    vehiclePhoto: "https://readdy.ai/api/search-image?query=red%20sedan%20car%20on%20white%20background%2C%20professional%20car%20photography%2C%20showroom%20quality%2C%20side%20view%2C%20premium%20vehicle&width=400&height=300&seq=14&orientation=landscape"
  },
  {
    id: '4',
    userName: "Lucas Diabaté",
    userPhoto: "https://readdy.ai/api/search-image?query=professional%20headshot%20of%20a%20young%20african%20man%20with%20short%20hair%2C%20business%20casual%20style%2C%20genuine%20smile%2C%20studio%20lighting%2C%20clean%20background&width=100&height=100&seq=15&orientation=squarish",
    type: "passenger",
    from: "Daloa",
    to: "Man",
    date: new Date('2025-05-02'),
    time: "11:30",
    price: 3500,
    userId: "user4",
    createdAt: new Date('2025-04-23')
  },
  {
    id: '5',
    userName: "Marie Kouamé",
    userPhoto: "https://readdy.ai/api/search-image?query=professional%20headshot%20of%20a%20middle%20aged%20african%20woman%20with%20elegant%20hairstyle%2C%20corporate%20attire%2C%20warm%20expression%2C%20studio%20lighting%2C%20neutral%20background&width=100&height=100&seq=16&orientation=squarish",
    type: "driver",
    from: "Abidjan",
    to: "Grand-Bassam",
    date: new Date('2025-05-03'),
    time: "14:00",
    price: 2500,
    seats: 3,
    userId: "user5",
    createdAt: new Date('2025-04-24'),
    vehiclePhoto: "https://readdy.ai/api/search-image?query=white%20compact%20car%20on%20clean%20background%2C%20professional%20automotive%20photography%2C%20showroom%20quality%2C%20front%20view%2C%20modern%20vehicle&width=400&height=300&seq=17&orientation=landscape"
  }
];

function Home() {
  const { userData } = useUserData();
  
  // Utiliser des états pour la gestion des modales et de la recherche
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [announcementToEdit, setAnnouncementToEdit] = useState<AnnouncementType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Utilisation de React Query pour gérer les données
  const { data: allAnnouncements = [], isLoading } = useAllAnnouncements();
  
  // Récupérer l'ID utilisateur du contexte
  // Dans notre structure, l'ID est stocké directement dans l'objet userData
  const userId = userData?.id || '';
  
  // Utiliser l'ID utilisateur avec le hook useUserAnnouncements
  const { data: myAnnouncements = [], refetch: refetchUserAnnouncements, isLoading: isLoadingUserAnnouncements } = useUserAnnouncements(userId);
  
  // Log pour déboguer le chargement des annonces utilisateur
  useEffect(() => {
    console.log('[DEBUG] Données utilisateur:', userData);
    console.log('[DEBUG] ID utilisateur:', userId);
    console.log('[DEBUG] Chargement des annonces utilisateur en cours:', isLoadingUserAnnouncements);
    console.log('[DEBUG] Nombre d\'annonces utilisateur:', myAnnouncements.length);
    if (myAnnouncements.length > 0) {
      console.log('[DEBUG] Première annonce:', myAnnouncements[0]);
    }
  }, [userData, userId, myAnnouncements, isLoadingUserAnnouncements]);
  
  // Hooks de mutation pour les opérations d'écriture
  const createAnnouncementMutation = useCreateAnnouncement();
  const updateAnnouncementMutation = useUpdateAnnouncement();
  const deleteAnnouncementMutation = useDeleteAnnouncement();

  // Fonction pour rafraîchir les annonces de l'utilisateur
  const refreshUserAnnouncements = useCallback(() => {
    refetchUserAnnouncements();
  }, [refetchUserAnnouncements]);

  // Initialisation du router
  const router = useRouter();
  
  // Définition de toutes les fonctions avec hooks - AVANT toute condition de retour
  const handleOpenModal = useCallback((modalType: string | null) => {
    console.log('[DEBUG] Ouverture de la modale:', modalType);
    
    // Si on ouvre la modale de recherche, s'assurer que les annonces sont à jour
    if (modalType === 'search') {
      console.log('[DEBUG] Chargement des annonces pour la modale de recherche');
    }
    
    // Si on ouvre la modale mes annonces, s'assurer que les annonces sont à jour
    if (modalType === 'myAnnouncements') {
      // Forcer le rafraîchissement des annonces utilisateur
      if (userData?.id) {
        console.log('[DEBUG] Forçage du rafraîchissement des annonces de l\'utilisateur:', userData.id);
        // Forcer le refetch des annonces utilisateur
        refetchUserAnnouncements().then((result) => {
          console.log('[DEBUG] Refetch des annonces utilisateur terminé avec', result.data?.length || 0, 'annonces');
        }).catch(error => {
          console.error('[DEBUG] Erreur lors du rafraîchissement des annonces:', error);
        });
      } else {
        console.log('[DEBUG] Tentative de rafraîchissement des annonces utilisateur mais utilisateur non connecté ou ID manquant');
        console.log('[DEBUG] Données utilisateur disponibles:', userData);
      }
    }
    
    // Si on ouvre une nouvelle modale, réinitialiser l'annonce en cours d'édition
    if (modalType !== 'publish' || !announcementToEdit) {
      setAnnouncementToEdit(null);
    }
    
    setActiveModal(modalType);
  }, [allAnnouncements, announcementToEdit, userData, refetchUserAnnouncements]);

  // Fonction pour gérer l'édition d'une annonce
  const handleEditAnnouncement = (id: string) => {
    try {
      console.log('Recherche de l\'annonce avec ID:', id);
      const announcement = myAnnouncements.find(a => a.id === id);
      
      if (!announcement) {
        console.error('Annonce non trouvée avec l\'ID:', id);
        toast.error('Impossible de trouver cette annonce');
        return;
      }
      
      console.log('Annonce trouvée, préparation pour édition:', announcement);
      
      // Créer une copie simple pour éviter les problèmes de liaison
      const basicAnnouncement = {
        id: announcement.id,
        type: announcement.type === 'driver' ? 'driver' : 'passenger',
        from: announcement.from || '',
        to: announcement.to || '',
        date: announcement.date,  // On laisse la date sous sa forme originale
        time: announcement.time || '',
        price: announcement.price || '',
        phone: announcement.phone || '',
        vehicleType: Array.isArray(announcement.vehicleType) ? announcement.vehicleType : (announcement.vehicleType || ''),
        seats: announcement.seats || '',
        vehiclePhoto: announcement.vehiclePhoto || '',
        userId: announcement.userId,
      };
      
      // Log pour débogage
      console.log('Annonce simplifiée pour édition:', basicAnnouncement);
      
      // Définir l'annonce pour l'édition
      setAnnouncementToEdit(basicAnnouncement);
      
      // Attendre un court instant pour s'assurer que l'état est mis à jour
      setTimeout(() => {
        // Ouvrir la modale de publication en mode édition
        console.log('Ouverture de la modale de publication');
        setActiveModal('publish');
      }, 50);
    } catch (error) {
      console.error('Erreur lors de la préparation de l\'annonce pour édition:', error);
      toast.error('Une erreur est survenue lors de la modification');
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.warning('Veuillez saisir un terme de recherche');
      return;
    }
    setActiveModal('search');
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      // Utiliser la mutation React Query pour supprimer l'annonce
      await deleteAnnouncementMutation.mutateAsync(id);
      
      // React Query s'occupe d'invalider les queries et de recharger les données
      // Afficher une notification unique
      toast.success('Annonce supprimée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'annonce:', error);
      toast.error('Impossible de supprimer cette annonce');
    }
  };

  const handlePublishAnnouncement = async (data: Omit<AnnouncementType, 'id' | 'createdAt'>) => {
    try {
      console.log('[DEBUG] Publication d\'annonce avec ID utilisateur:', auth.currentUser?.uid);
      
      // Vérifier si l'utilisateur est connecté
      if (!auth.currentUser) {
        console.error('Aucun utilisateur connecté');
        toast.error('Vous devez être connecté pour publier une annonce');
        return;
      }

      if (announcementToEdit) {
        // Mise à jour d'une annonce existante avec React Query
        await updateAnnouncementMutation.mutateAsync({ 
          id: announcementToEdit.id, 
          data: { 
            ...data,
            userId: auth.currentUser.uid // S'assurer que l'ID utilisateur est à jour
          } 
        });
        toast.success('Annonce mise à jour avec succès');
      } else {
        // Création d'une nouvelle annonce avec React Query
        const result = await createAnnouncementMutation.mutateAsync({
          ...data,
          userId: auth.currentUser.uid, // Ajouter l'ID utilisateur
          createdAt: new Date() // Ajouter la date de création
        });
        console.log('[DEBUG] Annonce créée avec ID:', result?.id);
        toast.success('Annonce publiée avec succès');
      }
      
      // Forcer le rafraîchissement des annonces
      console.log('[DEBUG] Forçage du rafraîchissement des annonces utilisateur après publication');
      await refetchUserAnnouncements();
      
      // Fermer le modal et ouvrir la modale Mes Annonces
      setActiveModal('myAnnouncements');
      setAnnouncementToEdit(null);
    } catch (error) {
      console.error('Erreur lors de la publication de l\'annonce:', error);
      toast.error(`Erreur lors de la publication de l'annonce: ${(error as Error).message}`);
    }
  };

  // Rendu principal du composant
  return (
    <ProtectedRoute>
      <div className="min-h-screen home-background">
      {/* Nav Bar - Mobile Header */}
      <div className="mobile-header bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <img src="/EcoTrajet_Icon_500x500.png" alt="EcoTrajet" className="h-8 mr-2" />
              <h1 className="text-xl font-semibold">EcoTrajet</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-blue-700 px-3 py-1 rounded-full">
                <i className="fas fa-coins text-yellow-400 mr-2"></i>
                <span className="text-white font-medium">{userData?.tokens ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content - Mobile Specific */}
      <div className="mobile-content px-4 pb-[65px]">
        {/* Horizontal Scrolling Announcements */}
        <div className="mt-4 mb-6">
          <div className="relative overflow-hidden">
            {/* En-tête cachée mais maintenue pour la structure */}
            <div className="flex items-center justify-between mb-2 opacity-0">
              <h3 className="text-sm font-medium"></h3>
            </div>
            <div className="overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
              <div className="flex space-x-3 animate-scroll pb-2">
                {/* Scroll items - Utiliser les vraies annonces au lieu des exemples */}
                {allAnnouncements.length > 0 ? (
                  [...allAnnouncements, ...allAnnouncements.slice(0,2)].map((announcement, index) => (
                  <div 
                    key={`${announcement.id}-${index}`} 
                    className="flex-shrink-0 w-[220px] bg-white/95 rounded-xl p-2.5 shadow-md cursor-pointer touch-active transition-transform hover:scale-[0.98] active:scale-[0.96]"
                    onClick={() => handleOpenModal('search')}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r mr-1.5 overflow-hidden flex items-center justify-center shadow-sm"
                          style={{
                            background: announcement.type === 'driver' 
                              ? 'linear-gradient(to right, #4ade80, #22c55e)' 
                              : 'linear-gradient(to right, #60a5fa, #3b82f6)'
                          }}
                        >
                          <i className={`fas ${announcement.type === 'driver' ? 'fa-car text-white/90 text-[10px]' : 'fa-walking text-white/90 text-[10px]'}`}></i>
                        </div>
                        <div className="text-[11px] font-medium text-gray-900">{announcement.type === 'driver' ? 'Conducteur' : 'Passager'}</div>
                      </div>
                      {announcement.type === 'driver' && announcement.price && (
                        <div className="text-xs font-bold text-emerald-600">{announcement.price} F</div>
                      )}
                    </div>
                    
                    <div className="flex items-start mb-2">
                      <div className="flex flex-col items-center mr-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        <div className="w-0.5 h-5 bg-gray-300 my-0.5"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-gray-900 leading-tight">{announcement.from}</p>
                        <p className="text-[11px] font-medium text-gray-900 leading-tight">{announcement.to}</p>
                      </div>
                    </div>
                    
                    <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex justify-between items-center">
                      <div className="flex items-center">
                        <i className="far fa-calendar-alt text-[10px] text-gray-500 mr-0.5"></i>
                        <span className="text-[10px] text-gray-500">{new Date(announcement.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <span className="text-[10px] text-gray-500">{announcement.time}</span>
                    </div>
                  </div>
                  ))
                ) : (
                  <div className="flex-shrink-0 w-full text-center py-4 text-white">
                    <p>Aucune annonce disponible pour le moment</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">Bonjour!</h2>
          <p className="text-white text-opacity-90 drop-shadow-lg">Où souhaitez-vous aller aujourd'hui?</p>
        </div>
        
        {/* Main Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8 tablet-grid card-grid">
          <Card
            className="bg-white rounded-xl shadow-md p-4 cursor-pointer touch-active"
            onClick={() => handleOpenModal('myAnnouncements')}
          >
            <CardContent className="p-0 flex flex-col items-center card-content">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3 overflow-hidden">
                <i className="fas fa-clipboard-list text-blue-500 text-4xl"></i>
              </div>
              <span className="font-medium text-gray-800 card-title">Mes Annonces</span>
            </CardContent>
          </Card>
          <Card
            className="bg-white rounded-xl shadow-md p-4 cursor-pointer touch-active"
            onClick={() => handleOpenModal('search')}
          >
            <CardContent className="p-0 flex flex-col items-center card-content">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-3 overflow-hidden">
                <i className="fas fa-search text-green-500 text-4xl"></i>
              </div>
              <span className="font-medium text-gray-800 card-title">Rechercher</span>
            </CardContent>
          </Card>
          <Card
            className="bg-white rounded-xl shadow-md p-4 cursor-pointer touch-active"
            onClick={() => handleOpenModal('publish')}
          >
            <CardContent className="p-0 flex flex-col items-center card-content">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-3 overflow-hidden">
                <i className="fas fa-pen text-orange-500 text-4xl"></i>
              </div>
              <span className="font-medium text-gray-800 card-title">Publier</span>
            </CardContent>
          </Card>
          <Card
            className="bg-white rounded-xl shadow-md p-4 cursor-pointer touch-active"
            onClick={() => handleOpenModal('tickets')}
          >
            <CardContent className="p-0 flex flex-col items-center card-content">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-3 overflow-hidden">
                <i className="fas fa-ticket-alt text-purple-500 text-4xl"></i>
              </div>
              <span className="font-medium text-gray-800 card-title">Tickets de voyage</span>
            </CardContent>
          </Card>
        </div>
        

      </div>
      
      {/* Tab Bar - Mobile Footer */}
      <div className="mobile-footer bg-white border-t border-gray-200 shadow-lg fixed bottom-0 left-0 right-0 z-50">
        <div className="grid grid-cols-4 h-[60px]">
          <button
            onClick={() => handleOpenModal(null)}
            className={`flex flex-col items-center justify-center cursor-pointer touch-active nav-tab ${activeModal === null ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'}`}
          >
            <i className="fas fa-home text-xl mb-0.5"></i>
            <span className="text-xs font-medium">Accueil</span>
          </button>
          <button
            onClick={() => handleOpenModal('search')}
            className={`flex flex-col items-center justify-center cursor-pointer touch-active nav-tab ${activeModal === 'search' ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'}`}
          >
            <i className="fas fa-search text-xl"></i>
            <span className="text-xs mt-1">Recherche</span>
          </button>
          <button
            onClick={() => handleOpenModal('publish')}
            className={`flex flex-col items-center justify-center cursor-pointer touch-active nav-tab ${activeModal === 'publish' ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'}`}
          >
            <i className="fas fa-plus-circle text-xl"></i>
            <span className="text-xs mt-1">Publier</span>
          </button>
          <button
            onClick={() => handleOpenModal('profile')}
            className={`flex flex-col items-center justify-center cursor-pointer touch-active nav-tab ${activeModal === 'profile' ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'}`}
          >
            <i className="fas fa-user text-xl"></i>
            <span className="text-xs mt-1">Profil</span>
          </button>
        </div>
      </div>
      
      {/* Modals */}
      {activeModal === 'search' && (
        <SearchModal 
          open={activeModal === 'search'} 
          onOpenChange={(open) => !open && setActiveModal(null)}
          searchQuery={searchQuery}
          announcements={allAnnouncements || []}
          loading={isLoading}
        />
      )}
      
      {activeModal === 'tickets' && (
        <Dialog open={activeModal === 'tickets'} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DialogContent className="sm:max-w-md" aria-labelledby="tickets-title">
            <DialogHeader>
              <DialogTitle id="tickets-title" className="text-xl font-semibold">Tickets de voyage</DialogTitle>
            </DialogHeader>
            <div className="text-center p-4">
              <div className="mb-4">
                <i className="fas fa-tools text-amber-500 text-5xl mb-3"></i>
              </div>
              <h3 className="text-lg font-medium mb-2">Fonctionnalité à venir</h3>
              <p className="text-gray-600 mb-4">
                La gestion des tickets de voyage sera disponible dans la prochaine mise à jour d'EcoTrajet. Merci de votre patience !
              </p>
              <Button onClick={() => setActiveModal(null)} className="touch-active">Fermer</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {activeModal === 'myAnnouncements' && (
        <MyAnnouncementsModal 
          open={activeModal === 'myAnnouncements'} 
          onOpenChange={(open) => !open && setActiveModal(null)} 
          announcements={myAnnouncements || []}
          onDeleteAnnouncement={handleDeleteAnnouncement}
          onEditAnnouncement={handleEditAnnouncement}
          loading={isLoading || isLoadingUserAnnouncements}
          onOpenPublishModal={() => handleOpenModal('publish')}
        />
      )}
      {/* PublishModal - Corriger le rendu conditionnel pour éviter les problèmes d'affichage */}
      {activeModal === 'publish' && (
        <PublishModal 
          open={true} 
          onOpenChange={(open) => setActiveModal(open ? 'publish' : null)}
          onSubmit={handlePublishAnnouncement}
          announcementToEdit={announcementToEdit}
        />
      )}
      {activeModal === 'profile' && (
        <ProfileModal
          open={activeModal === 'profile'}
          onOpenChange={(open) => {
            if (!open) setActiveModal(null);
          }}
        />
      )}
      </div>
    </ProtectedRoute>
  );
}

export default Home;
