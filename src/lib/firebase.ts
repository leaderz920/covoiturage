import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  getIdTokenResult,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  UserCredential,
} from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Configuration Firebase avec valeurs par défaut pour éviter les erreurs de build
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummy-api-key-for-build",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dummy-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dummy-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:dummy",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-DUMMY",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
let analytics: any;

// Configuration de la persistance de l'authentification
// Désactivé la déconnexion automatique suite à inactivité

const resetInactivityTimer = () => {
  // Ne rien faire - désactive la déconnexion automatique
  console.log("Déconnexion automatique désactivée");
};

const setupInactivityDetection = () => {
  // Ne rien configurer - désactive la détection d'inactivité
  console.log("Détection d'inactivité désactivée");
};

if (typeof window !== "undefined") {
  analytics = getAnalytics(app);

  (async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      console.log("Persistance activée");

      const user = auth.currentUser;
      if (user) {
        const tokenResult = await getIdTokenResult(user);
        const exp = new Date(tokenResult.expirationTime).getTime();
        const now = Date.now();
        if (exp - now < 5 * 60 * 1000) {
          await user.getIdToken(true);
        }
      }
    } catch (e) {
      console.error("Erreur persistance:", e);
    }
  })();

  setupInactivityDetection();

  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("Utilisateur connecté :", user.email);
    } else {
      console.log("Utilisateur déconnecté");
    }
  });
}

export {
  db,
  auth,
  storage,
  analytics,
  app,
  googleProvider,
  signInWithPopup,
  GoogleAuthProvider,
};

export type { UserCredential };
