import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Module {
  id: string;
  emoji: string;
  title: string;
  color: 'blue' | 'yellow' | 'green' | 'red' | 'purple' | 'gold' | 'gray';
  route?: string;
}

interface FavoritesContextType {
  favorites: string[];
  toggleFavorite: (moduleId: string) => void;
  isFavorite: (moduleId: string) => boolean;
  getFavoriteModules: (allModules: Module[]) => Module[];
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(['recursosHumanos', 'procesosTareas', 'gastos', 'cajaChica']);

  const toggleFavorite = (moduleId: string) => {
    setFavorites(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const isFavorite = (moduleId: string) => {
    return favorites.includes(moduleId);
  };

  const getFavoriteModules = (allModules: Module[]) => {
    return allModules.filter(module => favorites.includes(module.id));
  };

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, getFavoriteModules }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
