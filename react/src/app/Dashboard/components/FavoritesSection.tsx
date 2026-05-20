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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          ⭐ {title}
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{quickAccessLabel}</span>
      </div>
      <ModuleCarousel gridClasses="grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
        {modules.map((module, index) => (
          <ModuleCard
            key={index}
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
