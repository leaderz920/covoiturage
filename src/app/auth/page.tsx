'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

// Schéma de validation pour le formulaire de connexion
const loginSchema = z.object({
  login: z.string().min(1, { message: "Le nom d'utilisateur ou le numéro de téléphone est requis" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Schéma de validation pour le formulaire d'inscription
const registerSchema = z.object({
  username: z.string().min(3, { message: "Le nom d'utilisateur doit contenir au moins 3 caractères" })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscore" }),
  phoneNumber: z.string()
    .min(10, { message: "Le numéro de téléphone doit contenir au moins 10 chiffres" })
    .regex(/^\+?[0-9\s-]+$/, { message: "Numéro de téléphone invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
  confirmPassword: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  // État pour gérer l'affichage des formulaires
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  // Initialisation des hooks
  const router = useRouter();
  
  // États pour la gestion de l'interface utilisateur
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'username' | 'phone'>('username');
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Vérifier si le composant est monté
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    if (!mounted) return;
    
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Vérifier si l'utilisateur est un administrateur
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData?.isAdmin === true) {
              router.replace('/admin/dashboard');
            } else {
              router.replace('/');
            }
          }
        } catch (error) {
          console.error('Erreur lors de la vérification des droits administrateur:', error);
        }
      }
    });

    return () => unsubscribe();
  }, [router, mounted]);

  const toggleLoginMethod = () => {
    const newMethod = loginMethod === 'username' ? 'phone' : 'username';
    loginForm.setValue('login', '');
    setLoginMethod(newMethod);
  };

  // Formulaire de connexion
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: "",
      password: "",
    },
  });

  // Fonction pour gérer le changement de numéro de téléphone
  const handlePhoneChange = (value: string | undefined, field: 'login' | 'phoneNumber') => {
    if (field === 'login') {
      loginForm.setValue('login', value || '');
    } else {
      registerForm.setValue('phoneNumber', value || '');
    }
  };

  // Formulaire d'inscription
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Fonction pour transformer le nom d'utilisateur en email
  const usernameToEmail = (username: string) => {
    return `${username.toLowerCase()}@ecotrajet.com`;
  };

  // Fonction de connexion
  // Fonction pour trouver l'email par nom d'utilisateur ou numéro de téléphone
  const findUserEmail = async (login: string): Promise<string | null> => {
    console.log('Tentative de connexion avec:', login);
    
    // Vérifier si c'est un numéro de téléphone (commence par + et contient des chiffres)
    if (/^\+[0-9\s-]+$/.test(login)) {
      console.log('Détection d\'un numéro de téléphone');
      
      // Nettoyer le numéro pour la recherche (supprimer les espaces)
      const cleanedNumber = login.replace(/\s+/g, '');
      console.log('Numéro nettoyé pour la recherche:', cleanedNumber);
      
      const usersRef = collection(db, 'users');
      // Créer une requête insensible à la casse et aux espaces
      const q = query(usersRef, where('phoneNumber', '>=', cleanedNumber), where('phoneNumber', '<=', cleanedNumber + '\uf8ff'));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        console.log('Utilisateur trouvé avec ce numéro');
        const userData = querySnapshot.docs[0].data();
        console.log('Données utilisateur:', userData);
        return userData.email;
      } else {
        console.log('Aucun utilisateur trouvé avec ce numéro');
      }
    } 
    // Sinon, traiter comme un nom d'utilisateur
    console.log('Traitement comme nom d\'utilisateur');
    return usernameToEmail(login);
  };

  const onLogin = async (data: LoginFormValues) => {
    // Vérifier d'abord si le formulaire est valide
    const isValid = await loginForm.trigger();
    if (!isValid) {
      return; // Ne pas continuer si le formulaire n'est pas valide
    }
    
    setIsLoading(true);
    try {
      // Trouver l'email correspondant au login (nom d'utilisateur ou numéro de téléphone)
      const email = await findUserEmail(data.login);
      
      if (!email) {
        throw new Error('auth/user-not-found');
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, data.password);
      
      // Vérifier si l'utilisateur est un administrateur
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists() && userDoc.data()?.isAdmin === true) {
        // Rediriger vers le tableau de bord admin si c'est un administrateur (sans ajouter à l'historique)
        toast.success('Connexion administrateur réussie');
        router.replace('/admin/dashboard');
      } else {
        // Rediriger vers la page d'accueil pour les utilisateurs normaux (sans ajouter à l'historique)
        router.replace('/');
      }
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        // Définir l'erreur sur le champ de connexion sans afficher de toast
        loginForm.setError('login', { 
          type: 'manual', 
          message: 'Identifiants incorrects. Vérifiez votre saisie et réessayez.' 
        });
      } else if (error.message !== 'Validation failed') {
        // Ne pas afficher de toast pour les erreurs de validation
        toast.error('Une erreur est survenue lors de la connexion');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour vérifier si un numéro de téléphone existe déjà
  const checkIfPhoneNumberExists = async (phoneNumber: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, 'users');
      // Nettoyer le numéro pour la recherche (supprimer les espaces et caractères spéciaux)
      const cleanedNumber = phoneNumber.replace(/[^0-9+]/g, '');
      const q = query(usersRef, where('phoneNumber', '==', cleanedNumber));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Erreur lors de la vérification du numéro de téléphone:', error);
      return false;
    }
  };

  // Fonction d'inscription
  const onRegister = async (data: RegisterFormValues) => {
    // Vérifier d'abord si le formulaire est valide
    const isValid = await registerForm.trigger();
    if (!isValid) {
      return; // Ne pas continuer si le formulaire n'est pas valide
    }
    
    setIsLoading(true);
    try {
      // Vérifier si le numéro de téléphone existe déjà
      const phoneNumberExists = await checkIfPhoneNumberExists(data.phoneNumber);
      if (phoneNumberExists) {
        registerForm.setError('phoneNumber', {
          type: 'manual',
          message: 'Ce numéro de téléphone est déjà utilisé',
        });
        return;
      }

      const email = usernameToEmail(data.username);
      
      // Créer l'utilisateur avec email et mot de passe
      const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
      
      // Mettre à jour le profil avec le nom d'utilisateur
      await updateProfile(userCredential.user, {
        displayName: data.username,
      });
      
      // Nettoyer le numéro de téléphone avant l'enregistrement
      const cleanedPhoneNumber = data.phoneNumber.replace(/[^0-9+]/g, '');
      
      // Créer le document utilisateur dans Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: email,
        displayName: data.username,
        phoneNumber: cleanedPhoneNumber,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        tokens: 10, // Attribution de 10 jetons aux nouveaux utilisateurs
      });
      
      toast.success('Inscription réussie !');
      router.replace('/');
    } catch (error: any) {
      console.error('Erreur d\'inscription:', error);
      if (error.code === 'auth/email-already-in-use') {
        registerForm.setError('username', {
          type: 'manual',
          message: 'Ce nom d\'utilisateur est déjà utilisé',
        });
      } else if (error.code === 'auth/weak-password') {
        registerForm.setError('password', {
          type: 'manual',
          message: 'Le mot de passe est trop faible',
        });
      } else {
        toast.error('Une erreur est survenue lors de l\'inscription: ' + (error.message || 'Erreur inconnue'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/images/Capture.JPG)'
      }}
    >
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 -z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 -z-10"></div>
        <CardHeader className="text-center relative pt-1">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"></div>
          <div className="mt-1">
            <img src="/EcoTrajet_Icon_500x500.png" alt="Logo EcoTrajet" className="w-48 h-48 mx-auto mb-4" />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            {/* Bouton Google en haut de la page */}
            <div className="mb-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-medium text-gray-800 mb-2">Connectez-vous en un clic</h3>
                <p className="text-sm text-blue-600 font-medium">Simple, rapide et sécurisé</p>
              </div>
              <GoogleSignInButton />
              <div className="my-6">
                <div className="w-full border-t border-gray-200"></div>
              </div>
            </div>

            <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-xl mb-6" style={{ display: 'none' }}>
              <TabsTrigger value="login" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-lg transition-all duration-300">
                Connexion
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm rounded-lg transition-all duration-300">
                Inscription
              </TabsTrigger>
            </TabsList>

            
            {/* Section de connexion */}
            <TabsContent value="login" className="space-y-4">
              {!showLoginForm ? (
                <div className="text-center py-4" style={{ display: 'none' }}>
                  <Button 
                    onClick={() => setShowLoginForm(true)}
                    className="w-full"
                    variant="outline"
                  >
                    Se connecter avec email/mot de passe
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Formulaire de connexion par email/mot de passe */}

                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login">
                      {loginMethod === 'username' ? 'Nom d\'utilisateur' : 'Numéro de téléphone'}
                    </Label>
                    <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-auto mt-2 text-xs px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-blue-600 border border-blue-100 hover:border-blue-200 transition-all duration-300 group flex items-center justify-center mx-auto"
                    onClick={toggleLoginMethod}
                  >
                    <span className="flex flex-col items-center justify-center leading-tight">
                      {loginMethod === 'username' 
                        ? (
                          <>
                            <span>🔢 Utiliser mon</span>
                            <span>numéro</span>
                          </>
                        ) : (
                          <>
                            <span>👤 Utiliser mon</span>
                            <span>identifiant</span>
                          </>
                        )}
                    </span>
                  </Button>
                  </div>
                  
                  {loginMethod === 'phone' ? (
                    <div className="w-full space-y-1">
                      {mounted && (
                        <PhoneInput
                          international
                          withCountryCallingCode
                          defaultCountry="BF"
                          value={loginForm.watch('login') as string}
                          onChange={(value) => handlePhoneChange(value, 'login')}
                          className={`flex h-10 w-full rounded-lg border ${loginForm.formState.errors.login ? 'border-red-500' : 'border-gray-200'} bg-gray-50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                        />
                      )}
                      {loginForm.formState.errors.login && (
                        <p className="text-sm text-red-500 pl-1">
                          {loginForm.formState.errors.login.message}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <Input 
                          type="text" 
                          className={`pl-10 bg-gray-50 ${loginForm.formState.errors.login ? 'border-red-500' : 'border-gray-200'} focus:border-blue-400 focus:ring-2 focus:ring-blue-100`}
                          placeholder="Votre nom d'utilisateur" 
                          {...loginForm.register('login')}
                          disabled={isLoading}
                        />
                      </div>
                      {loginForm.formState.errors.login && (
                        <p className="text-sm text-red-500 pl-1">
                          {loginForm.formState.errors.login.message}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <Input 
                        type={showLoginPassword ? "text" : "password"}
                        className={`pl-10 bg-gray-50 ${loginForm.formState.errors.password ? 'border-red-500' : 'border-gray-200'} focus:border-blue-400 focus:ring-2 focus:ring-blue-100`}
                        placeholder="Votre mot de passe" 
                        {...loginForm.register('password')}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-500 pl-1">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Connexion...
                    </span>
                  ) : 'Se connecter'}
                </Button>


                  </form>
                </div>
              )}
            </TabsContent>
            
            {/* Section d'inscription */}
            <TabsContent value="register">
              {!showRegisterForm ? (
                <div className="text-center py-4" style={{ display: 'none' }}>
                  <Button 
                    onClick={() => setShowRegisterForm(true)}
                    className="w-full"
                    variant="outline"
                  >
                    S'inscrire avec email/mot de passe
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">
                    <span className="bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                      Nom d'utilisateur
                    </span>
                  </Label>
                  <div className="space-y-1">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <Input 
                        type="text" 
                        className={`pl-10 bg-gray-50 ${registerForm.formState.errors.username ? 'border-red-500' : 'border-gray-200'} focus:border-blue-400 focus:ring-2 focus:ring-blue-100`}
                        placeholder="Votre nom d'utilisateur" 
                        {...registerForm.register('username')}
                        disabled={isLoading}
                      />
                    </div>
                    {registerForm.formState.errors.username && (
                      <p className="text-sm text-red-500 pl-1">
                        {registerForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>
                  <Label className="text-gray-700 font-medium">
                    <span className="bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                      Numéro de téléphone
                    </span>
                  </Label>
                  <div className="space-y-1">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.716 3 6V5z" />
                        </svg>
                      </div>
                      {mounted && (
                        <PhoneInput
                          international
                          withCountryCallingCode
                          defaultCountry="BF"
                          value={registerForm.watch('phoneNumber') as string}
                          onChange={(value) => handlePhoneChange(value, 'phoneNumber')}
                          className={`flex h-10 w-full rounded-lg border ${registerForm.formState.errors.phoneNumber ? 'border-red-500' : 'border-gray-200'} bg-gray-50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                        />
                      )}
                    </div>
                    {registerForm.formState.errors.phoneNumber && (
                      <p className="text-sm text-red-500 pl-1">
                        {registerForm.formState.errors.phoneNumber.message}
                      </p>
                    )}
                  </div>
                  <Label className="text-gray-700 font-medium">
                    <span className="bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                      Mot de passe
                    </span>
                  </Label>
                  <div className="space-y-1">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <Input 
                        type={showRegisterPassword ? 'text' : 'password'}
                        className={`pl-10 bg-gray-50 ${registerForm.formState.errors.password ? 'border-red-500' : 'border-gray-200'} focus:border-blue-400 focus:ring-2 focus:ring-blue-100`}
                        placeholder="Votre mot de passe" 
                        {...registerForm.register('password')}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      >
                        {showRegisterPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-500 pl-1">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <Label className="text-gray-700 font-medium">
                    <span className="bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                      Confirmer le mot de passe
                    </span>
                  </Label>
                  <div className="space-y-1">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <Input 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        className={`pl-10 bg-gray-50 ${registerForm.formState.errors.confirmPassword ? 'border-red-500' : 'border-gray-200'} focus:border-blue-400 focus:ring-2 focus:ring-blue-100`}
                        placeholder="Confirmez votre mot de passe" 
                        {...registerForm.register('confirmPassword')}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-500 pl-1">
                        {registerForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Inscription...
                      </span>
                    ) : 'Créer mon compte'}
                  </Button>
                  </div>
                </form>
              </div>
            )}
          </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col items-center pt-6 space-y-2">
          <p className="text-sm text-gray-600 text-center">
            En vous inscrivant, vous acceptez nos conditions d'utilisation
          </p>
          <button 
            type="button" 
            onClick={() => setIsTermsOpen(true)}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Voir les conditions d'utilisation
          </button>
          
          {/* Mention du développeur */}
          <div className="text-center mt-6 space-y-1.5">
            <p className="text-xs font-sans font-medium bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Développé par <span className="font-bold tracking-tight">Ezaf Technologie</span>
            </p>
            <p className="text-[11px] font-sans text-gray-500/90 tracking-wide">
              <span className="font-medium">Burkina Faso</span>
              <span className="mx-1.5 text-gray-400">•</span>
              <span className="font-mono">(+226) 74 25 07 63</span>
            </p>
          </div>

          <Dialog open={isTermsOpen} onOpenChange={setIsTermsOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] p-0 border-0 bg-gradient-to-br from-white to-gray-50 shadow-2xl rounded-2xl overflow-hidden flex flex-col">
              {/* En-tête avec dégradé */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-6 text-white">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-extrabold text-center mb-2">
                    Conditions Générales d'Utilisation
                  </DialogTitle>
                  <p className="text-center text-green-100 opacity-90">
                    Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </DialogHeader>
              </div>
              
              {/* Contenu compact avec défilement */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Icône décorative */}
                <div className="flex justify-center -mt-12 mb-2">
                  <div className="bg-white p-3 rounded-full shadow-md">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      title: "1. Acceptation des conditions",
                      content: "En utilisant EcoTrajet, vous acceptez pleinement et sans réserve les présentes conditions d'utilisation.",
                      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    },
                    {
                      title: "2. Compte utilisateur",
                      content: "Vous devez avoir au moins 18 ans pour utiliser nos services. Vous êtes responsable de la confidentialité de votre compte et de votre mot de passe.",
                      icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    },
                    {
                      title: "3. Respect de la vie privée",
                      content: "Vos données personnelles sont protégées conformément à notre politique de confidentialité et au RGPD.",
                      icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    },
                    {
                      title: "4. Comportement des utilisateurs",
                      content: "Vous vous engagez à respecter les autres utilisateurs et à ne pas publier de contenu inapproprié ou illégal.",
                      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    },
                    {
                      title: "5. Responsabilité",
                      content: "EcoTrajet ne peut être tenu responsable des accords conclus directement entre utilisateurs.",
                      icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    },
                    {
                      title: "6. Modification des conditions",
                      content: "Nous nous réservons le droit de modifier ces conditions à tout moment. Les utilisateurs seront avertis des changements majeurs.",
                      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start group">
                      <div className="flex-shrink-0 p-1.5 bg-green-100 rounded-lg text-green-600 mr-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon}></path>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800">
                          {item.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-600">{item.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pied de page avec boutons */}
              <div className="bg-gray-50 px-4 py-4 border-t border-gray-100">
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 text-center">
                    En continuant, vous acceptez nos conditions d'utilisation
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-3 w-full">
                    <Button 
                      type="button"
                      onClick={() => {
                        // Ferme simplement la modale et reste sur la page d'authentification
                        setIsTermsOpen(false);
                        // Si dans une WebView, on peut aussi essayer de fermer l'application
                        if (window.Android && typeof window.Android.closeApp === 'function') {
                          window.Android.closeApp();
                        } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.closeApp) {
                          // Pour iOS WebView
                          window.webkit.messageHandlers.closeApp.postMessage('close');
                        }
                      }}
                      variant="outline"
                      className="flex-1 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs font-medium py-2 rounded-lg"
                    >
                      Refuser et quitter
                    </Button>
                    <Button 
                      type="button"
                      onClick={() => setIsTermsOpen(false)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2 rounded-lg"
                    >
                      J'accepte
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}
