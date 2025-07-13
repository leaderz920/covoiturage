import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AnnouncementType } from '@/types';
import {
  getAllAnnouncements,
  getUserAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  searchAnnouncements
} from '@/services/announcements';

// Clés de query pour React Query
export const queryKeys = {
  allAnnouncements: ['announcements'],
  userAnnouncements: (userId: string) => ['announcements', 'user', userId],
  searchAnnouncements: (params: any) => ['announcements', 'search', params],
};

/**
 * Hook pour récupérer toutes les annonces
 */
export const useAllAnnouncements = () => {
  return useQuery({
    queryKey: queryKeys.allAnnouncements,
    queryFn: getAllAnnouncements,
    refetchInterval: 60000, // Refetch toutes les 60 secondes
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook pour récupérer les annonces d'un utilisateur
 */
export const useUserAnnouncements = (userId: string) => {
  console.log('[DEBUG] useUserAnnouncements appelé avec userId:', userId);
  
  // Le queryClient est déjà disponible via le contexte React Query
  
  // Utiliser useQuery avec des callbacks séparés
  const result = useQuery<AnnouncementType[], Error>({
    queryKey: queryKeys.userAnnouncements(userId),
    queryFn: async () => {
      try {
        console.log('[DEBUG] Appel de getUserAnnouncements avec userId:', userId);
        const result = await getUserAnnouncements(userId);
        console.log('[DEBUG] Résultat de getUserAnnouncements:', result);
        return result;
      } catch (error) {
        console.error('[DEBUG] Erreur dans useUserAnnouncements:', error);
        throw error; // Propager l'erreur pour qu'elle soit gérée par React Query
      }
    },
    enabled: !!userId, // Désactive la requête si userId est vide
  });
  
  // Gérer les effets secondaires avec useEffect
  useEffect(() => {
    if (result.error) {
      console.error('[DEBUG] Erreur dans la requête useUserAnnouncements:', result.error);
      toast.error('Erreur lors du chargement de vos annonces');
    }
  }, [result.error]);
  
  useEffect(() => {
    console.log('[DEBUG] useUserAnnouncements terminé - statut:', result.status);
    if (result.status === 'success') {
      console.log('[DEBUG] Données chargées:', result.data);
    }
  }, [result.status, result.data]);
  
  return result;
};

/**
 * Hook pour rechercher des annonces
 */
export const useSearchAnnouncements = (searchParams: {
  type?: 'driver' | 'passenger';
  from?: string;
  to?: string;
  date?: Date;
}) => {
  return useQuery({
    queryKey: queryKeys.searchAnnouncements(searchParams),
    queryFn: () => searchAnnouncements(searchParams),
    enabled: !!Object.keys(searchParams).length, // Désactive la requête si pas de paramètres
  });
};

/**
 * Hook pour créer une annonce
 */
export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (announcement: Omit<AnnouncementType, 'id' | 'createdAt'>) => 
      createAnnouncement(announcement),
    onSuccess: (data) => {
      // Invalider les queries pour forcer un refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.allAnnouncements });
      
      // Invalider aussi les annonces de l'utilisateur
      if (data && data.userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userAnnouncements(data.userId) });
      } else {
        // Invalider toutes les requêtes d'annonces utilisateur si l'ID n'est pas disponible
        queryClient.invalidateQueries({ queryKey: ['announcements', 'user'] });
      }
      
      // Les notifications sont gérées au niveau du composant pour éviter les doublons
    },
    onError: (error: Error) => {
      // Les notifications sont gérées au niveau du composant pour éviter les doublons
      console.error('Erreur lors de la création:', error.message);
    },
  });
};

/**
 * Hook pour mettre à jour une annonce
 */
export const useUpdateAnnouncement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      updateAnnouncement(id, data),
    onSuccess: (updatedAnnouncement) => {
      // Invalider toutes les queries pertinentes
      queryClient.invalidateQueries({ queryKey: queryKeys.allAnnouncements });
      
      // Invalider aussi les annonces de l'utilisateur
      if (updatedAnnouncement && updatedAnnouncement.userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userAnnouncements(updatedAnnouncement.userId) });
      } else {
        // Invalider toutes les requêtes d'annonces utilisateur si l'ID n'est pas disponible
        queryClient.invalidateQueries({ queryKey: ['announcements', 'user'] });
      }
      
      // Les notifications sont gérées au niveau du composant pour éviter les doublons
    },
    onError: (error: Error) => {
      // Les notifications sont gérées au niveau du composant pour éviter les doublons
      console.error('Erreur lors de la mise à jour:', error.message);
    },
  });
};

/**
 * Hook pour supprimer une annonce
 */
export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (announcementId: string) => deleteAnnouncement(announcementId),
    onSuccess: (_, deletedId, context) => {
      // Invalider toutes les queries pertinentes
      queryClient.invalidateQueries({ queryKey: queryKeys.allAnnouncements });
      
      // Invalider toutes les requêtes d'annonces utilisateur
      // puisqu'on ne connaît pas l'ID utilisateur après suppression
      queryClient.invalidateQueries({ queryKey: ['announcements', 'user'] });
      
      // Les notifications sont gérées au niveau du composant pour éviter les doublons
    },
    onError: (error: Error) => {
      // Les notifications sont gérées au niveau du composant pour éviter les doublons
      console.error('Erreur lors de la suppression:', error.message);
    },
  });
};
