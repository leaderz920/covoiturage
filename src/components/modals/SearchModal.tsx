import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog-simple";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnnouncementCard } from '../announcements/AnnouncementCard';
import { AnnouncementType } from '@/types';

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcements?: AnnouncementType[];
  searchQuery?: string;
  loading?: boolean;
}

export function SearchModal({ open, onOpenChange, announcements = [], searchQuery: initialSearchQuery = '', loading = false }: SearchModalProps) {
  console.log('[DEBUG SearchModal] Rendu avec', announcements.length, 'annonces');
  
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [searchType, setSearchType] = useState<'driver' | 'passenger' | 'all'>('all');
  const [searchResults, setSearchResults] = useState<AnnouncementType[]>(announcements);

  // Mise à jour des résultats quand les annonces changent
  React.useEffect(() => {
    console.log('[DEBUG SearchModal] useEffect pour announcements, longueur:', announcements.length);
    // Mettre à jour les résultats même si le tableau est vide pour gérer le cas où aucune annonce n'est disponible
    handleSearch();
  }, [announcements]);

  // Filtrer les annonces avec des paramètres optionnels
  const filterAnnouncements = (type?: 'driver' | 'passenger' | 'all') => {
    console.log('[DEBUG SearchModal] filterAnnouncements appelé avec le type:', type);
    console.log('[DEBUG SearchModal] Nombre d\'annonces disponibles pour filtrage:', announcements.length);
    
    // Utiliser le type passé en paramètre ou l'état actuel
    const filterType = type !== undefined ? type : searchType;
    
    // Filtrer les annonces selon la recherche et le type d'annonce
    let filteredResults = [...announcements]; // Créer une copie pour éviter les mutations
    console.log('[DEBUG SearchModal] Annonces avant filtrage:', filteredResults.length);
    
    // Filtrer par type si nécessaire 
    if (filterType !== 'all') {
      filteredResults = filteredResults.filter(announcement => announcement.type === filterType);
      console.log('[DEBUG SearchModal] Après filtrage par type:', filterType, 'résultats:', filteredResults.length);
    }
    
    // Filtrer par texte de recherche si fourni (y compris les détails supplémentaires)
    if (searchQuery.trim()) {
      filteredResults = filteredResults.filter(announcement => 
        announcement.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
        announcement.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (announcement.userName && announcement.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (announcement.additionalInfo && announcement.additionalInfo.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      console.log('[DEBUG SearchModal] Après filtrage par texte (y compris détails):', searchQuery, 'résultats:', filteredResults.length);
    }
    
    // Trier les résultats par date de création (plus récents en haut)
    filteredResults = sortAnnouncementsByDate(filteredResults);
    console.log('[DEBUG SearchModal] Résultats finaux après tri:', filteredResults.length);
    
    // Vérifier les détails supplémentaires dans les résultats pour le débogage
    // Ajouter un marqueur pour identifier la source des annonces dans les logs
    filteredResults = filteredResults.map(announcement => ({
      ...announcement,
      _source: 'SearchModal'  // Propriété non standard pour le débogage
    }));
    
    filteredResults.forEach(announcement => {
      console.log('[DEBUG SearchModal] Annonce ID:', announcement.id, 'contient additionalInfo:', !!announcement.additionalInfo);
      if (announcement.additionalInfo) {
        console.log('[DEBUG SearchModal] Contenu de additionalInfo:', announcement.additionalInfo);
      }
    });
    
    setSearchResults(filteredResults);
  };
  
  // Wrapper autour de filterAnnouncements pour compatibilité
  const handleSearch = () => {
    console.log('[DEBUG SearchModal] handleSearch appelé');
    filterAnnouncements();
  };
  
  // Fonction pour trier les annonces par date (plus récentes en haut)
  const sortAnnouncementsByDate = (announcements: AnnouncementType[]): AnnouncementType[] => {
    return [...announcements].sort((a, b) => {
      const timestampA = getTimestamp(a.createdAt);
      const timestampB = getTimestamp(b.createdAt);
      return timestampB - timestampA; // Ordre décroissant
    });
  };
  
  // Fonction pour convertir divers formats de date en timestamp
  const getTimestamp = (date: any): number => {
    if (!date) return 0;
    
    try {
      if (date instanceof Date) {
        return date.getTime();
      } else if (typeof date === 'object') {
        // Cas des timestamps Firestore
        if ('seconds' in date && typeof date.seconds === 'number') {
          return date.seconds * 1000;
        } 
        // Cas des objets Firestore avec toDate()
        else if ('toDate' in date && typeof date.toDate === 'function') {
          return date.toDate().getTime();
        }
      } else if (typeof date === 'string') {
        return new Date(date).getTime();
      } else if (typeof date === 'number') {
        return date;
      }
    } catch (error) {
      console.error('Erreur lors de la conversion de date:', error);
    }
    
    return 0;
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
          <div className="relative py-3 px-6 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
            <DialogClose className="absolute right-3 top-3 bg-white/20 text-white hover:bg-white/30 rounded-full p-1" />
            <div className="flex items-center">
              <DialogClose className="text-white hover:bg-white/20 rounded-full p-1 mr-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </DialogClose>
              <div className="bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md mr-3">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <DialogTitle id={titleId} className="text-base font-bold text-white leading-tight">Rechercher un trajet</DialogTitle>
                <p className="text-blue-50 text-xs">Trouver des covoiturages disponibles</p>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto p-6">
          <div className="mb-6">
            <div className="relative">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Départ ou arrivée"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 pr-10 border-blue-200 focus:border-blue-400 shadow-sm rounded-lg text-md"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-500 hover:scale-110 transition-transform"
                  onClick={handleSearch}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
              {/* Champ pour rechercher les détails supplémentaires supprimé, la recherche se fait maintenant dans le champ principal */}
            </div>
            
            {/* Type de recherche */}
            <div className="flex flex-wrap mt-4 mb-2 bg-gray-50 p-1 rounded-xl shadow-sm">
              <Button
                onClick={() => { 
                  setSearchType('all'); 
                  filterAnnouncements('all'); 
                }}
                variant="ghost"
                size="sm"
                className={`flex-1 rounded-lg font-medium ${searchType === 'all' ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Tous
              </Button>
              <Button
                onClick={() => { 
                  setSearchType('driver'); 
                  filterAnnouncements('driver'); 
                }}
                variant="ghost"
                size="sm"
                className={`flex-1 rounded-lg font-medium ${searchType === 'driver' ? 'bg-gradient-to-r from-green-400 to-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <svg className="w-3.5 h-3.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs sm:text-sm">Conduct.</span>
              </Button>
              <Button
                onClick={() => { 
                  setSearchType('passenger'); 
                  filterAnnouncements('passenger'); 
                }}
                variant="ghost"
                size="sm"
                className={`flex-1 rounded-lg font-medium ${searchType === 'passenger' ? 'bg-gradient-to-r from-purple-400 to-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <svg className="w-3.5 h-3.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-xs sm:text-sm">Passag.</span>
              </Button>
            </div>
          </div>
          
          <div>
            {searchResults.length > 0 ? (
              <div>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">{searchResults.length} trajet{searchResults.length > 1 ? 's' : ''} trouvé{searchResults.length > 1 ? 's' : ''}</p>
                  <div className="text-xs bg-gray-50 px-2 py-1 rounded-md text-gray-500">
                    <span className="font-medium">Tri:</span> Plus récents
                  </div>
                </div>
                <div className="space-y-4">
                  {searchResults.map(announcement => (
                    <AnnouncementCard
                      key={announcement.id}
                      announcement={announcement}
                      showContact={true}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12 px-3 sm:px-4 bg-gray-50 rounded-xl">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-blue-50">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-1">Aucun trajet trouvé</h3>
                <p className="text-xs sm:text-sm text-gray-500 mb-4">{announcements.length > 0 ? 'Essayez avec d\'autres critères de recherche' : 'Aucune annonce disponible pour le moment'}</p>
                {announcements.length > 0 && (
                  <Button 
                    variant="outline" 
                    className="bg-white border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchType('all');
                      handleSearch();
                    }}
                  >
                    Effacer les filtres
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
