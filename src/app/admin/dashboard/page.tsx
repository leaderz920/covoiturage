'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { UsersManagement } from '@/components/admin/UsersManagement';
import { AnnouncementsManagement } from '@/components/admin/AnnouncementsManagement';
import { TokensManagement } from '@/components/admin/TokensManagement';
import { auth } from '@/lib/firebase';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const db = getFirestore();
    
    // Utiliser Firebase Auth pour vérifier si l'utilisateur est connecté et est admin
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Vérifier si l'utilisateur a des droits d'administrateur dans Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists() && userDoc.data().isAdmin === true) {
            // L'utilisateur est un administrateur
            setIsAuthenticated(true);
          } else {
            // L'utilisateur n'est pas un administrateur, le rediriger vers la page d'accueil (sans ajouter à l'historique)
            console.log("Accès refusé: Droits administrateur requis");
            router.replace('/');
          }
        } catch (error) {
          console.error('Erreur lors de la vérification des droits administrateur:', error);
          router.push('/');
        }
      } else {
        // Utilisateur non connecté, rediriger vers la page d'authentification
        router.replace('/auth');
      }
      setIsLoading(false);
    });

    // Nettoyage de l'écouteur lors du démontage du composant
    return () => unsubscribe();
  }, [router]);

  const handleLogout = () => {
    signOut(auth).then(() => {
      // Redirection vers la page d'accueil sans ajouter à l'historique
      router.replace('/');
    }).catch((error) => {
      console.error('Erreur lors de la déconnexion:', error);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-700">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirection déjà en cours, ne rien afficher
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* En-tête du tableau de bord */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex-shrink-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 whitespace-nowrap">
                EcoTrajet Admin
              </h1>
            </div>
            <div className="ml-4">
              <Button
                variant="outline"
                size={"sm"}
                className="text-xs sm:text-sm text-red-600 border-red-300 hover:bg-red-50 py-1 sm:py-2 px-2 sm:px-4"
                onClick={handleLogout}
              >
                <span className="hidden sm:inline">Déconnexion</span>
                <span className="sm:hidden">Quitter</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 py-3 sm:py-6 overflow-x-hidden">
        <div className="mx-auto w-full px-2 sm:px-4 lg:px-6 max-w-7xl">
          <Tabs defaultValue="users" className="w-full">
            <div className="overflow-x-auto pb-2">
              <TabsList className="grid w-full min-w-max grid-cols-3 mb-3 sm:mb-6 text-xs sm:text-sm">
                <TabsTrigger value="users" className="py-2 px-1 sm:px-3 truncate">
                  Utilisateurs
                </TabsTrigger>
                <TabsTrigger value="announcements" className="py-2 px-1 sm:px-3 truncate">
                  Annonces
                </TabsTrigger>
                <TabsTrigger value="tokens" className="py-2 px-1 sm:px-3 truncate">
                  Jetons
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <TabsContent 
                value="users" 
                className="p-3 sm:p-4 md:p-6 m-0 overflow-x-auto"
              >
                <UsersManagement />
              </TabsContent>
              <TabsContent 
                value="announcements" 
                className="p-3 sm:p-4 md:p-6 m-0 overflow-x-auto"
              >
                <AnnouncementsManagement />
              </TabsContent>
              <TabsContent 
                value="tokens" 
                className="p-3 sm:p-4 md:p-6 m-0 overflow-x-auto"
              >
                <TokensManagement />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>

      {/* Pied de page */}
      <footer className="bg-white border-t border-gray-200 py-3 mt-auto">
        <div className="mx-auto px-4">
          <p className="text-center text-xs sm:text-sm text-gray-500">
            {new Date().getFullYear()} EcoTrajet - Interface d&apos;administration
          </p>
        </div>
      </footer>
    </div>
  );
}
