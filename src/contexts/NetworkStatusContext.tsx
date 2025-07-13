'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { setupNetworkStatusMonitor } from '@/lib/serviceWorkerRegistration';
import { goOffline, goOnline } from '@/services/announcements';

// Types pour le contexte
interface NetworkStatusContextType {
  isOnline: boolean;
  showOfflineMessage: boolean;
  setShowOfflineMessage: (show: boolean) => void;
}

// Création du contexte
const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined);

// Props pour le provider
interface NetworkStatusProviderProps {
  children: ReactNode;
}

// Provider du contexte
export function NetworkStatusProvider({ children }: NetworkStatusProviderProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showOfflineMessage, setShowOfflineMessage] = useState<boolean>(false);

  // Gestion du statut en ligne/hors ligne
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      toast.success('Connexion internet rétablie', {
        id: 'network-status',
        duration: 2000,
        style: { animation: 'none' }
      });
      await goOnline();
    };

    const handleOffline = async () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
      await goOffline();
    };

    // Configurer la surveillance du statut réseau
    const cleanup = setupNetworkStatusMonitor(handleOnline, handleOffline);

    return cleanup;
  }, []);

  // Enregistrement du Service Worker uniquement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/lib/serviceWorkerRegistration').then(async ({ registerServiceWorker }) => {
        registerServiceWorker();
      });
    }
  }, []);

  // Valeur du contexte
  const value = {
    isOnline,
    showOfflineMessage,
    setShowOfflineMessage
  };

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
      {/* Indicateur de statut hors ligne */}
      {showOfflineMessage && !isOnline && (
        <div className="fixed bottom-20 left-0 right-0 z-50 mx-auto w-11/12 max-w-md rounded-lg bg-red-50 p-3 shadow-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-2 h-3 w-3 rounded-full bg-red-500"></div>
              <p className="text-sm font-medium text-red-800">
                Mode hors ligne - données limitées disponibles
              </p>
            </div>
            <button
              onClick={() => setShowOfflineMessage(false)}
              className="rounded-full p-1 text-red-600 hover:bg-red-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </NetworkStatusContext.Provider>
  );
}

// Hook pour utiliser le contexte
export function useNetworkStatus() {
  const context = useContext(NetworkStatusContext);
  if (context === undefined) {
    throw new Error('useNetworkStatus must be used within a NetworkStatusProvider');
  }
  return context;
}
