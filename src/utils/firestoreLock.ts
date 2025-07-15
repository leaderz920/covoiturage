/**
 * Utilitaire de verrouillage pour les requêtes Firestore
 * Permet d'éviter les erreurs 'already-exists' causées par des requêtes simultanées
 */

// Singleton pour gérer l'état des verrous
class FirestoreLockManager {
  // Map pour stocker l'état des verrous par opération
  private locks: Map<string, boolean> = new Map();
  // File d'attente par opération
  private queues: Map<string, Array<() => void>> = new Map();

  // Singleton
  private static instance: FirestoreLockManager;
  
  private constructor() {}
  
  public static getInstance(): FirestoreLockManager {
    if (!FirestoreLockManager.instance) {
      FirestoreLockManager.instance = new FirestoreLockManager();
    }
    return FirestoreLockManager.instance;
  }
  
  /**
   * Acquérir un verrou pour une opération spécifique
   * @param operationId Identifiant unique de l'opération
   * @returns Une promesse résolue quand le verrou est acquis
   */
  public async acquireLock(operationId: string): Promise<void> {
    // Si le verrou n'existe pas encore, l'initialiser
    if (!this.locks.has(operationId)) {
      this.locks.set(operationId, false);
      this.queues.set(operationId, []);
    }
    
    // Si le verrou est déjà actif, attendre qu'il soit libéré
    if (this.locks.get(operationId)) {
      console.log(`[FIRESTORE LOCK] Verrou ${operationId} déjà actif, mise en attente...`);
      
      await new Promise<void>(resolve => {
        // Ajouter à la file d'attente pour cette opération
        this.queues.get(operationId)!.push(resolve);
      });
    }
    
    // Acquérir le verrou
    console.log(`[FIRESTORE LOCK] Verrou ${operationId} acquis`);
    this.locks.set(operationId, true);
  }
  
  /**
   * Libérer le verrou pour une opération spécifique
   * @param operationId Identifiant unique de l'opération
   */
  public releaseLock(operationId: string): void {
    // Si le verrou n'existe pas, ne rien faire
    if (!this.locks.has(operationId)) {
      return;
    }
    
    // Libérer le verrou
    this.locks.set(operationId, false);
    
    // Si des promesses sont en attente, en résoudre une
    const queue = this.queues.get(operationId)!;
    if (queue.length > 0) {
      const nextResolve = queue.shift()!;
      nextResolve();
    }
    
    console.log(`[FIRESTORE LOCK] Verrou ${operationId} libéré, ${queue.length} en attente`);
  }
}

// Obtenir l'instance singleton
const lockManager = FirestoreLockManager.getInstance();

/**
 * Fonction de verrouillage pour les requêtes Firestore
 * @param operationId Identifiant unique de l'opération
 * @param callback Fonction à exécuter une fois le verrou acquis
 * @returns Le résultat de la fonction callback
 */
export async function withFirestoreLock<T>(operationId: string, callback: () => Promise<T>): Promise<T> {
  try {
    // Acquérir le verrou
    await lockManager.acquireLock(operationId);
    
    // Exécuter la fonction avec le verrou
    return await callback();
  } finally {
    // Libérer le verrou quoi qu'il arrive
    lockManager.releaseLock(operationId);
  }
}

// Types d'opérations Firestore courantes pour standardisation
export const FirestoreOperations = {
  GET_USER_DATA: 'getUserData',
  GET_ALL_ANNOUNCEMENTS: 'getAllAnnouncements',
  GET_USER_ANNOUNCEMENTS: 'getUserAnnouncements',
  SEARCH_ANNOUNCEMENTS: 'searchAnnouncements'
};
