import React, { ReactNode } from 'react';
import { Navigation } from './Navigation';
import { Toaster } from 'sonner';
import { NetworkStatusIndicator } from '@/components/ui/network-status';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen relative pb-16" 
      style={{
        backgroundImage: `url('/images/background.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Background floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-white to-blue-200"
            style={{
              width: `${Math.random() * 120 + 60}px`,
              height: `${Math.random() * 120 + 60}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: '0.25',
              backdropFilter: 'blur(8px)',
              animation: `float${i} ${Math.random() * 20 + 15}s infinite ease-in-out, fade${i} ${Math.random() * 10 + 8}s infinite ease-in-out`
            }}
          />
        ))}
      </div>
      
      {/* Animation keyframes */}
      <style jsx>{`
        ${[...Array(20)].map((_, i) => `
          @keyframes float${i} {
            0% { transform: translate(0, 0) rotate(0deg) scale(1); }
            33% { transform: translate(${Math.random() * 150}px, ${Math.random() * -100}px) rotate(120deg) scale(1.1); }
            66% { transform: translate(${Math.random() * -150}px, ${Math.random() * 100}px) rotate(240deg) scale(0.9); }
            100% { transform: translate(0, 0) rotate(360deg) scale(1); }
          }
          @keyframes fade${i} {
            0%, 100% { opacity: 0.15; }
            50% { opacity: 0.35; }
          }
        `).join('')}
      `}</style>
      
      {/* Top Navigation Bar */}
      <div className="fixed top-0 w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <img src="/images/logo.png" alt="EcoTrajet" className="h-8 mr-2" />
              <h1 className="text-xl font-semibold">EcoTrajet</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-blue-700 px-3 py-1 rounded-full">
                <i className="fas fa-coins text-yellow-400 mr-2"></i>
                <span className="text-white font-medium">10</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="pt-16 px-4 pb-20">
        {children}
      </div>
      
      {/* Bottom Navigation */}
      <Navigation />
      
      {/* Toast notifications - Géré par le layout principal */}
      
      {/* Indicateur de statut réseau et bouton d'installation PWA */}
      <NetworkStatusIndicator />
    </div>
  );
}
