import type { ReactNode } from 'react';
import { DashboardSectionHeading } from './DashboardSectionHeading';
import { ModuleCard } from '../../components/ModuleCard';
import { ModuleCarousel } from '../../components/ModuleCarousel';
import type { DashboardModuleCard } from '../../config/moduleCatalog';
import type { PageId } from '../../config/navigation';

interface ModuleSectionProps {
  icon: ReactNode;
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
      <DashboardSectionHeading icon={icon} title={title} description={label} count={modules.length} />
      <ModuleCarousel gridClasses={gridClasses} singleRow={singleRow} dashboardSpacing>
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
