import { useLanguage } from '../shared/context';
import { useFavorites } from '../shared/context';
import { useAccessibleModuleCatalog } from '../hooks/useAccessibleModuleCatalog';
import { resolvePageId } from '../config/navigation';
import { Star } from 'lucide-react';

interface FavoritesBarProps {
  onNavigate: (page: string) => void;
  currentModule?: string;
  compact?: boolean;
}

type FavoriteBarModule = {
  id: string;
  route: string;
  emoji: string;
  title: string;
  color: string;
};

export function FavoritesBar({ onNavigate, currentModule, compact = false }: FavoritesBarProps) {
  const { t } = useLanguage();
  const { getFavoriteModules } = useFavorites();

  const allModules = useAccessibleModuleCatalog(t);
  const visibleModules: FavoriteBarModule[] = getFavoriteModules(allModules);
  const activeModule = resolvePageId(currentModule) ?? currentModule;

  const handleModuleClick = (module: FavoriteBarModule) => {
    onNavigate(module.route);
  };

  const getButtonColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      aqua: 'bg-[#59C3A5]/10 text-[#257B68] border-[#59C3A5]/30 hover:bg-[#59C3A5]/20 dark:bg-[#59C3A5]/20 dark:text-[#8FE0CA] dark:border-[#59C3A5]/30 dark:hover:bg-[#59C3A5]/30',
      blue: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 hover:bg-[#2563EB]/20 dark:bg-[#2563EB]/20 dark:text-[#93C5FD] dark:border-[#2563EB]/30 dark:hover:bg-[#2563EB]/30',
      coral: 'bg-[#FF6B5E]/10 text-[#B63B32] border-[#FF6B5E]/30 hover:bg-[#FF6B5E]/20 dark:bg-[#FF6B5E]/20 dark:text-[#FFB0AA] dark:border-[#FF6B5E]/30 dark:hover:bg-[#FF6B5E]/30',
      yellow: 'bg-[#F4C84A]/15 text-[#9A6B05] border-[#F4C84A]/35 hover:bg-[#F4C84A]/25 dark:bg-[#F4C84A]/20 dark:text-[#FEF3C7] dark:border-[#F4C84A]/35 dark:hover:bg-[#F4C84A]/30',
      green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-900/40',
      red: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-900/40',
      purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700 dark:hover:bg-purple-900/40',
      gold: 'bg-[#F4C84A]/15 text-[#9A6B05] border-[#F4C84A]/35 hover:bg-[#F4C84A]/25 dark:bg-[#F4C84A]/20 dark:text-[#FEF3C7] dark:border-[#F4C84A]/35 dark:hover:bg-[#F4C84A]/30',
      orange: 'bg-[#FF6B5E]/10 text-[#B63B32] border-[#FF6B5E]/30 hover:bg-[#FF6B5E]/20 dark:bg-[#FF6B5E]/20 dark:text-[#FFB0AA] dark:border-[#FF6B5E]/30 dark:hover:bg-[#FF6B5E]/30',
    };
    return colorMap[color] || colorMap.blue;
  };

  const getActiveRingClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      aqua: 'ring-2 ring-offset-2 ring-[#59C3A5]',
      blue: 'ring-2 ring-offset-2 ring-[#2563EB]',
      coral: 'ring-2 ring-offset-2 ring-[#FF6B5E]',
      yellow: 'ring-2 ring-offset-2 ring-[#F4C84A]',
      green: 'ring-2 ring-offset-2 ring-green-500',
      red: 'ring-2 ring-offset-2 ring-red-500',
      purple: 'ring-2 ring-offset-2 ring-purple-500',
      gold: 'ring-2 ring-offset-2 ring-[#F4C84A]',
      orange: 'ring-2 ring-offset-2 ring-[#FF6B5E]',
    };
    return colorMap[color] || colorMap.blue;
  };

  const getResolvedModuleColor = (module: FavoriteBarModule) => {
    const route = resolvePageId(module.route) ?? module.route;
    return route === 'processes-tasks' ? 'yellow' : module.color;
  };

  // The Dashboard screen owns the main favorites section, so the compact bar is hidden there.
  if (currentModule === 'dashboard') {
    return null;
  }

  return (
    <div className={compact ? 'min-w-0' : 'mb-6'}>
      <div className={compact ? 'overflow-x-auto py-1' : '-mx-4 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0'}>
        <div className={`flex min-w-max items-center ${compact ? 'gap-1.5' : 'gap-2'} sm:min-w-0 sm:flex-wrap`}>
          {/* Botón Dashboard - Siempre fijo */}
          <button
            onClick={() => onNavigate('dashboard')}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 ${compact ? 'min-h-9 px-2.5 py-1 text-xs sm:text-sm' : 'px-3 py-1.5 text-sm'}`}
          >
            <span>🏠</span>
            <span>Dashboard</span>
          </button>

          {compact ? (
            <div className="ml-0.5 inline-flex min-h-9 items-center gap-1.5 border-l border-slate-200 pl-2.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden="true" />
              <span className="hidden xl:inline">{t.sections.favorites}</span>
              <span className="sr-only xl:hidden">{t.sections.favorites}</span>
            </div>
          ) : null}

          {/* Módulos Favoritos */}
          {visibleModules.map((module) => {
            const route = resolvePageId(module.route) ?? module.route;
            const moduleColor = getResolvedModuleColor(module);
            const isActive = activeModule === route;
            const baseClasses = getButtonColorClasses(moduleColor);
            const activeClasses = isActive ? getActiveRingClasses(moduleColor) : '';

            return (
              <button
                key={module.id}
                onClick={() => handleModuleClick(module)}
                className={`inline-flex items-center gap-1.5 border font-medium rounded-lg transition-all ${compact ? 'min-h-9 px-2.5 py-1 text-xs sm:text-sm' : 'px-3 py-1.5 text-sm'} ${baseClasses} ${activeClasses}`}
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
