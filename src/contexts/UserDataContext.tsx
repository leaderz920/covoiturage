'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getUserData, updateUserTokens } from '@/services/users';
import { UserType } from '@/types';
import { toast } from 'sonner';

interface UserDataContextType {
  userData: UserType | null;
  loading: boolean;
  updateTokens: (amount: number) => Promise<boolean>;
  refreshUserData: () => Promise<UserType | null>;
  hasEnoughTokens: (required: number) => boolean;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
}

interface UserDataProviderProps {
  children: ReactNode;
}

export function UserDataProvider({ children }: UserDataProviderProps) {
  const [userData, setUserData] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserData = async () => {
    try {
      if (auth.currentUser) {
        const freshUserData = await getUserData(auth.currentUser.uid);
        setUserData(freshUserData);
        return freshUserData;
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des données utilisateur:', error);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      
      if (user) {
        try {
          // Délai pour s'assurer que les données Firestore sont complètement synchronisées
          // Spécialement important pour les nouveaux utilisateurs
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Invalider explicitement le cache pour forcer une récupération fraîche
          // On peut faire cela en appelant directement la fonction, sans passer par le cache
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const freshUserData = {
              id: docSnap.id,
              ...docSnap.data()
            } as UserType;
            
            console.log('[DEBUG] Données utilisateur fraîches:', freshUserData);
            setUserData(freshUserData);
          } else {
            console.error('Aucune donnée utilisateur trouvée dans Firestore');
            setUserData(null);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des données utilisateur:', error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const updateTokens = async (amount: number): Promise<boolean> => {
    try {
      if (!auth.currentUser) {
        toast.error('Vous devez être connecté pour effectuer cette action');
        return false;
      }

      // Vérifier si l'utilisateur a assez de jetons pour une déduction
      if (amount < 0 && userData && userData.tokens + amount < 0) {
        toast.error('Vous n\'avez pas assez de jetons pour effectuer cette action');
        return false;
      }

      // Mettre à jour les jetons dans Firestore
      await updateUserTokens(auth.currentUser.uid, amount);
      
      // Rafraîchir les données utilisateur
      await refreshUserData();
      
      // Afficher une notification en fonction de l'opération
      if (amount > 0) {
        toast.success(`${amount} jeton${amount > 1 ? 's' : ''} ajouté${amount > 1 ? 's' : ''}`);
      } else if (amount < 0) {
        toast.info(`${Math.abs(amount)} jeton${Math.abs(amount) > 1 ? 's' : ''} utilisé${Math.abs(amount) > 1 ? 's' : ''}`);
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des jetons:', error);
      toast.error('Une erreur est survenue lors de la mise à jour des jetons');
      return false;
    }
  };

  const hasEnoughTokens = (required: number): boolean => {
    return userData !== null && userData.tokens >= required;
  };

  const value = {
    userData,
    loading,
    updateTokens,
    refreshUserData,
    hasEnoughTokens
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}
