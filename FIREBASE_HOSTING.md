# Guide de Déploiement EcoTrajet sur Firebase Hosting

Ce document contient toutes les informations nécessaires pour déployer l'application EcoTrajet sur Firebase Hosting.

## Informations du Projet

- **Nom du projet Firebase** : trae-33588
- **URL principale** : https://trae-33588.web.app
- **URL alternative** : https://trae-33588.firebaseapp.com

## Configuration actuelle

L'application est actuellement configurée pour utiliser Firebase avec :
- **Firebase Auth** : Pour l'authentification des utilisateurs
- **Firestore** : Pour le stockage de données (annonces, profils utilisateurs)
- **Storage** : Pour le stockage de fichiers (photos de véhicules)
- **Hosting** : Pour l'hébergement de l'application

## Fichiers de Configuration

- `.firebaserc` : Spécifie l'ID du projet Firebase
- `firebase.json` : Configure les services Firebase (hosting, emulators, rules)
- `firestore.rules` : Règles de sécurité pour Firestore
- `storage.rules` : Règles de sécurité pour Storage
- `next.config.js` : Configuré pour l'exportation statique compatible avec Firebase Hosting

## Processus de Déploiement

### 1. Connexion à Firebase

```bash
firebase login
```

### 2. Construction de l'application

```bash
npm run firebase-export
```
Cette commande crée une version de production statique dans le dossier `out`.

### 3. Déploiement sur Firebase Hosting

```bash
firebase deploy --only hosting
```

### 4. Déploiement des règles Firestore et Storage (si modifiées)

```bash
firebase deploy --only firestore:rules,storage:rules
```

## Script Automatisé

Vous pouvez utiliser le script `deploy-firebase.bat` pour automatiser le processus de déploiement :

```bash
./deploy-firebase.bat
```

## Vérification du Déploiement

Après le déploiement, votre application est accessible à :
- https://trae-33588.web.app
- https://trae-33588.firebaseapp.com

## Changement de Projet Firebase

Si vous souhaitez utiliser un autre projet Firebase (par exemple "ecotrajett") :

1. Mettre à jour le fichier `.firebaserc` :
```json
{
  "projects": {
    "default": "ecotrajett"
  }
}
```

2. Utilisez la commande Firebase pour changer de projet :
```bash
firebase use ecotrajett
```

3. Redéployez l'application :
```bash
firebase deploy --only hosting
```

## Dépannage

### Si vous rencontrez une erreur d'authentification

```bash
firebase logout
firebase login
```

### Si vous rencontrez une erreur lors du déploiement

```bash
firebase use --clear
firebase use trae-33588
firebase deploy --only hosting
```

## Console Firebase

Pour gérer votre application dans la console Firebase :
- https://console.firebase.google.com/project/trae-33588/overview

---

N'hésitez pas à ajuster ce guide en fonction de vos besoins spécifiques.
