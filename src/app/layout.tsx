// We avoid dynamic font downloads in CI/CD environments
// by not using `next/font/google`.
import { Toaster } from "sonner";
import { AuthProvider } from '@/contexts/AuthContext';
import { UserDataProvider } from '@/contexts/UserDataContext';
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Suspense } from 'react';
import "./globals.css";

const inter = { className: '' };

// Composant pour afficher un message de chargement par défaut
function LoadingFallback() {
  return <LoadingScreen message="Chargement..." />;
}

// Composant pour les balises head qui nécessitent 'use client'
function HeadContent() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        integrity="sha512-9usAa10IRO0HhonpyAIVpjrylPvoDwiPUiKdWk5t3PyolY1cOd4DSE0Ga+ri4AuTroPR5aQvXU9xC6qOPnzFeg=="
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body className={inter.className}>
        <Suspense fallback={<LoadingFallback />}>
          <NetworkStatusProvider>
            <ReactQueryProvider>
              <AuthProvider>
                <UserDataProvider>
                  <Toaster
                    position="top-center"
                    duration={2000}
                    closeButton={true}
                    visibleToasts={1}
                    theme="light"
                    richColors
                    toastOptions={{
                      style: {
                        animation: 'none',
                        padding: '10px 15px',
                        borderRadius: '8px',
                        width: '90%',
                        maxWidth: '400px',
                        textAlign: 'center'
                      }
                    }}
                  />
                  {children}
                </UserDataProvider>
              </AuthProvider>
            </ReactQueryProvider>
          </NetworkStatusProvider>
        </Suspense>
      </body>
    </html>
  );
}
