import React, { useState, useRef } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useUserData } from '@/contexts/UserDataContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription
} from "@/components/ui/dialog-simple";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { auth, db } from '@/lib/firebase';
import { storage } from '@/lib/firebase';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Ajouter le type pour FormValues
type FormValues = z.infer<typeof formSchema>;

interface PublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: FormValues) => void;
  announcementToEdit?: any | null; // Annonce à éditer si présente
}

const vehicleTypes = [
  { id: 'indifferent', label: 'Indifférent' },
  { id: 'Moto', label: 'Moto' },
  { id: 'Voiture', label: 'Voiture' },
  { id: 'Vélo', label: 'Vélo' },
  { id: 'Taxi', label: 'Taxi' },
  { id: 'Minibus', label: 'Minibus' },
  { id: 'Camion', label: 'Camion' },
  { id: 'Ben', label: 'Ben' },
  { id: 'Dina', label: 'Dina' },
  { id: 'Remorque', label: 'Remorque' },
  { id: 'Moto-taxi', label: 'Moto-taxi' },
  { id: 'Bus', label: 'Bus de transport' },
  { id: 'Charrette', label: 'Charrette' },
];

// Schéma de base pour les champs communs
const baseSchema = {
  type: z.enum(["driver", "passenger"], {
    required_error: "Veuillez sélectionner un type d'annonce",
  }),
  from: z.string().min(2, "Le lieu de départ est requis"),
  to: z.string().min(2, "La destination est requise"),
  date: z.string({ required_error: "La date est requise" }),
  time: z.string({ required_error: "L'heure est requise" }),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  additionalInfo: z.string().optional(),
};

// Schéma pour les conducteurs
const driverSchema = z.object({
  ...baseSchema,
  type: z.literal("driver"),
  vehicleType: z.string({
    required_error: "Veuillez sélectionner un type de véhicule",
  }),
  seats: z.string().min(1, "Le nombre de places est requis"),
  price: z.string().min(1, "Le prix est requis"),
  vehiclePhoto: z.any().optional(),
});

// Schéma pour les passagers
const passengerSchema = z.object({
  ...baseSchema,
  type: z.literal("passenger"),
  vehicleType: z
    .array(z.string())
    .min(1, "Veuillez sélectionner au moins un type de véhicule")
    .optional(),
  seats: z.string().optional(),
  price: z.string().optional(),
});

// Schéma combiné
const formSchema = z.discriminatedUnion("type", [driverSchema, passengerSchema]);

type FormValues = z.infer<typeof formSchema>;

export function PublishModal({ open, onOpenChange, onSubmit, announcementToEdit }: PublishModalProps) {
  const [publishType, setPublishType] = useState<'driver' | 'passenger'>('driver');
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState<string | null>(null);
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const { userData, updateTokens, hasEnoughTokens } = useUserData();
  
  const vehiclePhotoRef = useRef<HTMLInputElement>(null);

  // Initialisation des valeurs par défaut du formulaire
  const defaultValues = {
    type: 'driver' as const,
    from: announcementToEdit?.from || "",
    to: announcementToEdit?.to || "",
    date: (() => {
      if (!announcementToEdit?.date) return "";
      try {
        let dateObj;
        if (announcementToEdit.date?.toDate) {
          dateObj = announcementToEdit.date.toDate();
        } else if (announcementToEdit.date instanceof Date) {
          dateObj = announcementToEdit.date;
        } else if (typeof announcementToEdit.date === 'string') {
          dateObj = new Date(announcementToEdit.date);
        } else if (typeof announcementToEdit.date === 'number') {
          dateObj = new Date(announcementToEdit.date);
        } else {
          return "";
        }
        
        if (isNaN(dateObj.getTime())) {
          console.error("Date invalide:", announcementToEdit.date);
          return "";
        }
        
        return dateObj.toISOString().split('T')[0];
      } catch (error) {
        console.error("Erreur lors de la conversion de la date:", error);
        return "";
      }
    })(),
    time: announcementToEdit?.time || "",
    phone: announcementToEdit?.phone || "",
    additionalInfo: announcementToEdit?.additionalInfo || "",
    // Gestion différenciée du type de véhicule
    ...(announcementToEdit?.type === 'driver' || !announcementToEdit
      ? {
          vehicleType: announcementToEdit?.vehicleType || "",
          seats: announcementToEdit?.seats?.toString() || "",
          price: announcementToEdit?.price?.toString() || "",
        }
      : {
          vehicleType: Array.isArray(announcementToEdit?.vehicleType)
            ? announcementToEdit.vehicleType
            : announcementToEdit?.vehicleType
            ? [announcementToEdit.vehicleType]
            : [],
          seats: announcementToEdit?.seats?.toString() || "",
          price: announcementToEdit?.price?.toString() || "",
        }),
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  // Mettre à jour le type de publication et l'aperçu de la photo lors de l'édition
  React.useEffect(() => {
    try {
      if (announcementToEdit) {
        console.log('Début de l\'initialisation du formulaire pour édition:', JSON.stringify(announcementToEdit));
        
        // Vérifier si l'annonce a le type requis
        if (!announcementToEdit.type) {
          console.error('Erreur: Le type de l\'annonce est manquant', announcementToEdit);
          toast.error("Format d'annonce invalide");
          return;
        }
        
        // Définir le type de publication (conducteur ou passager) avec vérification
        console.log('Type d\'annonce:', announcementToEdit.type);
        setPublishType(announcementToEdit.type === 'driver' ? 'driver' : 'passenger');
        form.setValue("type", announcementToEdit.type === 'driver' ? 'driver' : 'passenger');
        
        // Définir tous les champs du formulaire avec les valeurs de l'annonce
        console.log('Initialisation des champs from/to:', announcementToEdit.from, announcementToEdit.to);
        form.setValue("from", announcementToEdit.from || "");
        form.setValue("to", announcementToEdit.to || "");
        
        // Gérer la date avec précaution
        console.log('Traitement de la date:', announcementToEdit.date);
        if (announcementToEdit.date) {
          try {
            let dateString = "";
            if (announcementToEdit.date instanceof Date) {
              dateString = announcementToEdit.date.toISOString().split('T')[0];
            } else if (typeof announcementToEdit.date === 'string') {
              dateString = new Date(announcementToEdit.date).toISOString().split('T')[0];
            } else if (typeof announcementToEdit.date === 'object' && 'seconds' in announcementToEdit.date) {
              dateString = new Date(announcementToEdit.date.seconds * 1000).toISOString().split('T')[0];
            } else if (typeof announcementToEdit.date === 'number') {
              dateString = new Date(announcementToEdit.date).toISOString().split('T')[0];
            }
            console.log('Date convertie en:', dateString);
            form.setValue("date", dateString);
          } catch (error) {
            console.error('Erreur lors de la conversion de la date:', error);
            form.setValue("date", ""); // Valeur par défaut en cas d'erreur
          }
        }
        
        console.log('Initialisation des champs restants');
        form.setValue("time", announcementToEdit.time || "");
        form.setValue("price", announcementToEdit.price?.toString() || "");
        form.setValue("phone", announcementToEdit.phone || "");
        form.setValue("vehicleType", announcementToEdit.vehicleType || "");
        form.setValue("seats", announcementToEdit.seats?.toString() || "");
        
        // Définir l'aperçu de la photo si disponible
        if (announcementToEdit.vehiclePhoto) {
          console.log('Photo de véhicule détectée');
          setVehiclePhotoPreview(announcementToEdit.vehiclePhoto);
        }
        
        console.log('Initialisation du formulaire terminée avec succès');
      }
    } catch (error) {
      console.error('ERREUR CRITIQUE lors de l\'initialisation du formulaire:', error);
      toast.error("Impossible d'initialiser le formulaire de modification");
    }
  }, [announcementToEdit, form]);

  // Gérer le téléchargement des photos vers Firebase Storage
  // Fonction simulant un upload local - à utiliser en cas d'erreur CORS avec Firebase
  const simulatePhotoUpload = async (vehiclePhoto?: File): Promise<{ vehiclePhotoUrl?: string }> => {
    return new Promise((resolve) => {
      console.log('[UPLOAD DEBUG] Simulation d\'upload local (CORS bypass)');
      if (!vehiclePhoto) {
        console.warn('[UPLOAD DEBUG] Aucun fichier vehiclePhoto fourni à simulatePhotoUpload');
        resolve({});
        return;
      }
      
      // Utiliser FileReader pour lire localement le fichier
      const reader = new FileReader();
      reader.onload = () => {
        // Utiliser une URL de données en base64 temporaire
        // Note: ceci est une URL locale pour la session et n'est pas stockée dans Firebase
        const dataUrl = reader.result as string;
        console.log('[UPLOAD DEBUG] URL locale créée pour CORS bypass');
        resolve({ vehiclePhotoUrl: dataUrl });
      };
      reader.onerror = () => {
        console.error('[UPLOAD DEBUG] Erreur lecture du fichier en local');
        resolve({}); // Continuer sans photo
      };
      reader.readAsDataURL(vehiclePhoto);
    });
  };

  // Fonction d'upload avec fallback en cas d'erreur CORS
  const uploadPhoto = async (vehiclePhoto?: File) => {
    console.log('[UPLOAD DEBUG] Démarrage de uploadPhoto avec bucket:', storage.app.options.storageBucket);
    const uploadedUrls: { vehiclePhotoUrl?: string } = {};

    if (!vehiclePhoto) {
      console.warn('[UPLOAD DEBUG] Aucun fichier vehiclePhoto fourni à uploadPhoto');
      return uploadedUrls;
    }

    try {
      console.log('[UPLOAD DEBUG] Début upload photo:', vehiclePhoto.name, 'taille:', vehiclePhoto.size);
      const path = `${Date.now()}-${vehiclePhoto.name}`;

      // 1. Tentative d'upload direct avec Firebase Storage
      try {
        console.log('[UPLOAD DEBUG] Tentative upload Firebase...', path);
        // Assurer qu'on utilise juste le nom du fichier pour le chemin (sans sous-dossiers)
        // Format: 1621553872591-voiture.jpg
        const simplePath = `${Date.now()}-${vehiclePhoto.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        console.log('[UPLOAD DEBUG] Chemin simplifié:', simplePath);
        
        // Créer une référence au fichier dans le stockage
        const vehiclePhotoRef = ref(storage, simplePath);
        
        // Uploader le fichier avec des métadonnées
        const metadata = {
          contentType: vehiclePhoto.type,
          customMetadata: {
            'uploadedBy': 'ecotrajet-app',
            'uploadTime': new Date().toISOString()
          }
        };
        
        const snapshot = await uploadBytes(vehiclePhotoRef, vehiclePhoto, metadata);
        console.log('[UPLOAD DEBUG] Fichier uploadé avec succès à Firebase Storage', snapshot);
        
        // Obtenir l'URL de téléchargement
        const downloadURL = await getDownloadURL(vehiclePhotoRef);
        console.log('[UPLOAD DEBUG] URL Firebase obtenue:', downloadURL);
        console.log('[DEBUG] URL obtenue depuis Firebase :', downloadURL);
        
        uploadedUrls.vehiclePhotoUrl = downloadURL;
        console.log('[UPLOAD VALIDATE] Structure finale uploadedUrls:', JSON.stringify(uploadedUrls));
        return uploadedUrls;
      } catch (error) {
        console.error('[UPLOAD ERROR] Échec upload Firebase:', error);
        
        // 2. Si l'upload Firebase a échoué, on essaie à nouveau avec un timeout plus long
        console.log('[UPLOAD DEBUG] Tentative avec un timeout plus long...');
        
        try {
          const uploadPromise = new Promise((resolve, reject) => {
            try {
              const vehiclePhotoRef = ref(storage, path);
              uploadBytes(vehiclePhotoRef, vehiclePhoto)
                .then(snapshot => getDownloadURL(vehiclePhotoRef))
                .then(url => resolve({ vehiclePhotoUrl: url }))
                .catch(error => reject(error));
            } catch (e) {
              reject(e);
            }
          });

          // Timeout de 10 secondes pour la seconde tentative
          const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
              console.warn('[UPLOAD DEBUG] Timeout déclenché pour la seconde tentative');
              resolve({ vehiclePhotoUrl: null });
            }, 10000);
          });

          const result = await Promise.race([uploadPromise, timeoutPromise]) as { vehiclePhotoUrl?: string };
          
          if (result.vehiclePhotoUrl) {
            console.log('[UPLOAD DEBUG] Seconde tentative réussie. URL:', result.vehiclePhotoUrl);
            uploadedUrls.vehiclePhotoUrl = result.vehiclePhotoUrl;
            return uploadedUrls;
          }
        } catch (retryError) {
          console.error('[UPLOAD ERROR] Échec de la seconde tentative:', retryError);
        }
        
        // 3. Fallback vers la simulation locale comme dernier recours
        console.log('[UPLOAD DEBUG] Fallback vers upload local...');
        try {
          const localResult = await simulatePhotoUpload(vehiclePhoto);
          console.log('[UPLOAD DEBUG] Résultat du fallback local:', JSON.stringify(localResult));
          return localResult; // Retourner immédiatement le résultat du fallback
        } catch (fallbackError) {
          console.error('[UPLOAD ERROR] Échec du fallback local:', fallbackError);
          return { vehiclePhotoUrl: null }; // Retourner un objet vide mais valide en cas d'échec
        }
      }
    } catch (error) {
      console.error('[UPLOAD ERROR] Erreur lors de l\'upload de la photo:', error);
      // En cas d'erreur non prévue, utiliser le fallback
      try {
        const emergencyResult = await simulatePhotoUpload(vehiclePhoto);
        console.log('[UPLOAD DEBUG] Résultat du fallback d\'urgence:', JSON.stringify(emergencyResult));
        return emergencyResult;
      } catch (fallbackError) {
        console.error('[UPLOAD ERROR] Échec critique du fallback:', fallbackError);
        // Ne pas bloquer le processus, continuer sans photo
        return { vehiclePhotoUrl: null };
      }
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsUploading(true);
      
      // Vérification des jetons pour les nouvelles annonces
      if (!announcementToEdit && !hasEnoughTokens(1)) {
        toast.error("Vous n'avez pas assez de jetons pour publier une annonce");
        return;
      }
      
      // Gestion de la photo de véhicule pour les conducteurs
      let vehiclePhotoUrl = announcementToEdit?.vehiclePhotoUrl || '';
      if (vehiclePhotoFile && userData?.id) {
        const storageRef = ref(storage, `vehicles/${userData.id}/${Date.now()}_${vehiclePhotoFile.name}`);
        await uploadBytes(storageRef, vehiclePhotoFile);
        vehiclePhotoUrl = await getDownloadURL(storageRef);
      }

      // Données communes
      const baseData = {
        ...(announcementToEdit?.id && { id: announcementToEdit.id }), // Ajouter l'ID si édition
        from: values.from,
        to: values.to,
        date: values.date,
        time: values.time,
        phone: values.phone,
        additionalInfo: values.additionalInfo || '',
        userId: userData?.id || '',
        userName: userData?.displayName || userData?.username || 'Utilisateur',
        userPhoto: userData?.photoURL || userData?.userPhoto || '',
        vehiclePhotoUrl,
        createdAt: announcementToEdit?.createdAt || new Date(),
      };

      // Données spécifiques au type d'annonce
      const announcementData = {
        ...baseData,
        ...(values.type === 'driver'
          ? {
              type: 'driver',
              vehicleType: values.vehicleType as string, // Chaîne pour les conducteurs
              seats: Number(values.seats),
              price: Number(values.price),
              vehiclePhoto: !!vehiclePhotoUrl,
            }
          : {
              type: 'passenger',
              vehicleType: Array.isArray(values.vehicleType) 
                ? values.vehicleType 
                : values.vehicleType 
                  ? [values.vehicleType] 
                  : [],
              seats: values.seats ? Number(values.seats) : 1,
              price: values.price ? Number(values.price) : 0,
            }),
      };

      if (onSubmit) {
        await onSubmit(announcementData);
      }

      // Déduire un jeton pour la publication (uniquement pour les nouvelles annonces)
      if (!announcementToEdit) {
        await updateTokens(-1);
      }

      // Réinitialisation du formulaire
      form.reset();
      setVehiclePhotoPreview(null);
      setVehiclePhotoFile(null);
      onOpenChange(false);
      
      // Afficher une notification de succès
      toast.success(announcementToEdit ? "Annonce mise à jour avec succès" : "Annonce publiée avec succès");
      
    } catch (error) {
      console.error("Erreur lors de la soumission du formulaire:", error);
      toast.error("Une erreur est survenue lors de la publication de l'annonce");
    } finally {
      setIsUploading(false);
    }
  };

  // Générer un ID unique pour l'accessibilité
  const titleId = React.useId();
  
  // Vérifie si le formulaire contient des données
  const isFormEmpty = () => {
    const values = form.getValues();
    return (
      !values.from &&
      !values.to &&
      !values.date &&
      !values.time &&
      !values.phone &&
      !values.additionalInfo &&
      (!values.vehicleType || (Array.isArray(values.vehicleType) && values.vehicleType.length === 0)) &&
      !values.seats &&
      !values.price &&
      !vehiclePhotoPreview
    );
  };

  // Gère la fermeture de la modale
  const handleClose = (open: boolean) => {
    if (!open) {
      if (!isFormEmpty() && !announcementToEdit) {
        setShowCloseConfirmation(true);
        return false; // Empêche la fermeture
      }
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent 
          className="w-[90vw] max-w-[90vw] sm:max-w-md p-0 border-0 shadow-xl rounded-xl overflow-hidden max-h-[90vh] flex flex-col modal-content"
          aria-labelledby={titleId}
          onCloseRequest={() => {
            if (!isFormEmpty() && !announcementToEdit) {
              setShowCloseConfirmation(true);
              return true; // Empêche la fermeture immédiate
            }
            return false; // Permet la fermeture normale
          }}
      >
        {/* En-tête avec dégradé - maintenant fixe */}
        <DialogHeader className="block p-0 m-0">
          <div className="relative py-3 px-6 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            <button 
              type="button"
              onClick={() => {
                if (!isFormEmpty() && !announcementToEdit) {
                  setShowCloseConfirmation(true);
                } else {
                  onOpenChange(false);
                }
              }}
              className="absolute right-3 top-3 bg-white/20 text-white hover:bg-white/30 rounded-full p-1"
              aria-label="Fermer la modale"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-center">
              <button 
                type="button"
                onClick={() => {
                  if (!isFormEmpty() && !announcementToEdit) {
                    setShowCloseConfirmation(true);
                  } else {
                    onOpenChange(false);
                  }
                }}
                className="text-white hover:bg-white/20 rounded-full p-1 mr-1"
                aria-label="Retour"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md mr-3">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <DialogTitle id={titleId} className="text-base font-bold text-white leading-tight">
                  {announcementToEdit ? "Modifier l'annonce" : "Publier une annonce"}
                </DialogTitle>
                <p className="text-green-50 text-xs">
                  {announcementToEdit ? "Mettez à jour les informations" : "Partagez votre trajet"}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        {/* Contenu défilant */}
        <div className="flex-grow overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 p-6 w-full">
              <div className="flex mb-5 bg-gray-50 p-1 rounded-xl shadow-sm">
                <Button
                  type="button"
                  variant="ghost"
                  className={`flex-1 rounded-lg py-5 font-medium ${form.watch("type") === "driver" ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => {
                    setPublishType('driver');
                    form.setValue("type", "driver");
                  }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Conducteur
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className={`flex-1 rounded-lg py-5 font-medium ${form.watch("type") === "passenger" ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => {
                    setPublishType('passenger');
                    form.setValue("type", "passenger");
                  }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Passager
                </Button>
              </div>
              
              <p className="text-sm text-gray-500 mb-2 font-medium">
                {userData?.tokens} jeton{userData?.tokens !== 1 ? 's' : ''} disponible{userData?.tokens !== 1 ? 's' : ''} 
                <span className="block mt-1 sm:inline-block sm:ml-2 text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                  1 jeton par publication
                </span>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Départ</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <svg className="w-5 h-5 text-emerald-500 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <Input placeholder="Départ" className="pl-10 border-blue-200 focus:border-emerald-400 rounded-lg" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Destination</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <svg className="w-5 h-5 text-emerald-500 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <Input placeholder="Arrivée" className="pl-10 border-blue-200 focus:border-emerald-400 rounded-lg" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Date</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <svg className="w-5 h-5 text-emerald-500 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <Input 
                            type="date" 
                            min={new Date().toISOString().split('T')[0]} 
                            className="pl-10 border-blue-200 focus:border-emerald-400 rounded-lg" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Heure de départ</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <svg className="w-5 h-5 text-emerald-500 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <Input type="time" className="pl-10 border-blue-200 focus:border-emerald-400 rounded-lg" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Champs spécifiques pour les conducteurs */}
              {publishType === 'driver' && (
                <>
                  <FormField
                    control={form.control}
                    name="vehicleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de véhicule proposé</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Moto">Moto</SelectItem>
                            <SelectItem value="Voiture">Voiture</SelectItem>
                            <SelectItem value="Vélo">Vélo</SelectItem>
                            <SelectItem value="Taxi">Taxi</SelectItem>
                            <SelectItem value="Bus de transport en commun">Bus de transport en commun</SelectItem>
                            <SelectItem value="Minibus">Minibus</SelectItem>
                            <SelectItem value="Tricycle / Moto-taxi">Tricycle / Moto-taxi</SelectItem>
                            <SelectItem value="Charrette à traction animale">Charrette à traction animale</SelectItem>
                            <SelectItem value="Camion">Camion</SelectItem>
                            <SelectItem value="Ben">Ben</SelectItem>
                            <SelectItem value="Dina">Dina</SelectItem>
                            <SelectItem value="Remorque">Remorque</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="seats"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de places</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Nombre de places disponibles" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix par place</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Prix en FCFA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {publishType === 'passenger' && (
                <>
                  <FormField
                    control={form.control}
                    name="vehicleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Véhicules souhaités</FormLabel>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {vehicleTypes.map((vehicle) => (
                            <div key={vehicle.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`vehicle-${vehicle.id}`}
                                checked={field.value?.includes(vehicle.id) || false}
                                onChange={(e) => {
                                  const currentValues = field.value || [];
                                  if (e.target.checked) {
                                    field.onChange([...currentValues, vehicle.id]);
                                  } else {
                                    field.onChange(currentValues.filter((v: string) => v !== vehicle.id));
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <label 
                                htmlFor={`vehicle-${vehicle.id}`}
                                className="text-sm font-medium text-gray-700 cursor-pointer whitespace-nowrap"
                              >
                                {vehicle.label}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de téléphone</FormLabel>
                    <FormControl>
                      <div className="phone-input-container">
                        <PhoneInput
                          country={'bf'} // Code pour Burkina Faso
                          value={field.value}
                          onChange={(phone) => field.onChange(phone)}
                          inputClass="phone-input"
                          containerClass="phone-container"
                          placeholder="Votre numéro de téléphone"
                          preferredCountries={['bf', 'sn', 'ci', 'ml', 'tg', 'gh']} // Pays d'Afrique de l'Ouest
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additionalInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Détails supplémentaires</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <svg className="absolute left-3 top-5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        <textarea 
                          placeholder="Informations complémentaires sur le trajet" 
                          className="pl-10 border-2 border-blue-300 focus:border-emerald-500 rounded-lg resize-none p-3 w-full min-h-[100px] shadow-sm" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {publishType === 'driver' && (
                <FormField
                  control={form.control}
                  name="vehiclePhoto"
                  render={() => (
                    <FormItem>
                      <FormLabel>Photo du véhicule</FormLabel>
                      <FormControl>
                        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                          <input
                            type="file"
                            accept="image/*"
                            id="vehicle-photo"
                            ref={vehiclePhotoRef}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              setVehiclePhotoFile(file ?? null);
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  setVehiclePhotoPreview(event.target?.result as string);
                                };
                                reader.readAsDataURL(file);
                              } else {
                                setVehiclePhotoPreview(null);
                              }
                            }}
                          />
                          
                          {!vehiclePhotoPreview ? (
                            <div className="flex flex-col items-center">
                              <div 
                                className="mt-2 cursor-pointer w-full h-36 rounded-lg bg-blue-100 flex items-center justify-center hover:bg-blue-200"
                                onClick={() => vehiclePhotoRef.current?.click()}
                              >
                                <div className="text-center">
                                  <svg className="w-10 h-10 text-blue-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <p className="text-sm text-blue-500 mt-2">Cliquez pour ajouter une photo</p>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">Une photo de votre véhicule ajoute de la crédibilité à votre annonce</p>
                            </div>
                          ) : (
                            <div className="mt-2 relative flex justify-center">
                              <div className="relative">
                                <img 
                                  src={vehiclePhotoPreview} 
                                  alt="Aperçu du véhicule" 
                                  className="w-36 h-36 object-cover rounded-lg shadow-sm"
                                />
                                <div className="absolute top-2 right-2 flex space-x-2">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="rounded-full h-7 w-7 p-0 bg-red-500/90 hover:bg-red-600"
                                  onClick={() => {
                                    setVehiclePhotoPreview(null);
                                    setVehiclePhotoFile(null);
                                    if (vehiclePhotoRef.current) {
                                      vehiclePhotoRef.current.value = '';
                                    }
                                  }}
                                >
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full h-7 w-7 p-0 bg-white/90 hover:bg-white"
                                  onClick={() => vehiclePhotoRef.current?.click()}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L11.828 15.414M13 13l5.586-5.586" />
                                  </svg>
                                </Button>
                              </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}



              <Button 
                  type="submit" 
                  disabled={isUploading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white py-6 rounded-xl shadow-md mt-6 font-medium text-base"
                >
                  {isUploading ? (
                    <>
                      {announcementToEdit ? "Mise à jour en cours..." : "Publication en cours..."}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        {announcementToEdit ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        )}
                      </svg>
                      {announcementToEdit ? "Mettre à jour l'annonce" : "Publier cette annonce"}
                    </>
                  )}
                </Button>
            </form>
          </Form>
        </div>
        </DialogContent>
      </Dialog>

      {/* Modale de confirmation de fermeture */}
      <Dialog open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
        <DialogContent className="max-w-[260px] p-4 rounded-xl">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <DialogHeader className="space-y-0.5">
              <DialogTitle className="text-base font-semibold text-gray-900">Annuler ?</DialogTitle>
              <DialogDescription className="text-xs text-gray-500 font-medium">
                Modifications non enregistrées
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="px-3 text-xs h-8"
                onClick={() => setShowCloseConfirmation(false)}
              >
                Continuer
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                className="px-3 text-xs h-8"
                onClick={() => {
                  setShowCloseConfirmation(false);
                  form.reset();
                  onOpenChange(false);
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}