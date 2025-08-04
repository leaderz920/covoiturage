import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import { FirestoreCache } from '@/utils/firebasePerformance';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { UserType } from '@/types';
import { withFirestoreLock, FirestoreOperations } from '@/utils/firestoreLock';

const COLLECTION_NAME = 'users';

// Créer une instance de cache pour les données utilisateurs
const userCache = new FirestoreCache<UserType>();

// Convertir le nom d'utilisateur en email
export const usernameToEmail = (username: string): string => {
  return `${username.toLowerCase()}@ecotrajet.com`;
};

// Créer un nouvel utilisateur
export const createUser = async (username: string, password: string) => {
  try {
    // Convertir le nom d'utilisateur en email pour Firebase
    const email = usernameToEmail(username);
    
    // Créer l'utilisateur avec Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Mettre à jour le profil
    await updateProfile(user, {
      displayName: username
    });
    
    // Créer le document utilisateur dans Firestore
    const userData: Omit<UserType, 'id'> = {
      username: username,
      email: email,
      displayName: username,
      photoURL: user.photoURL || undefined,
      tokens: 10, // Attribution des 10 jetons initiaux
      createdAt: new Date(),
      phoneNumber: user.phoneNumber || undefined
    };
    
    await setDoc(doc(db, COLLECTION_NAME, user.uid), userData);
    
    return {
      id: user.uid,
      ...userData
    };
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    throw error;
  }
};

// Connecter un utilisateur
export const signInUser = async (username: string, password: string) => {
  try {
    // Convertir le nom d'utilisateur en email pour Firebase
    const email = usernameToEmail(username);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    throw error;
  }
};

// Récupérer les informations d'un utilisateur avec optimisation de performance
export const getUserData = async (userId: string): Promise<UserType | null> => {
  // Utiliser l'utilitaire de verrouillage avec un identifiant unique incluant l'ID utilisateur
  const lockId = `${FirestoreOperations.GET_USER_DATA}_${userId}`;
  
  return withFirestoreLock(lockId, async () => {
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    const attemptGetUserData = async (): Promise<UserType | null> => {
      try {
        console.log(`[DEBUG getUserData] Début de récupération des données pour utilisateur: ${userId} (tentative ${retryCount + 1}/${MAX_RETRIES + 1})`);
        
        // Vérifier si l'ID utilisateur est valide
        if (!userId) {
          console.error('[DEBUG getUserData] ID utilisateur non fourni');
          return null;
        }
        
        // Requête directe à Firestore
        const docRef = doc(db, COLLECTION_NAME, userId);
        console.log('[DEBUG getUserData] Récupération du document:', COLLECTION_NAME, userId);
        
        let docSnap;
        try {
          docSnap = await getDoc(docRef);
        } catch (error: any) {
          // Gérer spécifiquement l'erreur "already-exists"
          if (error.code === 'already-exists' && retryCount < MAX_RETRIES) {
            retryCount++;
            console.warn(`[DEBUG getUserData] Erreur 'already-exists' détectée, nouvelle tentative ${retryCount}/${MAX_RETRIES} dans ${500 * retryCount}ms...`);
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
            return attemptGetUserData();
          }
          throw error;
        }
        
        if (docSnap.exists()) {
          // Créer l'objet utilisateur avec des valeurs par défaut pour les champs requis
          const userData = {
            id: docSnap.id,
            username: '',
            email: '',
            displayName: '',
            tokens: 0,
            createdAt: new Date(),
            ...docSnap.data()
          } as UserType;
          
          console.log('[DEBUG getUserData] Données utilisateur récupérées avec succès');
          return userData;
        } else {
          console.log('[DEBUG getUserData] Aucun document utilisateur trouvé pour ID:', userId);
          return null;
        }
      } catch (error: any) {
        // Log de l'erreur complète pour une meilleure visibilité
        console.error('[DEBUG getUserData] Erreur lors de la récupération des informations:', JSON.stringify(error));
        return null;
      }
    };
    
    return attemptGetUserData();
  });
};

// Mettre à jour les jetons d'un utilisateur
export const updateUserTokens = async (userId: string, amount: number): Promise<boolean> => {
  try {
    const userRef = doc(db, COLLECTION_NAME, userId);
    
    await updateDoc(userRef, {
      tokens: increment(amount)
    });
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour des jetons:', error);
    throw error;
  }
};

// Ajouter une référence d'annonce à un utilisateur
export const addAnnouncementToUser = async (userId: string, announcementId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, COLLECTION_NAME, userId);
    
    await updateDoc(userRef, {
      announcements: arrayUnion(announcementId)
    });
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'annonce à l\'utilisateur:', error);
    throw error;
  }
};

// Supprimer une référence d'annonce d'un utilisateur
export const removeAnnouncementFromUser = async (userId: string, announcementId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, COLLECTION_NAME, userId);
    
    await updateDoc(userRef, {
      announcements: arrayRemove(announcementId)
    });
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'annonce de l\'utilisateur:', error);
    throw error;
  }
};

// Mettre à jour le profil utilisateur
export const updateUserProfile = async (
  userId: string, 
  data: { displayName?: string; photoURL?: string; phoneNumber?: string }
): Promise<boolean> => {
  try {
    const userRef = doc(db, COLLECTION_NAME, userId);
    
    // Préparer les données à mettre à jour
    const updateData: { [key: string]: any } = {
      updatedAt: serverTimestamp(),
      ...data
    };
    
    // Mettre à jour le document
    await updateDoc(userRef, updateData);
    
    // Mettre à jour le profil dans Firebase Auth si nécessaire
    if (auth.currentUser && (data.displayName || data.photoURL)) {
      await updateProfile(auth.currentUser, {
        displayName: data.displayName,
        photoURL: data.photoURL
      });
    }
    
    // Invalider le cache pour cet utilisateur
    userCache.invalidate(`user_${userId}`);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil utilisateur:', error);
    return false;
  }
};

// Mettre à jour les données utilisateur dans Firestore
export const updateUserData = async (
  userId: string,
  userData: Partial<UserType>
): Promise<boolean> => {
  try {
    const userRef = doc(db, COLLECTION_NAME, userId);
    
    // Préparer les données à mettre à jour
    const updateData: { [key: string]: any } = {
      ...userData,
      updatedAt: serverTimestamp()
    };
    
    // Mettre à jour le document
    await updateDoc(userRef, updateData);
    
    // Invalider le cache pour cet utilisateur
    userCache.invalidate(`user_${userId}`);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour des données utilisateur:', error);
    return false;
  }
};
