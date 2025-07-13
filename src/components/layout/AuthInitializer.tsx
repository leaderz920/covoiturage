'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '../ui/LoadingScreen';

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
  }, [loading, currentUser, requireAuth, redirectTo, router, pathname]);

  // Afficher un écran de chargement pendant la vérification si demandé
  if (loading || !isInitialized || isRedirecting) {
    return showLoadingScreen ? (
      <LoadingScreen message={loadingMessage} />
    ) : (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Ne rien afficher pendant la redirection
  if (requireAuth && !currentUser) {
    return null;
  }

  // Si tout est bon, afficher les enfants
  return <>{children}</>;
};
