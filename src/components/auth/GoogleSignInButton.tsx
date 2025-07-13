'use client';

import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';
import { signInWithGoogle } from '@/services/authService';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function GoogleSignInButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      router.push('/');
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border-gray-200 text-gray-800 hover:text-gray-900 transition-colors"
    >
      {isLoading ? (
        <>
          <div className="h-5 w-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span>Connexion en cours...</span>
        </>
      ) : (
        <>
          <FcGoogle className="w-5 h-5" />
          <span>Continuer avec Google</span>
        </>
      )}
    </Button>
  );
}
