# Configuration des Notifications Firebase pour EcoTrajet

## Variables d'environnement requises

Créez un fichier `.env.local` avec les variables suivantes :

### Firebase Configuration (Client)
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Firebase Admin (Server)
```
FIREBASE_SERVICE_ACCOUNT_BASE64=your_base64_encoded_service_account_json
```

### VAPID Keys pour Push Notifications
```
NEXT_PUBLIC_VAPID_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_CONTACT_EMAIL=your_contact_email
```

### API Interne
```
INTERNAL_API_KEY=your_internal_api_key_for_triggering_notifications
```

## Configuration Firebase Console

### 1. Activer Firebase Cloud Messaging (FCM)
1. Allez dans la Firebase Console
2. Sélectionnez votre projet
3. Allez dans "Project settings" > "Cloud Messaging"
4. Générez une paire de clés VAPID
5. Copiez la clé publique dans `NEXT_PUBLIC_VAPID_KEY`
6. Copiez la clé privée dans `VAPID_PRIVATE_KEY`

### 2. Configuration du Service Account
1. Allez dans "Project settings" > "Service accounts"
2. Cliquez sur "Generate new private key"
3. Téléchargez le fichier JSON
4. Convertissez le contenu en Base64 : `base64 -i serviceAccountKey.json`
5. Copiez le résultat dans `FIREBASE_SERVICE_ACCOUNT_BASE64`

### 3. Configuration Firestore
Assurez-vous que ces collections existent dans Firestore :
- `announcements` : Annonces de trajets
- `users` : Données utilisateurs
- `fcm_tokens` : Tokens FCM des utilisateurs
- `subscriptions` : Abonnements push (legacy)
- `notification_logs` : Logs des notifications envoyées

### 4. Règles Firestore à ajouter
```javascript
// Ajoutez ces règles à firestore.rules
match /fcm_tokens/{tokenId} {
  allow read, write: if request.auth != null;
}

match /notification_logs/{logId} {
  allow read: if isAdmin();
  allow write: if request.auth != null;
}
```

## Structure des données

### Collection `fcm_tokens`
```javascript
{
  userId: string,
  token: string,
  active: boolean,
  createdAt: Date,
  lastUsed: Date,
  deviceInfo: object,
  platform: "web"
}
```

### Collection `notification_logs`
```javascript
{
  type: string,
  announcementId: string,
  targetUsers: string[],
  success: boolean,
  timestamp: Date,
  metadata: object
}
```

## Fonctionnalités implémentées

### ✅ Notifications automatiques
- ✅ Nouvelle annonce publiée → Notification à tous les utilisateurs
- ✅ Trajet correspondant trouvé → Notification ciblée
- ✅ Demande de contact → Notification au propriétaire de l'annonce
- ✅ Mise à jour d'annonce → Notification aux intéressés

### ✅ Gestion des abonnements
- ✅ Inscription automatique aux notifications lors de la connexion
- ✅ Interface de contrôle dans le profil utilisateur
- ✅ Désabonnement et nettoyage des tokens invalides

### ✅ Service Worker avancé
- ✅ Gestion des notifications avec actions personnalisées
- ✅ Différents types de notifications avec comportements spécifiques
- ✅ Gestion des clics et redirections intelligentes

### ✅ API REST complète
- ✅ `/api/push/subscribe` : Abonnement aux notifications
- ✅ `/api/notifications/send` : Envoi de notifications
- ✅ Authentification et validation des données
- ✅ Logs et monitoring des notifications

## Test des notifications

### 1. Test manuel
1. Connectez-vous à l'application
2. Allez dans le profil utilisateur
3. Activez les notifications
4. Cliquez sur "Tester" pour envoyer une notification de test

### 2. Test automatique
1. Publiez une nouvelle annonce
2. Vérifiez que tous les utilisateurs reçoivent une notification
3. Recherchez des trajets correspondants
4. Vérifiez les notifications ciblées

### 3. Test via API
```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_internal_api_key" \
  -d '{
    "type": "new_announcement",
    "announcementId": "your_announcement_id"
  }'
```

## Déploiement

### Vercel
1. Ajoutez toutes les variables d'environnement dans Vercel Dashboard
2. Déployez normalement
3. Les notifications fonctionneront automatiquement

### Firebase Hosting
1. Configurez les variables d'environnement
2. `npm run build`
3. `firebase deploy`

## Dépannage

### Notifications ne s'affichent pas
1. Vérifiez que les permissions sont accordées
2. Vérifiez la console pour les erreurs
3. Testez avec `sendTestNotification()`

### Service Worker ne s'enregistre pas
1. Vérifiez que le fichier `public/service-worker.js` existe
2. Testez en navigation privée
3. Videz le cache et rechargez

### Erreurs Firebase
1. Vérifiez les clés VAPID
2. Vérifiez le Service Account
3. Vérifiez les règles Firestore

## Monitoring

### Logs disponibles
- Console navigateur : `[PUSH]`, `[FCM]`, `[NOTIFICATION]`
- Server logs : Vercel Functions ou Firebase Functions
- Firestore : Collection `notification_logs`

### Métriques importantes
- Taux de succès des notifications
- Nombre de tokens actifs
- Fréquence des notifications par type

## Améliorations futures

### 🚧 Fonctionnalités à ajouter
- [ ] Préférences de notifications par utilisateur
- [ ] Notifications programmées
- [ ] Notifications push riches avec images
- [ ] Intégration avec calendrier
- [ ] Notifications SMS en fallback
- [ ] Analytics détaillées des notifications

### 🔧 Optimisations techniques
- [ ] Mise en cache des tokens FCM
- [ ] Batch processing pour gros volumes
- [ ] Retry automatique pour échecs
- [ ] Compression des payloads
- [ ] Support offline-first
