## EcoTrajet - Application de Covoiturage

EcoTrajet est une application de covoiturage moderne pour la Côte d'Ivoire, permettant aux conducteurs et passagers de publier, rechercher et gérer des trajets entre différentes villes. L'application est construite avec Next.js, React, TypeScript et Firebase, et propose une expérience utilisateur fluide, responsive et sécurisée.

---

### � Fonctionnalités principales
- Authentification sécurisée (Firebase Auth)
- Publication et recherche d'annonces (conducteur/passager)
- Notifications push web (Web Push + VAPID)
- Gestion de profil utilisateur
- Interface responsive et accessible (Radix UI, TailwindCSS)
- Optimisation des performances (React Query, hooks personnalisés)
- Notifications toast (Sonner)

### 🛠️ Stack technique
- Next.js 15, React 19, TypeScript 5
- Firebase (Auth, Firestore, Storage)
- TailwindCSS 4, Radix UI
- React Query, React Hook Form, Zod
- Sonner (toast), ESLint, Jest

### � Structure des collections Firestore
- `users` : profils utilisateurs (id, email, displayName, photoURL, tokens, etc.)
- `announcements` : annonces de trajets (type, from, to, date, userId, etc.)
- `subscriptions` : abonnements aux notifications push

### 🚀 Démarrage rapide
1. Clonez le dépôt et installez les dépendances :
   ```bash
   git clone https://github.com/leaderz920/covoiturage.git
   cd covoiturage
   npm install
   ```
2. Copiez `.env.example` en `.env.local` et renseignez vos variables Firebase et VAPID.
3. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```
4. Accédez à [http://localhost:3000](http://localhost:3000)

### 🔒 Sécurité & bonnes pratiques
- Les fichiers `.env*` et secrets sont exclus du dépôt (`.gitignore`).
- Les règles Firestore sont à adapter selon vos besoins de sécurité.
- Les variables d'environnement doivent être configurées sur Vercel pour le déploiement.

### 📝 Déploiement
- **Vercel** : push sur GitHub, connectez le repo à Vercel, configurez les variables d'environnement, déployez.
- **Firebase Hosting** : suivez le guide dans `FIREBASE_HOSTING.md`.

### � Captures d'écran
_Ajoutez ici vos captures d'écran de l'application pour illustrer l'interface._

### � Licence
MIT

---

Développé par l'équipe EcoTrajet.
