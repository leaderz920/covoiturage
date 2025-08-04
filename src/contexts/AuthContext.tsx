'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  browserLocalPersistence,
  setPersistence,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { getUserData, updateUserData } from '@/services/users';
import { withFirestoreLock, FirestoreOperations } from '@/utils/firestoreLock';
import { UserType } from '@/types';
import { auth, db } from '@/lib/firebase';
import { initPushNotifications } from '@/lib/pushNotifications';

interface AuthContextType {
  currentUser: any | null;
  userData: UserType | null;
  loading: boolean;
  setUserData: (userData: UserType | null) => void;
  refreshUserData: (userId: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: Omit<UserType, 'id' | 'email'>) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<UserType>) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  reauthenticate: (password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userData, setUserData] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  // Fonction pour rafraîchir les données de l'utilisateur après connexion
  const refreshUserData = useCallback(async (userId: string) => {
    try {
      console.log('[Auth] Début du chargement des données utilisateur');
      const userData = await getUserData(userId);
      if (userData) {
        setUserData(userData);
        console.log('[Auth] Données utilisateur chargées avec succès');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Auth] Erreur lors du chargement des données utilisateur:', JSON.stringify(error));
      return false;
    }
  }, []);

  // Implémentation avancée du refreshUserData avec système de retry et verrouillage
  const refreshUserDataWithRetry = useCallback(async (userId: string): Promise<boolean> => {
    // Utiliser le système de verrouillage pour éviter les conflits de requêtes
    const lockId = `auth_refresh_${userId}`;
    
    return withFirestoreLock(lockId, async () => {
      const MAX_RETRIES = 3;
      let attempt = 0;
      let success = false;

      while (attempt < MAX_RETRIES && !success) {
        attempt++;
        try {
          console.log(`[Auth] Tentative de chargement des données utilisateur (${attempt}/${MAX_RETRIES})`);
          success = await refreshUserData(userId);
          if (success) {
            console.log('[Auth] Données utilisateur chargées avec succès après', attempt, 'tentative(s)');
            return true;
          }
        } catch (error) {
          const errorStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
          console.error(`[Auth] Erreur lors du chargement des données utilisateur (tentative ${attempt}/${MAX_RETRIES}):`, errorStr);
          // Attendre de plus en plus longtemps entre les tentatives (backoff exponentiel)
          if (attempt < MAX_RETRIES) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`[Auth] Attente de ${delay}ms avant la prochaine tentative...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      console.warn(`[Auth] Échec du chargement des données utilisateur après ${MAX_RETRIES} tentatives`);
      return false;
    });
  }, [refreshUserData]);

  // Fonction de connexion
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('[Auth] Connexion réussie');
      toast.success('Connexion réussie');
    } catch (error: any) {
      console.error('[Auth] Erreur de connexion:', JSON.stringify(error));
      toast.error('Erreur de connexion');
      throw error;
    }
  };

  // Fonction d'inscription
  const signUp = async (email: string, password: string, userData: Omit<UserType, 'id' | 'email'>) => {
    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Mettre à jour le profil dans Firebase Auth
      await firebaseUpdateProfile(user, {
        displayName: userData.displayName || userData.username
      });
      
      // Créer le document utilisateur dans Firestore
      const userDoc: Omit<UserType, 'id'> = {
        ...userData,
        email,
        createdAt: new Date(),
        tokens: 10 // Attribution des 10 jetons initiaux
      };
      
      await setDoc(doc(db, 'users', user.uid), userDoc);
      
      console.log('[Auth] Inscription réussie');
      toast.success('Inscription réussie');
    } catch (error: any) {
      console.error('[Auth] Erreur d\'inscription:', JSON.stringify(error));
      toast.error('Erreur lors de l\'inscription');
      throw error;
    }
  };

  // Fonction de déconnexion
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserData(null);
      console.log('[Auth] Déconnexion réussie');
      toast.success('Déconnexion réussie');
    } catch (error) {
      console.error('[Auth] Erreur de déconnexion:', JSON.stringify(error));
      toast.error('Erreur lors de la déconnexion');
    }
  };

  // Fonction de réinitialisation de mot de passe
  const resetPassword = async (email: string) => {
    try {
      await firebaseSendPasswordResetEmail(auth, email);
      console.log('[Auth] Email de réinitialisation envoyé');
      toast.success('Email de réinitialisation envoyé');
    } catch (error) {
      console.error('[Auth] Erreur d\'envoi de l\'email de réinitialisation:', JSON.stringify(error));
      toast.error('Erreur lors de l\'envoi de l\'email de réinitialisation');
      throw error;
    }
  };

  // Fonction de mise à jour du profil
  const updateProfile = async (data: Partial<UserType>) => {
    try {
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }
      
      // Utiliser le verrouillage pour éviter les conflits
      const lockId = `auth_update_profile_${currentUser.id}`;
      
      await withFirestoreLock(lockId, async () => {
        // Mettre à jour dans Firebase Auth si nécessaire
        if (data.displayName || data.photoURL) {
          await firebaseUpdateProfile(auth.currentUser!, {
            displayName: data.displayName,
            photoURL: data.photoURL
          });
        }
        
        // Mettre à jour dans Firestore
        await updateUserData(currentUser.id, data);
        
        // Mettre à jour le state local
        setUserData(prevData => {
          if (!prevData) return null;
          return { ...prevData, ...data };
        });
      });
      
      console.log('[Auth] Profil mis à jour avec succès');
      toast.success('Profil mis à jour avec succès');
    } catch (error) {
      console.error('[Auth] Erreur lors de la mise à jour du profil:', JSON.stringify(error));
      toast.error('Erreur lors de la mise à jour du profil');
      throw error;
    }
  };

  // Fonction de mise à jour de l'email
  const updateEmail = async (email: string) => {
    try {
      if (!auth.currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }
      
      // Utiliser le verrouillage pour éviter les conflits
      const lockId = `auth_update_email_${currentUser?.id}`;
      
      await withFirestoreLock(lockId, async () => {
        // Mettre à jour dans Firebase Auth
        await firebaseUpdateEmail(auth.currentUser!, email);
        
        // Mettre à jour dans Firestore
        await updateUserData(currentUser!.id, { email });
        
        // Mettre à jour le state local
        setUserData(prevData => {
          if (!prevData) return null;
          return { ...prevData, email };
        });
      });
      
      console.log('[Auth] Email mis à jour avec succès');
      toast.success('Email mis à jour avec succès');
    } catch (error) {
      console.error('[Auth] Erreur lors de la mise à jour de l\'email:', JSON.stringify(error));
      toast.error('Erreur lors de la mise à jour de l\'email');
      throw error;
    }
  };

  // Fonction de mise à jour du mot de passe
  const updatePassword = async (password: string) => {
    try {
      if (!auth.currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }
      
      await firebaseUpdatePassword(auth.currentUser, password);
      console.log('[Auth] Mot de passe mis à jour avec succès');
      toast.success('Mot de passe mis à jour avec succès');
    } catch (error) {
      console.error('[Auth] Erreur lors de la mise à jour du mot de passe:', JSON.stringify(error));
      toast.error('Erreur lors de la mise à jour du mot de passe');
      throw error;
    }
  };

  // Fonction de réauthentification
  const reauthenticate = async (password: string): Promise<boolean> => {
    if (!currentUser?.email) return false;
    
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser!, credential);
      return true;
    } catch (error) {
      console.error('[Auth] Erreur lors de la réauthentification:', JSON.stringify(error));
      return false;
    }
  };

  // Effet pour l'initialisation de l'authentification et la configuration de la persistance
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;
    let initializationAttempts = 0;
    const MAX_ATTEMPTS = 3;
    
    const initializeAuth = async () => {
      if (!isMounted) return;
      
      try {
        console.log('[Auth] Initialisation de l\'authentification...');
        
        // Définir la persistance locale (reste connecté même après la fermeture du navigateur)
        try {
          await setPersistence(auth, browserLocalPersistence);
          console.log('[Auth] Persistance configurée avec succès');
        } catch (persistenceError) {
          // Si la persistance est déjà configurée, cette erreur peut être ignorée
          console.warn('[Auth] Erreur lors de la configuration de la persistance (peut être ignorée si déjà configurée):', 
            typeof persistenceError === 'object' ? JSON.stringify(persistenceError) : String(persistenceError));
        }
        
        // Ajouter un léger délai pour laisser Firebase se stabiliser
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Écouter les changements d'état d'authentification
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!isMounted) return;
          
          try {
            console.log('[Auth] État d\'authentification changé:', user ? `Utilisateur ${user.uid}` : 'Aucun utilisateur');
            
            if (user) {
              // Mettre à jour l'état de base de l'utilisateur immédiatement
              setCurrentUser({
                id: user.uid,
                email: user.email || '',
                displayName: user.displayName || '',
                username: '',
                createdAt: new Date(),
                tokens: 0
              });
              
              // Ajouter un délai intentionnel avant de charger les données utilisateur
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Charger les données utilisateur avec gestion des erreurs et retries
              let userDataLoaded = false;
              
              try {
                console.log(`[Auth] Chargement des données utilisateur avec verrouillage`);
                userDataLoaded = await refreshUserDataWithRetry(user.uid);
                if (userDataLoaded) {
                  console.log('[Auth] Données utilisateur chargées avec succès');
                  
                  // 🚀 INITIALISER LES NOTIFICATIONS PUSH APRÈS CONNEXION RÉUSSIE
                  try {
                    console.log('[Auth] Initialisation des notifications push...');
                    const notificationsEnabled = await initPushNotifications(user.uid);
                    if (notificationsEnabled) {
                      console.log('[Auth] Notifications push configurées avec succès');
                      toast.success('Notifications activées !', {
                        duration: 2000,
                        icon: '🔔'
                      });
                    } else {
                      console.warn('[Auth] Les notifications push n\'ont pas pu être configurées');
                    }
                  } catch (notificationError) {
                    console.warn('[Auth] Erreur lors de l\'initialisation des notifications:', notificationError);
                    // Non bloquant - l'utilisateur peut continuer même sans notifications
                  }
                  
                } else {
                  // Si les données ne sont pas chargées, on utilise juste les données de base sans afficher d'erreur visible
                  // Cela évite de perturber l'expérience utilisateur
                  console.error('[Auth] Impossible de charger les données utilisateur');
                }
              } catch (error) {
                const errorStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
                console.error(`[Auth] Erreur lors du chargement des données utilisateur:`, errorStr);
              }
            } else {
              console.log('[Auth] Aucun utilisateur connecté');
              setCurrentUser(null);
              setUserData(null);
            }
          } catch (error) {
            const errorStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
            console.error('[Auth] Erreur dans le gestionnaire onAuthStateChanged:', errorStr);
            setCurrentUser(null);
            setUserData(null);
          } finally {
            if (isMounted) {
              setLoading(false);
            }
          }
        });
        
      } catch (error) {
        // Utiliser une approche robuste pour capturer l'erreur
        let errorMessage = 'Erreur inconnue';
        
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (typeof error === 'object' && error !== null) {
          try {
            errorMessage = JSON.stringify(error);
          } catch (e) {
            errorMessage = 'Erreur non sérialisable';
          }
        }
        
        console.error('[Auth] Erreur lors de l\'initialisation de l\'authentification:', errorMessage);
        
        // Nouvelle tentative après un délai exponentiel
        if (initializationAttempts < MAX_ATTEMPTS && isMounted) {
          const delay = Math.min(1000 * Math.pow(2, initializationAttempts), 10000);
          console.warn(`[Auth] Nouvelle tentative d'initialisation dans ${delay}ms... (${initializationAttempts + 1}/${MAX_ATTEMPTS})`);
          
          initializationAttempts++;
          setTimeout(initializeAuth, delay);
        } else if (isMounted) {
          console.error('[Auth] Nombre maximum de tentatives d\'initialisation atteint');
          setLoading(false);
        }
      }
    };

    initializeAuth();
    
    return () => {
      isMounted = false;
      if (unsubscribe) {
        console.log('[Auth] Nettoyage du listener d\'authentification');
        unsubscribe();
      }
    };
  }, [refreshUserDataWithRetry]);

  const value = {
    currentUser,
    userData,
    loading,
    setUserData,
    refreshUserData,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    updateEmail,
    updatePassword,
    reauthenticate
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
