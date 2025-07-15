import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
  DialogTitle,
  DialogHeader
} from "@/components/ui/dialog";
import { ContactModal } from "./ContactModal";
// Import VisuallyHidden supprimé
import { Button } from "@/components/ui/button";
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useUserData } from '@/contexts/UserDataContext';
import { Progress } from "@/components/ui/progress";
import { toast } from 'sonner';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { userData } = useUserData();
  // Créer un objet utilisateur par défaut pour éviter les erreurs null
  const user = userData || { displayName: 'Utilisateur', email: '', tokens: 0, createdAt: new Date() };
  
  // État pour contrôler l'ouverture de la modale de contact pour les jetons
  const [tokensContactModalOpen, setTokensContactModalOpen] = useState(false);

  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  };

  const formatDate = (date: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Déconnexion réussie');
    } catch (error) {
      console.error('Erreur lors de la déconnexion', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  // Générer un ID unique pour l'accessibilité
  const titleId = React.useId();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[90vw] max-w-[90vw] sm:max-w-md p-0 border-0 shadow-xl rounded-xl overflow-hidden max-h-[90vh] flex flex-col modal-content"
        aria-labelledby={titleId}
      >
        {/* En-tête réduit avec dégradé */}
        <div className="relative h-16 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)' }}>
          <DialogClose className="absolute right-3 top-2 bg-white/20 text-white hover:bg-white/30 rounded-full p-1" />
          <div className="flex items-center h-full pl-2">
            <DialogClose className="text-white hover:bg-white/20 rounded-full p-1 mr-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </DialogClose>
            <DialogTitle id={titleId} className="text-sm font-medium text-white">Profil</DialogTitle>
          </div>
          
          {/* Avatar utilisateur plus petit */}
          <div className="absolute -bottom-6 left-4 w-12 h-12 rounded-full border-2 border-white bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-base font-bold text-white shadow-md">
            {getInitials(user?.displayName || '')}
          </div>
        </div>
        
        {/* Contenu défilant */}
        <div className="flex-grow overflow-y-auto">
        <div className="pt-6 pb-4 px-6">
          <div className="ml-14 mb-4">
            <DialogTitle id={titleId} className="text-base font-semibold text-gray-800">{user?.displayName || "Utilisateur"}</DialogTitle>
            {user?.email && (
              <p className="text-xs text-gray-500">
                {user.email.split('@')[0]}
              </p>
            )}
          </div>
          
          <div className="bg-gray-50 rounded-xl p-5 mb-6">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm sm:text-base font-medium text-gray-700">Jetons disponibles</span>
              <div className="flex items-center gap-1">
                <span className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-700">
                  {user.tokens}
                </span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            {/* Barre de progression stylisée */}
            <div className="mb-3">
              <Progress value={(user?.tokens || 0) * 10} className="h-2 bg-gray-200" indicatorClassName="bg-gradient-to-r from-green-400 to-emerald-600" />
            </div>
            
            <p className="text-xs sm:text-sm text-gray-500 mb-4">
              Les jetons sont nécessaires pour publier des annonces. Chaque publication coûte 1 jeton.
            </p>
            
            <Button 
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white border-0 shadow-md"
              onClick={() => setTokensContactModalOpen(true)}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Obtenir plus de jetons
            </Button>
          </div>
          
          <div className="flex justify-center">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full px-4 py-1 text-sm flex items-center transition-all duration-200"
              onClick={handleSignOut}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Se déconnecter
            </Button>
          </div>
          
          {/* Informations du développeur */}
          <div className="mt-8 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">Développé par</p>
            <p className="text-sm font-medium text-gray-600">Ezaf Technologie Burkina Faso</p>
            <a 
              href="tel:+22674250763" 
              className="text-xs text-blue-500 hover:text-blue-700 inline-flex items-center mt-1"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              +226 74250763
            </a>
          </div>
        </div>
        </div>

        {/* Modale de contact pour obtenir des jetons */}
        <ContactModal 
          open={tokensContactModalOpen}
          onOpenChange={setTokensContactModalOpen}
          phoneNumber="+22674250763"
        />
      </DialogContent>
    </Dialog>
  );
}
