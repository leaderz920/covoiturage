// Service Worker Registration
export function registerServiceWorker() {
  if ('serviceWorker' in navigator && typeof window !== 'undefined') {
    const register = () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker enregistré avec succès:', registration.scope);
        })
        .catch(error => {
          console.error("Erreur lors de l'enregistrement du Service Worker:", error);
        });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
    }
  }
}

// Vérifier l'état de la connexion réseau
export function setupNetworkStatusMonitor(onOnline: () => void, onOffline: () => void) {
  if (typeof window !== 'undefined') {
    // État initial
    if (navigator.onLine) {
      onOnline();
    } else {
      onOffline();
    }

    // Ajouter des écouteurs d'événements pour les changements d'état
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Fonction de nettoyage
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }
  return () => {};
}

// Vérifier si l'application est installée (PWA)
export function isPWAInstalled(): boolean {
  if (typeof window !== 'undefined') {
    // L'application est considérée comme installée si elle est lancée depuis l'écran d'accueil
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true;
  }
  return false;
}

// Fonction pour demander l'installation de la PWA
export function showInstallPrompt() {
  if (typeof window !== 'undefined') {
    // Stocker l'événement d'installation 
    let deferredPrompt: any;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      // Empêcher Chrome de montrer automatiquement la boîte de dialogue d'installation
      e.preventDefault();
      // Stocker l'événement pour le déclencher plus tard
      deferredPrompt = e;
      
      // Afficher notre propre UI d'installation
      const installButton = document.getElementById('install-button');
      if (installButton) {
        installButton.style.display = 'block';
        
        installButton.addEventListener('click', () => {
          // Afficher la boîte de dialogue d'installation
          deferredPrompt.prompt();
          
          // Attendre que l'utilisateur réponde à la boîte de dialogue
          deferredPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('Utilisateur a accepté l\'installation de la PWA');
            } else {
              console.log('Utilisateur a refusé l\'installation de la PWA');
            }
            // On ne peut utiliser l'invite qu'une seule fois
            deferredPrompt = null;
            
            // Cacher le bouton d'installation
            if (installButton) {
              installButton.style.display = 'none';
            }
          });
        });
      }
    });
  }
}
