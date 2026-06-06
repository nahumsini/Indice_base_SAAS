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
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
          ⭐ {title}
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{quickAccessLabel}</span>
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
