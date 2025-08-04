'use client';

import { AuthInitializer } from './AuthInitializer';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  loadingMessage?: string;
}

/**
 * Composant pour protéger les routes nécessitant une authentification
 * Redirige vers la page de connexion si l'utilisateur n'est pas connecté
 */
export const ProtectedRoute = ({
  children,
  redirectTo = '/auth',
  loadingMessage = "Chargement..."
}: ProtectedRouteProps) => {
  return (
    <AuthInitializer 
      requireAuth={true} 
      redirectTo={redirectTo}
      loadingMessage={loadingMessage}
      showLoadingScreen={true}
    >
      {children}
    </AuthInitializer>
  );
};

export default ProtectedRoute;
