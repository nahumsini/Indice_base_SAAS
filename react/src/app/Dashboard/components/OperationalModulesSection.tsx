import { ModuleCard } from '../../components/ModuleCard';
import type { DashboardModuleCard } from '../../config/moduleCatalog';
import type { PageId } from '../../config/navigation';
import type { OperationalJourneyStageId, OperationalModuleGroup } from '../operationalJourney';
import type { MainDashboardTranslations } from '../translations';

interface OperationalModulesSectionProps {
  title: string;
  label: string;
  copy: MainDashboardTranslations['operationalJourney'];
  groups: OperationalModuleGroup[];
  activeStageId?: OperationalJourneyStageId;
  favoriteIds: string[];
  onToggleFavorite: (moduleId: string) => void;
  onModuleClick: (moduleRoute: PageId) => void;
}

export function OperationalModulesSection({
  title,
  label,
  copy,
  groups,
  activeStageId,
  favoriteIds,
  onToggleFavorite,
  onModuleClick,
}: OperationalModulesSectionProps) {
  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {label}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {groups.map((group) => {
          const labels = copy.stages[group.stage.id];
          const isActive = activeStageId === group.stage.id;

          return (
            <article
              key={group.stage.id}
              className={`rounded-xl border bg-white/90 p-4 shadow-sm transition-colors dark:bg-slate-950/70 ${
                isActive
                  ? 'border-[#558DBD]/50 shadow-[0_16px_42px_rgba(85,141,189,0.14)] dark:border-[#558DBD]/45'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                  {labels.shortTitle}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {labels.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {group.modules.map((module: DashboardModuleCard) => (
                  <ModuleCard
                    key={module.id}
                    {...module}
                    isFavorite={favoriteIds.includes(module.id)}
                    onToggleFavorite={() => onToggleFavorite(module.id)}
                    onClick={() => onModuleClick(module.route)}
                    size="small"
                    isHighlighted={isActive}
                  />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
