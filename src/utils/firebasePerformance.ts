import { initializeFirestore, CACHE_SIZE_UNLIMITED, enableIndexedDbPersistence } from 'firebase/firestore';
import { FirebaseApp } from 'firebase/app';

/**
 * Configure Firestore avec des paramu00e8tres optimisu00e9s pour la performance
 * @param app L'instance FirebaseApp
 * @returns L'instance Firestore optimisu00e9e
 */
export function configureOptimizedFirestore(app: FirebaseApp) {
  // Limiter la taille du cache u00e0 50MB au lieu de UNLIMITED pour u00e9viter la surcharge du navigateur
  const db = initializeFirestore(app, {
    cacheSizeBytes: 50 * 1024 * 1024 // 50MB
  });

  // Activer la persistance des donnu00e9es conditionnellement basu00e9e sur les capacitu00e9s de l'appareil
  if (typeof window !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    // Vu00e9rifier d'abord l'espace disponible
    navigator.storage.estimate().then(({usage, quota}) => {
      // Si nous avons suffisamment d'espace (au moins 100MB libre), activer la persistance
      if (quota && quota - (usage || 0) > 100 * 1024 * 1024) {
        enableIndexedDbPersistence(db, {forceOwnership: false}) // forceOwnership: false pour u00e9viter les problu00e8mes multi-onglets
          .then(() => {
            console.log('Persistance Firestore activu00e9e avec succu00e8s');
          })
          .catch((err) => {
            if (err.code === 'failed-precondition') {
              // Plusieurs onglets ouverts, on continue sans persistance
              console.warn('La persistance ne peut pas u00eatre activu00e9e car plusieurs onglets sont ouverts');
            } else if (err.code === 'unimplemented') {
              console.warn('Ce navigateur ne prend pas en charge la persistance offline');
            } else {
              console.error('Erreur d\'activation de la persistance:', err);
            }
          });
      } else {
        console.warn('Espace de stockage insuffisant, persistance du00e9sactivu00e9e pour amu00e9liorer les performances');
      }
    }).catch(err => {
      console.error('Erreur lors de la vu00e9rification du stockage:', err);
    });
  }

  return db;
}

/**
 * Classe utilitaire pour mettre en cache des donnu00e9es Firebase
 * et u00e9viter les requu00eates redondantes
 */
export class FirestoreCache<T> {
  private cache: { [key: string]: { data: T | null, timestamp: number } } = {};
  private defaultTTL: number;

  /**
   * @param defaultTTL Duru00e9e de vie par du00e9faut du cache en millisecondes (2 minutes par du00e9faut)
   */
  constructor(defaultTTL: number = 2 * 60 * 1000) {
    this.defaultTTL = defaultTTL;
  }

  /**
   * Ru00e9cupu00e8re des donnu00e9es du cache ou exu00e9cute la fonction fetchData si le cache est invalide
   * @param key Clu00e9 unique pour identifier les donnu00e9es
   * @param fetchData Fonction asynchrone pour ru00e9cupu00e9rer les donnu00e9es si le cache est manquant ou expiru00e9
   * @param ttl Duru00e9e de vie spu00e9cifique pour cette entru00e9e de cache (optionnel)
   */
  async getOrFetch(key: string, fetchData: () => Promise<T | null>, ttl?: number): Promise<T | null> {
    const now = Date.now();
    const cachedData = this.cache[key];
    const cacheTTL = ttl || this.defaultTTL;

    // Si le cache est valide, l'utiliser
    if (cachedData && (now - cachedData.timestamp < cacheTTL)) {
      console.log(`Utilisation des donnu00e9es en cache pour ${key}`);
      return cachedData.data;
    }

    try {
      // Ru00e9cupu00e9rer de nouvelles donnu00e9es
      const freshData = await fetchData();

      // Mettre u00e0 jour le cache
      this.cache[key] = {
        data: freshData,
        timestamp: now
      };

      return freshData;
    } catch (error) {
      console.error(`Erreur lors de la ru00e9cupu00e9ration des donnu00e9es pour ${key}:`, error);

      // En cas d'erreur, utiliser les donnu00e9es en cache mu00eame si elles sont pu00e9rimu00e9es
      if (cachedData) {
        console.warn(`Utilisation des donnu00e9es en cache pu00e9rimu00e9es pour ${key} en raison d'une erreur`);
        return cachedData.data;
      }

      throw error;
    }
  }

  /**
   * Ajoute ou met u00e0 jour des donnu00e9es dans le cache
   */
  update(key: string, data: T): void {
    this.cache[key] = {
      data,
      timestamp: Date.now()
    };
  }

  /**
   * Supprime une entru00e9e du cache
   */
  invalidate(key: string): void {
    delete this.cache[key];
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    this.cache = {};
  }
}
