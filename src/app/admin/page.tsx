'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getFirestore, doc, getDoc } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth';

export default function AdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const db = getFirestore();
    
    // Utiliser Firebase Auth pour vérifier si l'utilisateur est connecté
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Vérifier si l'utilisateur a des droits d'administrateur dans Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists() && userDoc.data().isAdmin === true) {
            // L'utilisateur est un administrateur, le rediriger vers le tableau de bord (sans ajouter à l'historique)
            router.replace('/admin/dashboard');
          } else {
            // L'utilisateur n'est pas un administrateur, le rediriger vers la page d'accueil
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

  // Cette page ne sera pas affichée car nous redirigeons toujours
  return null;
}
