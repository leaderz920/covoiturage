import { auth, googleProvider, signInWithPopup } from '@/lib/firebase';
import { UserCredential } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Liste des emails d'administrateurs autorisés
const ADMIN_EMAILS = [
  'ibrahimzalla@gmail.com', // Administrateur principal
  'admin@ecotrajet.com' // Email admin générique (optionnel)
];

export const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    if (!user.email) {
      throw new Error('Email non fourni par le fournisseur d\'authentification');
    }
    
    // Vérifier si l'utilisateur existe déjà dans Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const isAdmin = ADMIN_EMAILS.includes(user.email);
    
    if (!userDoc.exists()) {
      // Créer un nouveau document utilisateur s'il n'existe pas
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0] || 'Utilisateur',
        photoURL: user.photoURL || null,
        provider: 'google.com',
        isAdmin: isAdmin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        tokens: isAdmin ? 1000 : 10, // Plus de jetons pour les admins
        role: isAdmin ? 'admin' : 'user'
      });
    } else {
      // Mettre à jour les informations de l'utilisateur existant
      const userData = userDoc.data();
      const wasAdmin = userData?.isAdmin === true;
      
      // Si l'utilisateur est dans la liste des admins mais n'a pas le flag, le mettre à jour
      const shouldBeAdmin = isAdmin || wasAdmin;
      
      await setDoc(
        doc(db, 'users', user.uid),
        {
          lastLogin: serverTimestamp(),
          photoURL: user.photoURL || userData?.photoURL || null,
          isAdmin: shouldBeAdmin,
          role: shouldBeAdmin ? 'admin' : 'user',
          displayName: user.displayName || userData?.displayName || user.email?.split('@')[0] || 'Utilisateur',
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }
    
    return result;
  } catch (error) {
    console.error('Erreur lors de la connexion avec Google:', error);
    throw error;
  }
};
