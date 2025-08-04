'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, writeBatch, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { deleteUser as deleteAuthUser } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface UserData {
  id: string;
  username: string;
  email: string;
  createdAt: any;
  tokens?: number;
  isBlocked?: boolean;
}

enum TokenUpdateMode {
  ADD = 'add',
  SUBTRACT = 'subtract',
  SET = 'set'
}

export function UsersManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tokenAmount, setTokenAmount] = useState<string>('10');
  const [showTokenModal, setShowTokenModal] = useState<boolean>(false);
  const [globalTokenAmount, setGlobalTokenAmount] = useState<string>('10');
  const [globalTokenMode, setGlobalTokenMode] = useState<TokenUpdateMode>(TokenUpdateMode.ADD);
  const [globalTokenProcessing, setGlobalTokenProcessing] = useState<boolean>(false);
  const [customTokenInput, setCustomTokenInput] = useState<{[key: string]: string}>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // États pour les modales de confirmation
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string>('');

  // Charger les utilisateurs depuis Firestore
  const loadUsers = async () => {
    setLoading(true);
    try {
      console.log('Début du chargement des utilisateurs');
      
      // Utiliser une requête simple sans tri pour éviter les problèmes d'index
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      if (usersSnapshot.empty) {
        console.log('Aucun utilisateur trouvé dans la collection');
      } else {
        console.log(`${usersSnapshot.size} utilisateurs trouvés`);
      }
      
      const usersData = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          username: data.username || 'Sans nom',
          email: data.email || `${doc.id}@ecotrajet.com`,
          createdAt: data.createdAt || null,
          tokens: data.tokens || 0,
          isBlocked: data.isBlocked || false
        };
      });
      
      console.log('Utilisateurs chargés:', usersData);
      setUsers(usersData);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtrer les utilisateurs en fonction du terme de recherche
  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Bloquer/Débloquer un utilisateur
  const toggleUserBlock = async (userId: string, isCurrentlyBlocked: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isBlocked: !isCurrentlyBlocked
      });
      
      // Mettre à jour l'état local
      setUsers(users.map(user => 
        user.id === userId ? {...user, isBlocked: !isCurrentlyBlocked} : user
      ));
      
      toast.success(`Utilisateur ${isCurrentlyBlocked ? 'débloqué' : 'bloqué'} avec succès`);
    } catch (error) {
      console.error('Erreur lors du blocage/déblocage de l\'utilisateur:', error);
      toast.error('Erreur lors de la mise à jour du statut de l\'utilisateur');
    }
  };

  // Gérer la mise à jour des jetons
  const handleTokenUpdate = (userId: string, currentTokens: number) => {
    const amount = parseInt(customTokenInput[userId] || '0');
    if (!isNaN(amount)) {
      updateUserTokens(userId, currentTokens, amount, TokenUpdateMode.SET);
      // Nettoyer l'input après la mise à jour
      const newInputs = {...customTokenInput};
      delete newInputs[userId];
      setCustomTokenInput(newInputs);
    }
  };

  // Mettre à jour les jetons d'un utilisateur
  const updateUserTokens = async (userId: string, currentTokens: number = 0, amount: number, mode: TokenUpdateMode = TokenUpdateMode.ADD) => {
    if (isNaN(amount)) return;
    
    try {
      const userRef = doc(db, 'users', userId);
      let newTokens = currentTokens;
      
      switch (mode) {
        case TokenUpdateMode.ADD:
          newTokens = currentTokens + amount;
          break;
        case TokenUpdateMode.SUBTRACT:
          newTokens = Math.max(0, currentTokens - amount);
          break;
        case TokenUpdateMode.SET:
          newTokens = amount;
          break;
      }
      
      await updateDoc(userRef, { tokens: newTokens });
      
      // Mettre à jour l'état local
      setUsers(users.map(user => 
        user.id === userId ? {...user, tokens: newTokens} : user
      ));
      
      // Enregistrer l'opération
      const operationRef = collection(db, 'tokenOperations');
      await addDoc(operationRef, {
        userId,
        previousTokens: currentTokens,
        newTokens,
        amount,
        mode,
        timestamp: serverTimestamp(),
        adminAction: true
      });
      
      let message = '';
      switch (mode) {
        case TokenUpdateMode.ADD:
          message = `${amount} jetons ajoutés avec succès`;
          break;
        case TokenUpdateMode.SUBTRACT:
          message = `${amount} jetons retirés avec succès`;
          break;
        case TokenUpdateMode.SET:
          message = `Jetons définis à ${amount} avec succès`;
          break;
      }
      
      toast.success(message);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des jetons:', error);
      toast.error('Erreur lors de la mise à jour des jetons');
    }
  };

  // Mettre à jour les jetons de tous les utilisateurs
  const updateAllUsersTokens = async () => {
    const amount = parseInt(globalTokenAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Veuillez entrer un nombre valide supérieur à 0');
      return;
    }
    
    setGlobalTokenProcessing(true);
    
    try {
      // Utiliser des lots pour traiter de nombreux utilisateurs
      const usersToUpdate = [...users];
      const chunkSize = 450; // Limite de Firestore
      let successCount = 0;
      
      for (let i = 0; i < usersToUpdate.length; i += chunkSize) {
        const chunk = usersToUpdate.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach(user => {
          const userRef = doc(db, 'users', user.id);
          const currentTokens = user.tokens || 0;
          let newTokens = currentTokens;
          
          switch (globalTokenMode) {
            case TokenUpdateMode.ADD:
              newTokens = currentTokens + amount;
              break;
            case TokenUpdateMode.SUBTRACT:
              newTokens = Math.max(0, currentTokens - amount);
              break;
            case TokenUpdateMode.SET:
              newTokens = amount;
              break;
          }
          
          batch.update(userRef, { tokens: newTokens });
        });
        
        await batch.commit();
        successCount += chunk.length;
        toast.success(`Traitement: ${successCount}/${usersToUpdate.length} utilisateurs`);
      }
      
      // Mettre à jour l'état local
      setUsers(users.map(user => {
        const currentTokens = user.tokens || 0;
        let newTokens = currentTokens;
        
        switch (globalTokenMode) {
          case TokenUpdateMode.ADD:
            newTokens = currentTokens + amount;
            break;
          case TokenUpdateMode.SUBTRACT:
            newTokens = Math.max(0, currentTokens - amount);
            break;
          case TokenUpdateMode.SET:
            newTokens = amount;
            break;
        }
        
        return { ...user, tokens: newTokens };
      }));
      
      toast.success(`Opération terminée: ${globalTokenMode === TokenUpdateMode.ADD ? 'Ajout' : globalTokenMode === TokenUpdateMode.SUBTRACT ? 'Retrait' : 'Définition'} de ${amount} jetons pour tous les utilisateurs`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour globale des jetons:', error);
      toast.error('Erreur lors de la mise à jour globale des jetons');
    } finally {
      setGlobalTokenProcessing(false);
    }
  };

  // Demander confirmation avant de supprimer un utilisateur
  const confirmDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setShowDeleteConfirmation(true);
  };

  // Demander confirmation avant de supprimer tous les utilisateurs
  const confirmDeleteAllUsers = () => {
    setShowDeleteAllConfirmation(true);
  };

  // Supprimer tous les utilisateurs après confirmation
  const deleteAllUsers = async () => {
    setShowDeleteAllConfirmation(false);
    setLoading(true);
    try {
      // Exclure l'administrateur actuel de la suppression
      const currentUserId = auth.currentUser?.uid;
      const usersToDelete = users.filter(user => user.id !== currentUserId);
      
      if (usersToDelete.length === 0) {
        toast.info('Aucun utilisateur à supprimer (hors administrateur)');
        return;
      }
      
      // Limite de 500 opérations par batch dans Firestore
      const chunkSize = 450;
      let deletedCount = 0;
      
      for (let i = 0; i < usersToDelete.length; i += chunkSize) {
        const chunk = usersToDelete.slice(i, i + chunkSize);
        const currentBatch = writeBatch(db);
        
        chunk.forEach(user => {
          const userRef = doc(db, 'users', user.id);
          currentBatch.delete(userRef);
          deletedCount++;
        });
        
        await currentBatch.commit();
        toast.success(`Lot ${Math.floor(i/chunkSize) + 1} traité (${deletedCount} utilisateurs supprimés)`);
      }
      
      // Mettre à jour l'état local
      if (currentUserId) {
        setUsers(users.filter(user => user.id === currentUserId));
      } else {
        setUsers([]);
      }
      setSelectedUser(null);
      
      toast.success(`${deletedCount} utilisateurs ont été supprimés avec succès (hors administrateur)`);
    } catch (error) {
      console.error('Erreur lors de la suppression des utilisateurs:', error);
      toast.error('Erreur lors de la suppression des utilisateurs');
    } finally {
      setLoading(false);
    }
  };
  
  // Supprimer un utilisateur après confirmation
  const deleteUser = async () => {
    if (!userToDelete) return;
    
    setLoading(true);
    try {
      // Supprimer d'abord le document Firestore
      await deleteDoc(doc(db, 'users', userToDelete));
      
      // Ensuite, essayer de supprimer le compte d'authentification
      try {
        // Si l'utilisateur supprime son propre compte
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === userToDelete) {
          await deleteAuthUser(currentUser);
          toast.success('Votre compte a été supprimé avec succès');
          // Rediriger vers la page d'accueil après la suppression
          window.location.href = '/';
          return;
        } else {
          // Pour les administrateurs qui suppriment d'autres utilisateurs
          // On ne peut pas supprimer directement le compte d'authentification d'un autre utilisateur
          // car cela nécessite l'authentification récente de l'utilisateur
          toast.info('La suppression du compte d\'authentification nécessite une confirmation par email');
        }
      } catch (authError) {
        console.error('Erreur lors de la suppression du compte d\'authentification:', authError);
        // On continue quand même car le document Firestore a déjà été supprimé
      }
      
      // Mettre à jour l'état local
      setUsers(users.filter(user => user.id !== userToDelete));
      setSelectedUser(null);
      setShowDeleteConfirmation(false);
      setUserToDelete('');
      
      toast.success('Utilisateur supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      toast.error('Erreur lors de la suppression de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };
  
  // Formater la date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Date inconnue';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Date invalide';
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
        <h2 className="text-xl font-bold">Gestion des Utilisateurs</h2>
        
        {/* Barre de recherche - responsive */}
        <div className="w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              className="w-full sm:w-auto px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  loadUsers();
                }}
              >
                Actualiser
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                onClick={() => setShowTokenModal(true)}
              >
                <span className="hidden sm:inline">Mise à jour globale des jetons</span>
                <span className="sm:hidden">Jetons global</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={confirmDeleteAllUsers}
              >
                <span className="hidden sm:inline">Supprimer tous les utilisateurs</span>
                <span className="sm:hidden">Tout supprimer</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Chargement des utilisateurs...</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="min-w-full bg-white rounded-lg overflow-hidden text-xs sm:text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-600">Utilisateur</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 hidden sm:table-cell">Email</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-600 hidden md:table-cell">Date d'inscription</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-600">Jetons</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-600">Statut</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium">{user.username}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden sm:table-cell">{user.email}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden md:table-cell">{formatDate(user.createdAt)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={customTokenInput[user.id] !== undefined ? customTokenInput[user.id] : (user.tokens || 0)}
                          onChange={(e) => setCustomTokenInput({
                            ...customTokenInput,
                            [user.id]: e.target.value
                          })}
                          className="w-20 px-2 py-1 border rounded text-sm font-medium focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                          min="0"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleTokenUpdate(user.id, user.tokens || 0);
                            } else if (e.key === 'Escape') {
                              const newInputs = {...customTokenInput};
                              delete newInputs[user.id];
                              setCustomTokenInput(newInputs);
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                          onClick={() => handleTokenUpdate(user.id, user.tokens || 0)}
                        >
                          OK
                        </Button>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                      <span className={`px-1 sm:px-2 py-1 rounded-full text-xs ${user.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {user.isBlocked ? 'Bloqué' : 'Actif'}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                      <div className="flex flex-col xs:flex-row items-start gap-1">
                        <div className="flex items-center space-x-1">
                          {auth.currentUser?.uid !== user.id && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`text-xs px-2 py-1 h-7 ${user.isBlocked ? 'text-green-600 border-green-300 hover:bg-green-50' : 'text-amber-600 border-amber-300 hover:bg-amber-50'}`}
                                onClick={() => toggleUserBlock(user.id, user.isBlocked || false)}
                              >
                                {user.isBlocked ? 'Débloquer' : 'Bloquer'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-50 text-xs px-2 py-1 h-7"
                                onClick={() => confirmDeleteUser(user.id)}
                              >
                                <span className="hidden sm:inline">Supprimer</span>
                                <span className="sm:hidden">X</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    {searchTerm ? 'Aucun utilisateur ne correspond à votre recherche' : 'Aucun utilisateur trouvé'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Modal de mise à jour globale des jetons */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Mise à jour globale des jetons</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode de mise à jour</label>
                <select 
                  className="w-full px-3 py-2 border rounded-md"
                  value={globalTokenMode}
                  onChange={(e) => setGlobalTokenMode(e.target.value as TokenUpdateMode)}
                >
                  <option value={TokenUpdateMode.ADD}>Ajouter des jetons</option>
                  <option value={TokenUpdateMode.SUBTRACT}>Retirer des jetons</option>
                  <option value={TokenUpdateMode.SET}>Définir un nombre fixe</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de jetons</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border rounded-md" 
                  min="1" 
                  value={globalTokenAmount}
                  onChange={(e) => setGlobalTokenAmount(e.target.value)}
                />
              </div>
              
              <div className="text-sm text-gray-500">
                Cette action {globalTokenMode === TokenUpdateMode.ADD ? 'ajoutera' : globalTokenMode === TokenUpdateMode.SUBTRACT ? 'retirera' : 'définira'} {globalTokenAmount} jetons pour tous les utilisateurs.
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowTokenModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={updateAllUsersTokens}
                  disabled={globalTokenProcessing}
                >
                  {globalTokenProcessing ? 'Traitement en cours...' : 'Appliquer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modale de confirmation pour la suppression d'un utilisateur */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        title="Supprimer cet utilisateur"
        message="Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={deleteUser}
        onCancel={() => setShowDeleteConfirmation(false)}
        isDanger={true}
      />
      
      {/* Modale de confirmation pour la suppression de tous les utilisateurs */}
      <ConfirmationDialog
        isOpen={showDeleteAllConfirmation}
        title="Supprimer tous les utilisateurs"
        message="ATTENTION : Êtes-vous absolument sûr de vouloir supprimer TOUS les utilisateurs ? Cette action est irréversible et supprimera toutes les données utilisateurs du système."
        confirmLabel="Tout supprimer"
        onConfirm={deleteAllUsers}
        onCancel={() => setShowDeleteAllConfirmation(false)}
        isDanger={true}
      />
    </div>
  );
}