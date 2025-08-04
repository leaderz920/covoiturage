// Déclaration des types globaux pour l'application
interface Window {
  Android?: {
    showToast?: (message: string) => void;
  };
  webkit?: {
    messageHandlers?: {
      showToast?: {
        postMessage?: (message: string) => void;
      };
    };
  };
}
