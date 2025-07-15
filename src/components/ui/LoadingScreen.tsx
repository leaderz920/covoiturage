'use client';

import Image from 'next/image';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({ 
  message = "Chargement...",
  fullScreen = true 
}: LoadingScreenProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-screen ${fullScreen ? 'fixed inset-0 z-50' : 'py-12'}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-cyan-50 opacity-90"></div>
      <div className="relative z-10 text-center space-y-8 max-w-md mx-auto p-8 rounded-2xl bg-white/80 backdrop-blur-sm shadow-xl border border-emerald-100">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-400 rounded-full opacity-20 blur-xl"></div>
            <div className="relative">
              <Image 
                src="/EcoTrajet_Icon_500x500.png" 
                alt="EcoTrajet" 
                width={140} 
                height={140}
                className="object-contain drop-shadow-lg hover:scale-105 transition-transform duration-300"
                priority
              />
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
              Bienvenue sur EcoTrajet
            </h2>
            <p className="text-emerald-700/90 font-medium">
              Covoiturage écologique et intelligent
            </p>
          </div>
        </div>
        
        <div className="pt-4 space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-emerald-100 border-t-emerald-400 animate-spin"></div>
              <Loader2 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-emerald-500" />
            </div>
          </div>
          <p className="text-emerald-800/80 text-sm font-medium">
            {message}
          </p>
        </div>
        
        <div className="pt-4">
          <div className="h-1.5 w-32 mx-auto bg-emerald-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

    </div>
  );
}
