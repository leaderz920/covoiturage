import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  deleteDoc, 
  getDoc,
  serverTimestamp,
  updateDoc,
  orderBy,
  limit,
  QueryConstraint,
  getDocsFromCache,
  getDocsFromServer,
  getDocFromCache,
  enableNetwork,
  disableNetwork,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { AnnouncementType } from '@/types';
import { withFirestoreLock, FirestoreOperations } from '@/utils/firestoreLock';

const COLLECTION_NAME = 'announcements';

// Créer une nouvelle annonce avec vérification de connectivité
export const createAnnouncement = async (announcement: Omit<AnnouncementType, 'id' | 'createdAt'>) => {
  try {
    // Vérifier la connectivité
    if (!isOnline()) {
      throw new Error('Impossible de créer une annonce en mode hors ligne. Veuillez vous connecter à internet.');
    }
    
    // S'assurer que l'ID utilisateur est présent
    if (!announcement.userId && auth.currentUser) {
      console.log('[FIRESTORE DEBUG] Ajout automatique de l\'ID utilisateur:', auth.currentUser.uid);
      announcement.userId = auth.currentUser.uid;
      
      // Ajouter également le nom d'utilisateur et la photo si disponibles
      if (!announcement.userName && auth.currentUser.displayName) {
        announcement.userName = auth.currentUser.displayName;
      }
      
      if (!announcement.userPhoto && auth.currentUser.photoURL) {
        announcement.userPhoto = auth.currentUser.photoURL;
      }
    }
    
    if (!announcement.userId) {
      console.error('[FIRESTORE DEBUG] ERREUR: Tentative de création d\'annonce sans ID utilisateur!');
    }
    
    // Log pour le débogage des champs de véhicule
    console.log('[FIRESTORE DEBUG] Données d\'annonce avant création:', JSON.stringify(announcement));
    console.log('[FIRESTORE DEBUG] Photo du véhicule présente:', !!announcement.vehiclePhoto);
    console.log('[FIRESTORE DEBUG] ID utilisateur inclus:', announcement.userId);
    console.log('[FIRESTORE DEBUG] Infos supplémentaires présentes:', !!announcement.additionalInfo);
    console.log('[FIRESTORE DEBUG] Contenu des infos supplémentaires:', announcement.additionalInfo);
    
    // Créer une copie de l'annonce pour la nettoyer
    const cleanedAnnouncement = { ...announcement };
    
    // Supprimer le champ additionalInfo s'il est vide ou undefined
    if (cleanedAnnouncement.additionalInfo === undefined || cleanedAnnouncement.additionalInfo === '') {
      delete cleanedAnnouncement.additionalInfo;
    }
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...cleanedAnnouncement,
      createdAt: serverTimestamp()
    });
    
    // Log pour confirmation de la création
    console.log('[FIRESTORE DEBUG] Annonce créée avec ID:', docRef.id);
    
    // Mettre à jour les jetons de l'utilisateur
    // Cette opération devrait normalement être effectuée dans une fonction Cloud
    
    // Récupérer le document fraichement créé pour avoir toutes les données (incluant les timestamp)
    let newDocSnapshot;
    try {
      newDocSnapshot = await getDocFromCache(docRef);
      console.log('[FIRESTORE DEBUG] Document récupéré depuis le cache');
    } catch (error) {
      newDocSnapshot = await getDoc(docRef);
      console.log('[FIRESTORE DEBUG] Document récupéré depuis le serveur');
    }
    
    if (!newDocSnapshot.exists()) {
      throw new Error('Le document nouvellement créé n\'a pas pu être récupéré');
    }
    
    // Retourner l'objet complet plutôt que seulement l'ID
    return {
      id: docRef.id,
      ...newDocSnapshot.data(),
      ...announcement // Assurer que toutes les données sont présentes, même si serverTimestamp n'est pas encore résolu
    } as AnnouncementType;
  } catch (error) {
    console.error('Erreur lors de la création de l\'annonce:', error);
    throw error;
  }
};

// Vérifier la connectivité réseau
export const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};

// Activer le mode hors ligne
export const goOffline = async (): Promise<void> => {
  try {
    await disableNetwork(db);
    console.log('Mode hors ligne activé');
  } catch (error) {
    console.error('Erreur lors du passage en mode hors ligne:', error);
  }
};

// Activer le mode en ligne
export const goOnline = async (): Promise<void> => {
  try {
    await enableNetwork(db);
    console.log('Mode en ligne activé');
  } catch (error) {
    console.error('Erreur lors du passage en mode en ligne:', error);
  }
};

// Récupérer toutes les annonces avec stratégie de cache
export const getAllAnnouncements = async (): Promise<AnnouncementType[]> => {
  // Utiliser l'utilitaire de verrouillage pour éviter les conflits
  return withFirestoreLock(FirestoreOperations.GET_ALL_ANNOUNCEMENTS, async () => {
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    const attemptGetAnnouncements = async (): Promise<AnnouncementType[]> => {
      try {
        console.log('[FIRESTORE DEBUG] Début de la récupération des annonces');
        
        const q = query(
          collection(db, COLLECTION_NAME), 
          orderBy('createdAt', 'desc')
        );
        
        let querySnapshot;
        
        // Utiliser getDocs standard plutôt que getDocsFromServer pour éviter les erreurs 'already-exists'
        try {
          console.log(`[FIRESTORE DEBUG] Tentative de récupération des annonces avec getDocs (essai ${retryCount + 1}/${MAX_RETRIES + 1})`);
          querySnapshot = await getDocs(q);
          console.log('[FIRESTORE DEBUG] Annonces récupérées avec succès:', querySnapshot.docs.length);
        } catch (error: any) {
          if (error.code === 'already-exists' && retryCount < MAX_RETRIES) {
            retryCount++;
            console.warn(`[FIRESTORE DEBUG] Erreur 'already-exists' détectée, nouvelle tentative ${retryCount}/${MAX_RETRIES} dans ${500 * retryCount}ms...`);
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
            return attemptGetAnnouncements();
          }
          console.error('[FIRESTORE DEBUG] Erreur avec getDocs:', JSON.stringify(error));
          throw error;
        }
        
        // Transformer les données pour récupérer correctement toutes les informations
        const announcements = querySnapshot.docs.map(doc => {
          const data = doc.data();
          
          // Construction de l'annonce avec toutes les informations
          const announcement: AnnouncementType = {
            id: doc.id,
            type: data.type,
            from: data.from,
            to: data.to,
            date: data.date,
            time: data.time,
            price: data.price,
            seats: data.seats,
            userId: data.userId,
            createdAt: data.createdAt,
            vehicleType: data.vehicleType || (data.type === 'driver' ? ['Véhicule non spécifié'] : ['Sans véhicule']),
            vehiclePhoto: data.vehiclePhoto,
            vehiclePhotoUrl: data.vehiclePhotoUrl, // S'assurer que l'URL de la photo est incluse
            // Corriger la gestion du numéro de téléphone (support des deux formats)
            phone: data.phone || data.phoneNumber || '',
            // Conserver les informations utilisateur telles qu'elles sont dans la base
            userName: data.userName || 'Utilisateur',
            userPhoto: data.userPhoto || '/images/default-avatar.png',
            // Ajouter les détails supplémentaires s'ils existent
            additionalInfo: data.additionalInfo || ''
          };
          
          return announcement;
        });
        
        console.log('[FIRESTORE DEBUG] Total des annonces récupérées:', announcements.length);
        return announcements;
      } catch (error) {
        console.error('Erreur lors de la récupération des annonces:', JSON.stringify(error));
        throw error;
      }
    };
    
    return attemptGetAnnouncements();
  });
};

// Récupérer les annonces d'un utilisateur avec stratégie de cache
export const getUserAnnouncements = async (userId: string): Promise<AnnouncementType[]> => {
  console.log('[DEBUG] getUserAnnouncements appelé avec userId:', userId);
  
  if (!userId) {
    console.warn('[DEBUG] Aucun userId fourni, retour d\'un tableau vide');
    return [];
  }
  
  // Utiliser l'utilitaire de verrouillage avec un identifiant unique incluant l'ID utilisateur
  const lockId = `${FirestoreOperations.GET_USER_ANNOUNCEMENTS}_${userId}`;
  
  return withFirestoreLock(lockId, async () => {
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    const attemptGetUserAnnouncements = async (): Promise<AnnouncementType[]> => {
      try {
        console.log(`[DEBUG] Tentative de récupération des annonces pour l'utilisateur: ${userId}`);
        
        // Temporairement sans orderBy pour éviter l'erreur d'index
        // L'index sera créé manuellement dans Firebase Console
        const q = query(
          collection(db, COLLECTION_NAME), 
          where('userId', '==', userId)
        );
        
        let querySnapshot;
        
        // Utiliser getDocs standard pour éviter les erreurs 'already-exists'
        try {
          console.log(`[FIRESTORE DEBUG] Tentative de récupération des annonces utilisateur avec getDocs (essai ${retryCount + 1}/${MAX_RETRIES + 1})`);
          querySnapshot = await getDocs(q);
          console.log('[FIRESTORE DEBUG] Annonces utilisateur récupérées avec succès:', querySnapshot.docs.length);
          console.log('[DEBUG] Première annonce brute (si disponible):', querySnapshot.docs[0]?.data());
        } catch (error: any) {
          console.error('[DEBUG] Erreur lors de la récupération des annonces:', error);
          if (error.code === 'already-exists' && retryCount < MAX_RETRIES) {
            retryCount++;
            console.warn(`[FIRESTORE DEBUG] Erreur 'already-exists' détectée, nouvelle tentative ${retryCount}/${MAX_RETRIES} dans ${500 * retryCount}ms...`);
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
            return attemptGetUserAnnouncements();
          }
          console.error('[FIRESTORE DEBUG] Erreur lors de la récupération des annonces utilisateur:', JSON.stringify(error));
          throw error;
        }
        
        // Traiter correctement les données Firestore, notamment les timestamps
        const announcements = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('[DEBUG] Données brutes de l\'annonce:', { id: doc.id, ...data });
          
          // Convertir les timestamps Firestore en objets Date JavaScript
          const formattedData: any = { ...data };
          
          // Traitement de la date de l'annonce
          if (data.date && typeof data.date === 'object' && 'seconds' in data.date) {
            formattedData.date = new Date(data.date.seconds * 1000);
          } else if (data.date) {
            formattedData.date = new Date(data.date);
          }
          
          // Traitement de la date de création
          if (data.createdAt && typeof data.createdAt === 'object' && 'seconds' in data.createdAt) {
            formattedData.createdAt = new Date(data.createdAt.seconds * 1000);
          } else if (data.createdAt) {
            formattedData.createdAt = new Date(data.createdAt);
          }
          
          return {
            id: doc.id,
            ...formattedData
          } as AnnouncementType;
        });
        
        // Trier les annonces côté client par createdAt (du plus récent au plus ancien)
        announcements.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
        
        console.log('[DEBUG] Annonces formatées et triées:', announcements);
        return announcements;
      } catch (error) {
        console.error('Erreur lors de la récupération des annonces de l\'utilisateur:', JSON.stringify(error));
        throw error;
      }
    };
    
    return attemptGetUserAnnouncements();
  });
};

// Rechercher des annonces avec stratégie de cache
export const searchAnnouncements = async (
  searchParams: {
    type?: 'driver' | 'passenger';
    from?: string;
    to?: string;
    date?: Date;
  }
): Promise<AnnouncementType[]> => {
  // Générer un identifiant unique basé sur les paramètres de recherche
  const searchParamsKey = JSON.stringify(searchParams);
  const lockId = `${FirestoreOperations.SEARCH_ANNOUNCEMENTS}_${searchParamsKey.substring(0, 50)}`;
  
  return withFirestoreLock(lockId, async () => {
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    const attemptSearchAnnouncements = async (): Promise<AnnouncementType[]> => {
      try {
      const q = collection(db, COLLECTION_NAME);
        
        // Construire la requête en fonction des paramètres
      const queryConstraints: QueryConstraint[] = [];
        
        if (searchParams.type) {
          queryConstraints.push(where('type', '==', searchParams.type));
        }
        
        if (searchParams.from) {
          queryConstraints.push(where('from', '>=', searchParams.from));
          queryConstraints.push(where('from', '<=', searchParams.from + '\uf8ff'));
        }
        
        if (searchParams.to) {
          queryConstraints.push(where('to', '>=', searchParams.to));
          queryConstraints.push(where('to', '<=', searchParams.to + '\uf8ff'));
        }
        
        if (searchParams.date) {
          queryConstraints.push(where('date', '==', searchParams.date));
        }
        
        // Toujours ajouter orderBy et limit
        queryConstraints.push(orderBy('createdAt', 'desc'));
        queryConstraints.push(limit(20));
        
        const finalQuery = query(q, ...queryConstraints);
        
        let querySnapshot;
        
        // Remplacer la stratégie de cache/server par une approche plus robuste avec retry
        try {
          console.log(`[FIRESTORE DEBUG] Tentative de recherche d'annonces (essai ${retryCount + 1}/${MAX_RETRIES + 1})`);
          querySnapshot = await getDocs(finalQuery);
          console.log('[FIRESTORE DEBUG] Résultats de recherche récupérés avec succès:', querySnapshot.docs.length);
        } catch (error: any) {
          if (error.code === 'already-exists' && retryCount < MAX_RETRIES) {
            retryCount++;
            console.warn(`[FIRESTORE DEBUG] Erreur 'already-exists' détectée, nouvelle tentative ${retryCount}/${MAX_RETRIES} dans ${500 * retryCount}ms...`);
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
            return attemptSearchAnnouncements();
          }
          console.error('[FIRESTORE DEBUG] Erreur lors de la recherche d\'annonces:', JSON.stringify(error));
          throw error;
        }
        
        // Traiter et retourner les résultats
        return querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data
          } as AnnouncementType;
        });
      } catch (error) {
        console.error('Erreur lors de la recherche d\'annonces:', JSON.stringify(error));
        throw error;
      }
    };
    
    return attemptSearchAnnouncements();
  });
};

// Supprimer une annonce avec vérification de connectivité
export const deleteAnnouncement = async (announcementId: string): Promise<void> => {
  try {
    if (!isOnline()) {
      throw new Error('Impossible de supprimer une annonce en mode hors ligne');
    }
    await deleteDoc(doc(db, COLLECTION_NAME, announcementId));
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'annonce:', error);
    throw error;
  }
};

// Mettre à jour une annonce existante
export const updateAnnouncement = async (id: string, announcementData: any): Promise<AnnouncementType> => {
  try {
    // Récupérer une référence au document à mettre à jour
    const announcementRef = doc(db, COLLECTION_NAME, id);
    
    // Supprimer le champ id car Firestore gère cette propriété séparément
    const { id: _, ...dataToUpdate } = announcementData;
    
    // Créer un nouvel objet pour stocker les données nettoyées
    const cleanedData: Record<string, any> = {};
    
    // Nettoyer les données avant la mise à jour
    Object.keys(dataToUpdate).forEach(key => {
      // Ne pas inclure les champs undefined ou chaînes vides (sauf pour les champs qui peuvent être vides)
      if (dataToUpdate[key] !== undefined && dataToUpdate[key] !== '') {
        // Convertir vehicleType en tableau si nécessaire
        if (key === 'vehicleType' && !Array.isArray(dataToUpdate[key])) {
          cleanedData[key] = dataToUpdate[key] ? [dataToUpdate[key]] : [];
        } else {
          cleanedData[key] = dataToUpdate[key];
        }
      }
    });
    
    // Ajouter une date de mise à jour
    cleanedData.updatedAt = new Date();
    
    // Log pour le débogage des champs lors de la mise à jour
    console.log('[FIRESTORE DEBUG] Données d\'annonce avant mise à jour:', JSON.stringify(cleanedData));
    console.log('[FIRESTORE DEBUG] Infos supplémentaires présentes:', !!cleanedData.additionalInfo);
    console.log('[FIRESTORE DEBUG] Contenu des infos supplémentaires:', cleanedData.additionalInfo);
    
    // Mettre à jour le document avec les données nettoyées
    await updateDoc(announcementRef, cleanedData);
    
    // Récupérer l'annonce mise à jour
    const updatedDoc = await getDoc(announcementRef);
    
    if (!updatedDoc.exists()) {
      throw new Error('L\'annonce mise à jour n\'a pas été trouvée');
    }
    
    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as AnnouncementType;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'annonce:', error);
    throw error;
  }
};
