import { ModuleCard } from '../../components/ModuleCard';
import { ModuleCarousel } from '../../components/ModuleCarousel';
import type { DashboardModuleCard } from '../../config/moduleCatalog';
import type { PageId } from '../../config/navigation';

interface ModuleSectionProps {
  icon: string;
  title: string;
  label: string;
  modules: DashboardModuleCard[];
  favoriteIds: string[];
  onToggleFavorite: (moduleId: string) => void;
  onModuleClick: (moduleRoute: PageId) => void;
  className?: string;
  gridClasses?: string;
  singleRow?: boolean;
  getStepNumber?: (index: number) => number | undefined;
  getIsHighlighted?: (index: number) => boolean | undefined;
}

export function ModuleSection({
  icon,
  title,
  label,
  modules,
  favoriteIds,
  onToggleFavorite,
  onModuleClick,
  className,
  gridClasses,
  singleRow,
  getStepNumber,
  getIsHighlighted,
}: ModuleSectionProps) {
  return (
    <section className={className}>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
          {icon} {title}
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      </div>
      <ModuleCarousel gridClasses={gridClasses} singleRow={singleRow}>
        {modules.map((module, index) => (
          <ModuleCard
            key={index}
            {...module}
            isFavorite={favoriteIds.includes(module.id)}
            onToggleFavorite={() => onToggleFavorite(module.id)}
            onClick={() => onModuleClick(module.route)}
            size="small"
            stepNumber={getStepNumber?.(index)}
            isHighlighted={getIsHighlighted?.(index)}
          />
        ))}
      </ModuleCarousel>
    </section>
  );
}
