import { Star, Settings, Home } from 'lucide-react';
import { useLanguage } from '../shared/context';
import { useFavorites } from '../shared/context';
import { buildDefaultModuleCatalog } from '../config/moduleCatalog';

interface FavoritesBarProps {
  onNavigate: (page: string) => void;
  currentModule?: string;
}

type FavoriteBarModule = {
  id: string;
  route: string;
  emoji: string;
  title: string;
  color: string;
};

export function FavoritesBar({ onNavigate, currentModule }: FavoritesBarProps) {
  const { t } = useLanguage();
  const { getFavoriteModules } = useFavorites();

  const allModules = buildDefaultModuleCatalog(t);
  const coreModuleFlow = [
    'home-panel',
    'human-resources',
    'processes-tasks',
    'expenses',
    'petty-cash',
  ] as const;
  const moduleById = new Map(allModules.map((module) => [module.id, module] as const));
  const pinnedModules = coreModuleFlow
    .map((moduleId) => moduleById.get(moduleId))
    .filter(Boolean) as FavoriteBarModule[];
  const extraFavoriteModules: FavoriteBarModule[] = getFavoriteModules(allModules).filter(
    (module) => !coreModuleFlow.includes(module.id as (typeof coreModuleFlow)[number]),
  );
  const visibleModules: FavoriteBarModule[] = [...pinnedModules, ...extraFavoriteModules];

  const handleModuleClick = (module: FavoriteBarModule) => {
    onNavigate(module.route);
  };

  const getButtonColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-[rgb(85,141,189)]/10 text-[rgb(85,141,189)] border-[rgb(85,141,189)]/30 hover:bg-[rgb(85,141,189)]/20 dark:bg-[rgb(85,141,189)]/20 dark:text-[rgb(85,141,189)] dark:border-[rgb(85,141,189)]/30 dark:hover:bg-[rgb(85,141,189)]/30',
      yellow: 'bg-[rgb(255,214,80)]/10 text-[rgb(180,150,50)] border-[rgb(255,214,80)]/30 hover:bg-[rgb(255,214,80)]/20 dark:bg-[rgb(255,214,80)]/20 dark:text-[rgb(255,214,80)] dark:border-[rgb(255,214,80)]/30 dark:hover:bg-[rgb(255,214,80)]/30',
      green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-900/40',
      red: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-900/40',
      purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700 dark:hover:bg-purple-900/40',
      gold: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/40',
      orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700 dark:hover:bg-orange-900/40',
    };
    return colorMap[color] || colorMap.blue;
  };

  // No mostrar la barra si estamos en el dashboard
  if (currentModule === 'dashboard') {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="-mx-4 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0">
        <div className="flex min-w-max items-center gap-2 sm:min-w-0 sm:flex-wrap">
          {/* Botón Dashboard - Siempre fijo */}
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <span>🏠</span>
            <span>Dashboard</span>
          </button>

          {/* Módulos Favoritos */}
          {visibleModules.map((module) => {
            const isActive = currentModule === module.route;
            const baseClasses = getButtonColorClasses(module.color);
            const activeClasses = isActive ? 'ring-2 ring-offset-2 ring-blue-500' : '';

            return (
              <button
                key={module.id}
                onClick={() => handleModuleClick(module)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg transition-all ${baseClasses} ${activeClasses}`}
              >
                <span>{module.emoji}</span>
                <span>{module.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
