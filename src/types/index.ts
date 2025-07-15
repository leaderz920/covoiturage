export type UserType = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  photoURL?: string;
  tokens: number;
  createdAt: Date;
  updatedAt?: Date;
  phoneNumber?: string;
};

export type AnnouncementType = {
  id: string;
  type: 'driver' | 'passenger';
  from: string;
  to: string;
  date: Date;
  time: string;
  price: number;
  seats?: number;
  userId: string;
  createdAt: Date;
  vehicleType?: string | string[];
  vehiclePhoto?: string;
  vehiclePhotoUrl?: string; // URL de la photo du véhicule (après upload)
  userName?: string;
  userPhoto?: string;
  phoneNumber?: string; // Format historique
  phone?: string;       // Nouveau format
  additionalInfo?: string;
};

export type SearchParamsType = {
  type: 'driver' | 'passenger';
  from?: string;
  to?: string;
  date?: Date;
};
