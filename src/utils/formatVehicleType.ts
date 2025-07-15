/**
 * Formate le type de véhicule pour l'affichage
 * @param vehicleType - Peut être une chaîne, un tableau de chaînes, ou undefined
 * @returns Une chaîne formatée en minuscules, avec les éléments séparés par des virgules si c'est un tableau
 */
export const formatVehicleType = (vehicleType: string | string[] | undefined): string => {
  if (!vehicleType) return '';
  if (Array.isArray(vehicleType)) {
    return vehicleType.join(', ').toLowerCase();
  }
  return String(vehicleType).toLowerCase();
};

/**
 * Obtient l'icône et la couleur pour un type de véhicule donné
 * @param vehicleType - Type de véhicule formaté (peut être une chaîne ou un tableau)
 * @returns Un objet contenant l'icône et la couleur à utiliser
 */
// Mappage des types de véhicules avec leurs variantes
const vehicleIconsMap: Record<string, { icon: string; color: string }> = {
  // Moto et variantes
  'moto': { icon: 'fas fa-motorcycle', color: 'text-blue-500' },
  'moto-taxi': { icon: 'fas fa-motorcycle', color: 'text-blue-500' },
  'tricycle': { icon: 'fas fa-motorcycle', color: 'text-green-500' },
  'tricycle / moto-taxi': { icon: 'fas fa-motorcycle', color: 'text-green-500' },
  
  // Voiture
  'voiture': { icon: 'fas fa-car', color: 'text-purple-500' },
  
  // Vélo
  'vélo': { icon: 'fas fa-bicycle', color: 'text-green-600' },
  'velo': { icon: 'fas fa-bicycle', color: 'text-green-600' },
  
  // Taxi
  'taxi': { icon: 'fas fa-taxi', color: 'text-yellow-500' },
  
  // Bus
  'bus': { icon: 'fas fa-bus', color: 'text-purple-500' },
  'bus de transport': { icon: 'fas fa-bus', color: 'text-purple-500' },
  'bus de transport en commun': { icon: 'fas fa-bus', color: 'text-purple-500' },
  
  // Minibus
  'minibus': { icon: 'fas fa-shuttle-van', color: 'text-pink-500' },
  
  // Camion
  'camion': { icon: 'fas fa-truck', color: 'text-red-500' },
  
  // Ben
  'ben': { icon: 'fas fa-truck-moving', color: 'text-amber-700' },
  
  // Dina
  'dina': { icon: 'fas fa-truck-pickup', color: 'text-indigo-500' },
  
  // Remorque
  'remorque': { icon: 'fas fa-trailer', color: 'text-orange-500' },
  
  // Charrette
  'charrette': { icon: 'fas fa-trailer', color: 'text-amber-900' },
  'charrette à traction animale': { icon: 'fas fa-trailer', color: 'text-amber-900' },
  
  // Autres
  'indifferent': { icon: 'fas fa-random', color: 'text-gray-500' },
};

export const getVehicleIconAndColor = (vehicleType: string | string[] | undefined) => {
  // Par défaut, utiliser une voiture
  const defaultIcon = { icon: 'fas fa-car', color: 'text-purple-500' };
  
  if (!vehicleType) return defaultIcon;
  
  // Traiter le cas d'un tableau
  if (Array.isArray(vehicleType)) {
    for (const t of vehicleType) {
      const tStr = String(t).trim().toLowerCase();
      const match = vehicleIconsMap[tStr];
      if (match) return match;
    }
    return defaultIcon;
  }
  
  // Traiter le cas d'une chaîne simple
  const typeStr = String(vehicleType).trim().toLowerCase();
  return vehicleIconsMap[typeStr] || defaultIcon;
};
