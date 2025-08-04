import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "EcoTrajet - Application de Covoiturage",
  description: "EcoTrajet est une application de covoiturage qui permet aux utilisateurs de publier et rechercher des trajets",
  applicationName: "EcoTrajet",
  themeColor: "#3b82f6",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EcoTrajet",
  },
  icons: {
    icon: [
      { url: "/EcoTrajet_Icon_500x500.png", sizes: "500x500", type: "image/png" },
    ],
    apple: [
      { url: "/EcoTrajet_Icon_500x500.png", sizes: "500x500", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-navbutton-color": "#3b82f6",
    "msapplication-starturl": "/",
    "format-detection": "telephone=no",
  },
};
