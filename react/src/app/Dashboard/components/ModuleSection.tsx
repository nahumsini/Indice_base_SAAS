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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
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
