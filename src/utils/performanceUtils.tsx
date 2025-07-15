'use client';

import React, { memo, useCallback, useState, useEffect } from 'react';

/**
 * Utilitu00e9 pour mu00e9moiser un composant React afin d'u00e9viter les re-rendus inutiles
 * @param Component Le composant u00e0 mu00e9moiser
 * @param propsAreEqual Fonction de comparaison personnalisu00e9e des props (optionnelle)
 */
export function memoizeComponent<T>(Component: React.ComponentType<T>, propsAreEqual?: (prevProps: T, nextProps: T) => boolean) {
  return memo(Component, propsAreEqual);
}

/**
 * Hook personnalisu00e9 pour retarder les mises u00e0 jour d'u00e9tat non critiques
 * Utile pour u00e9viter les mises u00e0 jour d'u00e9tat qui pourraient bloquer le thread principal
 * @param initialValue Valeur initiale
 * @param delay Du00e9lai en ms avant la mise u00e0 jour (du00e9faut: 10ms)
 */
export function useDeferredState<T>(initialValue: T, delay = 10) {
  const [state, setState] = useState<T>(initialValue);
  
  const deferredSetState = useCallback((newValue: T) => {
    setTimeout(() => {
      setState(newValue);
    }, delay);
  }, [delay]);
  
  return [state, deferredSetState] as const;
}

/**
 * Hook pour du00e9tecter les problu00e8mes de performance dans les composants
 * @param componentName Nom du composant u00e0 surveiller
 * @param threshold Seuil de temps de rendu en ms au-delu00e0 duquel un avertissement est affichu00e9
 */
export function useRenderMonitor(componentName: string, threshold = 50) {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > threshold) {
        console.warn(`Le composant ${componentName} a mis ${renderTime.toFixed(2)}ms u00e0 se rendre. C'est au-dessus du seuil de ${threshold}ms.`);
      }
    };
  }, [componentName, threshold]);
}

/**
 * Composant d'ordre supu00e9rieur (HOC) pour optimiser les listes de grande taille
 * en n'affichant que les u00e9lu00e9ments visibles dans la fenu00eatre
 */
export function withVirtualization<P>(Component: React.ComponentType<P>, itemHeight: number) {
  return function VirtualizedList(props: P & { items: any[] }) {
    const { items, ...rest } = props;
    const [visibleItems, setVisibleItems] = useState<any[]>([]);
    
    useEffect(() => {
      function handleScroll() {
        const scrollTop = window.scrollY;
        const viewportHeight = window.innerHeight;
        
        // Calculer les index de du00e9but et de fin des u00e9lu00e9ments visibles
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 5); // 5 u00e9lu00e9ments de marge
        const endIndex = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / itemHeight) + 5);
        
        // Mettre u00e0 jour les u00e9lu00e9ments visibles
        setVisibleItems(items.slice(startIndex, endIndex).map((item, index) => ({
          ...item,
          style: { position: 'absolute', top: (startIndex + index) * itemHeight, height: itemHeight }
        })));
      }
      
      // Appeler une premiu00e8re fois pour initialiser
      handleScroll();
      
      // Ajouter l'u00e9couteur d'u00e9vu00e9nement
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }, [items, itemHeight]);
    
    return <Component {...rest as P} items={visibleItems} containerHeight={items.length * itemHeight} />;
  };
}

/**
 * Hook pour charger les donnu00e9es de maniu00e8re progressive (lazy loading)
 * @param fetchFunction Fonction pour ru00e9cupu00e9rer les donnu00e9es
 * @param initialData Donnu00e9es initiales (optionnelles)
 * @param delay Du00e9lai en ms avant de du00e9clencher le chargement (du00e9faut: 100ms)
 */
export function useLazyData<T>(fetchFunction: () => Promise<T>, initialData?: T, delay = 100) {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      fetchFunction()
        .then(result => {
          if (mounted) {
            setData(result);
            setLoading(false);
          }
        })
        .catch(err => {
          if (mounted) {
            setError(err);
            setLoading(false);
          }
        });
    }, delay);
    setLoading(true);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [fetchFunction, delay]);
  
  return { data, loading, error };
}
