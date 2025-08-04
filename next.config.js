/** @type {import('next').NextConfig} */
const isVercel = process.env.VERCEL === '1';
const nextConfig = {
  reactStrictMode: false, // Désactivé pour éviter les doubles rendus et vérifications
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configuration pour Vercel avec API Routes (notifications)
  // Commenté pour permettre les API Routes : ...(isVercel ? {} : { output: 'export', distDir: 'out' }),
  
  // Optimisation des images pour Vercel
  images: {
    domains: ['readdy.ai', 'trae-33588.firebasestorage.app'],
    // unoptimized: true, // Commenté car plus nécessaire pour Vercel
  },
  
  // Désactivation des règles d'accessibilité pour améliorer les performances
  experimental: {
    disablePostcssPresetEnv: true,
  },
  
  webpack: (config) => {
    // Neutralisation des avertissements et erreurs d'accessibilité
    config.ignoreWarnings = [/a11y/];
    return config;
  },
};

module.exports = nextConfig;
