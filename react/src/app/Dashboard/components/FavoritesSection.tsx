import favoritesStar from '../../../assets/module-emojis/favorites-star-v1.png';
import { DashboardSectionHeading } from './DashboardSectionHeading';
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
      <DashboardSectionHeading icon={<img src={favoritesStar} alt="" aria-hidden="true" className="size-8 object-contain" />} title={title} description={quickAccessLabel} count={modules.length} />
      <ModuleCarousel dashboardSpacing>
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
