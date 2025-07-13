'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '../ui/LoadingScreen';

// Import dynamique pour éviter l'exécution côté serveur
let pushInitDone = false;

interface AuthInitializerProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  loadingMessage?: string;
  showLoadingScreen?: boolean;
}

export const AuthInitializer = ({
  children,
  requireAuth = false,
  redirectTo = '/auth',
  loadingMessage = "Vérification de l'authentification...",
  showLoadingScreen = true
}: AuthInitializerProps) => {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !currentUser) {
        // Ne pas rediriger si on est déjà sur la page de redirection
        if (pathname !== redirectTo) {
          setIsRedirecting(true);
          router.replace(redirectTo);
          return;
        }
      }
      setIsInitialized(true);
      setIsRedirecting(false);
    }
    // Initialiser les notifications push uniquement si l'utilisateur est connecté et que ce n'est pas déjà fait
    if (!loading && currentUser && typeof window !== 'undefined' && !pushInitDone) {
      pushInitDone = true;
      import('@/lib/pushNotifications').then(({ initPushNotifications }) => {
        initPushNotifications();
      });
    }
  }, [loading, currentUser, requireAuth, redirectTo, router, pathname]);

  // Toujours attendre que l'auth soit initialisée avant de rendre les enfants
  if (loading || !isInitialized || isRedirecting) {
    return showLoadingScreen ? (
      <LoadingScreen message={loadingMessage} />
    ) : (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Ne rien afficher pendant la redirection ou si requireAuth et pas d'utilisateur
  if (requireAuth && !currentUser) {
    return null;
  }

  // Si tout est bon, afficher les enfants (toujours après init)
  if (!loading && isInitialized) {
    return <>{children}</>;
  }

  // Sécurité : fallback
  return null;
};
