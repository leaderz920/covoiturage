'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface UserData {
  id: string;
  username: string;
  email: string;
  tokens?: number;
}

interface TokenOperation {
  id: string;
  userId: string;
  username: string;
  amount: number;
  operationType: 'add' | 'remove' | 'use';
  reason: string;
  timestamp: any;
  adminNote?: string;
}

export function TokensManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [operations, setOperations] = useState<TokenOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationsLoading, setOperationsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [tokenAmount, setTokenAmount] = useState<number>(10);
  const [adminNote, setAdminNote] = useState<string>('');

  // Charger les utilisateurs depuis Firestore
  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('username'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as UserData[];
      setUsers(usersData);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  // Charger l'historique des opérations
  const loadOperations = async () => {
    setOperationsLoading(true);
    try {
      const operationsQuery = query(collection(db, 'tokenOperations'), orderBy('timestamp', 'desc'));
      const operationsSnapshot = await getDocs(operationsQuery);
      const operationsData = operationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as TokenOperation[];
      setOperations(operationsData);
    } catch (error) {
      console.error('Erreur lors du chargement des opérations:', error);
      toast.error('Erreur lors du chargement de l\'historique des jetons');
    } finally {
      setOperationsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadOperations();
  }, []);

  // Filtrer les utilisateurs en fonction du terme de recherche
  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ajouter des jetons à un utilisateur
  const addTokens = async () => {
    if (!selectedUser) return;
    if (tokenAmount <= 0) {
      toast.error('Le montant doit être supérieur à 0');
      return;
    }
    
    try {
      // Mettre à jour les jetons de l'utilisateur
      const userRef = doc(db, 'users', selectedUser.id);
      const currentTokens = selectedUser.tokens || 0;
      await updateDoc(userRef, {
        tokens: currentTokens + tokenAmount
      });
      
      // Enregistrer l'opération dans l'historique
      await addDoc(collection(db, 'tokenOperations'), {
        userId: selectedUser.id,
        username: selectedUser.username,
        amount: tokenAmount,
        operationType: 'add',
        reason: 'Ajout administratif',
        adminNote: adminNote || 'Ajout de jetons par l\'administrateur',
        timestamp: serverTimestamp()
      });
      
      // Mettre à jour l'état local
      setUsers(users.map(user => 
        user.id === selectedUser.id ? {...user, tokens: (user.tokens || 0) + tokenAmount} : user
      ));
      setSelectedUser({
        ...selectedUser,
        tokens: (selectedUser.tokens || 0) + tokenAmount
      });
      
      // Recharger l'historique des opérations
      loadOperations();
      
      toast.success(`${tokenAmount} jetons ajoutés avec succès à ${selectedUser.username}`);
      setTokenAmount(10); // Réinitialiser le montant
      setAdminNote(''); // Réinitialiser la note
    } catch (error) {
      console.error('Erreur lors de l\'ajout de jetons:', error);
      toast.error('Erreur lors de l\'ajout de jetons');
    }
  };

  // Retirer des jetons à un utilisateur
  const removeTokens = async () => {
    if (!selectedUser) return;
    if (tokenAmount <= 0) {
      toast.error('Le montant doit être supérieur à 0');
      return;
    }
    
    const currentTokens = selectedUser.tokens || 0;
    if (tokenAmount > currentTokens) {
      toast.error(`L'utilisateur ne possède que ${currentTokens} jetons`);
      return;
    }
    
    try {
      // Mettre à jour les jetons de l'utilisateur
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        tokens: currentTokens - tokenAmount
      });
      
      // Enregistrer l'opération dans l'historique
      await addDoc(collection(db, 'tokenOperations'), {
        userId: selectedUser.id,
        username: selectedUser.username,
        amount: tokenAmount,
        operationType: 'remove',
        reason: 'Retrait administratif',
        adminNote: adminNote || 'Retrait de jetons par l\'administrateur',
        timestamp: serverTimestamp()
      });
      
      // Mettre à jour l'état local
      setUsers(users.map(user => 
        user.id === selectedUser.id ? {...user, tokens: (user.tokens || 0) - tokenAmount} : user
      ));
      setSelectedUser({
        ...selectedUser,
        tokens: (selectedUser.tokens || 0) - tokenAmount
      });
      
      // Recharger l'historique des opérations
      loadOperations();
      
      toast.success(`${tokenAmount} jetons retirés avec succès de ${selectedUser.username}`);
      setTokenAmount(10); // Réinitialiser le montant
      setAdminNote(''); // Réinitialiser la note
    } catch (error) {
      console.error('Erreur lors du retrait de jetons:', error);
      toast.error('Erreur lors du retrait de jetons');
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

  // Obtenir la classe CSS pour le type d'opération
  const getOperationTypeClass = (type: string) => {
    switch (type) {
      case 'add':
        return 'bg-green-100 text-green-800';
      case 'remove':
        return 'bg-red-100 text-red-800';
      case 'use':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Obtenir le libellé pour le type d'opération
  const getOperationTypeLabel = (type: string) => {
    switch (type) {
      case 'add':
        return 'Ajout';
      case 'remove':
        return 'Retrait';
      case 'use':
        return 'Utilisation';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Gestion des Jetons</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              loadUsers();
              loadOperations();
            }}
          >
            Actualiser
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 1: Liste des utilisateurs */}
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Utilisateurs</h3>
          
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Chargement des utilisateurs...</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[400px] border rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <li 
                      key={user.id} 
                      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${selectedUser?.id === user.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">{user.tokens || 0} jetons</p>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-6 text-center text-gray-500">
                    {searchTerm ? 'Aucun utilisateur ne correspond à votre recherche' : 'Aucun utilisateur trouvé'}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Section 2: Modification des jetons */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm">
          {selectedUser ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">Modifier les jetons de {selectedUser.username}</h3>
              
              <div className="mb-6 p-4 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600 mb-2">Informations utilisateur:</p>
                <p><span className="font-medium">Nom d'utilisateur:</span> {selectedUser.username}</p>
                <p><span className="font-medium">Email:</span> {selectedUser.email}</p>
                <p><span className="font-medium">Jetons actuels:</span> <span className="font-bold text-blue-600">{selectedUser.tokens || 0}</span></p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="tokenAmount" className="block text-sm font-medium text-gray-700 mb-1">Nombre de jetons</label>
                  <Input
                    id="tokenAmount"
                    type="number"
                    min="1"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label htmlFor="adminNote" className="block text-sm font-medium text-gray-700 mb-1">Note (optionnelle)</label>
                  <Input
                    id="adminNote"
                    type="text"
                    placeholder="Raison de la modification"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  className="text-green-600 border-green-300 hover:bg-green-50"
                  onClick={addTokens}
                >
                  Ajouter des jetons
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={removeTokens}
                >
                  Retirer des jetons
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <p>Sélectionnez un utilisateur pour modifier ses jetons</p>
            </div>
          )}
          
          {/* Historique des opérations */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Historique des opérations de jetons</h3>
            
            {operationsLoading ? (
              <div className="text-center py-6">
                <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p>Chargement de l'historique...</p>
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opération</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {operations.length > 0 ? (
                      operations.map((operation) => (
                        <tr key={operation.id}>
                          <td className="px-4 py-3 text-sm text-gray-500">{formatDate(operation.timestamp)}</td>
                          <td className="px-4 py-3 text-sm">{operation.username}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${getOperationTypeClass(operation.operationType)}`}>
                              {getOperationTypeLabel(operation.operationType)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {operation.operationType === 'add' && <span className="text-green-600">+{operation.amount}</span>}
                            {operation.operationType === 'remove' && <span className="text-red-600">-{operation.amount}</span>}
                            {operation.operationType === 'use' && <span className="text-blue-600">-{operation.amount}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{operation.adminNote || operation.reason || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                          Aucune opération de jetons enregistrée
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
