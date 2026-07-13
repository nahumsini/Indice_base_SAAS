import { ModuleCard } from '../../components/ModuleCard';
import { ModuleCarousel } from '../../components/ModuleCarousel';
import type { PageId } from '../../config/navigation';
import type { Module } from '../../shared/context';

interface FavoritesSectionProps {
  title: string;
  quickAccessLabel: string;
  modules: Module[];
  onToggleFavorite: (moduleId: string) => void;
  onModuleClick: (moduleRoute: PageId) => void;
}

export function FavoritesSection({
  title,
  quickAccessLabel,
  modules,
  onToggleFavorite,
  onModuleClick,
}: FavoritesSectionProps) {
  if (modules.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-4 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
          <span className="text-lg leading-none" aria-hidden="true">⭐</span>
          <span>{title}</span>
        </h2>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 sm:text-sm">{quickAccessLabel}</span>
      </div>
      <ModuleCarousel>
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            {...module}
            isFavorite={true}
            onToggleFavorite={() => onToggleFavorite(module.id)}
            onClick={() => onModuleClick(module.route)}
            size="small"
          />
        ))}
      </ModuleCarousel>
    </section>
  );
}
