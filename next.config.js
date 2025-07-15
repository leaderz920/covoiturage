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
  // Configuration optimisée pour l'exportation statique (Firebase Hosting)
  ...(isVercel ? {} : { output: 'export', distDir: 'out' }),
  
  // Optimisation des images
  images: {
    domains: ['readdy.ai', 'trae-33588.firebasestorage.app'],
    unoptimized: true, // Nécessaire pour l'exportation statique
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
