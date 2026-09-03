// Context exports
export { FavoritesProvider, useFavorites } from './FavoritesContext';
export type { Module } from './FavoritesContext';

// Re-export LanguageContext from its current location
export { 
  LanguageProvider, 
  useLanguage, 
  languages,
  getStoredLanguagePreference,
} from '../../context/LanguageContext';
