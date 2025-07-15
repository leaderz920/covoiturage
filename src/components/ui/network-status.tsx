'use client';

import { useState, useEffect } from 'react';
import { useNetworkStatus } from '@/contexts/NetworkStatusContext';
import { isPWAInstalled } from '@/lib/serviceWorkerRegistration';
import { Button } from './button';

export function NetworkStatusIndicator() {
  const { isOnline } = useNetworkStatus();
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Vérifier si l'application est déjà installée
    setIsInstalled(isPWAInstalled());

    // Gérer l'événement d'installation
    const handleBeforeInstallPrompt = (e: any) => {
      // Empêcher Chrome d'afficher automatiquement la boîte de dialogue
      e.preventDefault();
      // Stocker l'événement pour une utilisation ultérieure
      setDeferredPrompt(e);
      // Afficher le bouton d'installation
      setShowInstallButton(true);
    };

    // Gérer l'événement d'installation terminée
    const handleAppInstalled = () => {
      // Cacher le bouton d'installation
      setShowInstallButton(false);
      setIsInstalled(true);
      console.log('Application installée avec succès');
    };

    // Ajouter les écouteurs d'événements
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Nettoyer les écouteurs d'événements
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Fonction pour installer l'application
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Afficher la boîte de dialogue d'installation
    deferredPrompt.prompt();

    // Attendre que l'utilisateur réponde à la boîte de dialogue
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // Nous ne pouvons utiliser l'invite qu'une seule fois.
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  return (
    <div className="fixed top-0 right-0 z-50 m-4 flex flex-col items-end gap-2">
      {/* Indicateur de statut réseau */}
      <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
        isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
        {isOnline ? 'En ligne' : 'Hors ligne'}
      </div>

      {/* Bouton d'installation de la PWA */}
      {showInstallButton && !isInstalled && (
        <Button 
          id="install-button"
          size="sm" 
          className="flex items-center gap-1 rounded-full text-xs"
          onClick={handleInstallClick}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12"></path>
            <path d="M17 8l-5 5-5-5"></path>
            <path d="M19 21H5a2 2 0 01-2-2V5"></path>
          </svg>
          Installer l'app
        </Button>
      )}
    </div>
  );
}
