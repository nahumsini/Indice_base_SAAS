import type { LearningCharacterId } from '../../learningMode/characters';
import { useAuthorizationRevision } from '../../hooks/useAuthorizationRevision';
import { getCachedAuthSession } from '../../api/authSessionStore';
import { canAccessModuleTab } from '../../access/tabScopeCatalog';
import { LearningPracticeExample } from '../../learningMode/components/LearningPracticeExample';
import { learningPracticeRoutes, learningStagePractices } from '../../learningMode/practiceExamples';
import { ModuleCard } from '../../components/ModuleCard';
import { ModuleCarousel } from '../../components/ModuleCarousel';
import { IndiceEmoji } from '../../components/icons/ModuleTabEmoji';
import type { PageId } from '../../config/navigation';
import type { OperationalJourneyStageId, OperationalModuleGroup } from '../operationalJourney';
import type { MainDashboardTranslations } from '../translations';
import { learningStageArtwork } from '../learningStageArtwork';
import { DashboardSectionHeading } from './DashboardSectionHeading';

interface OperationalModulesSectionProps {
  characterId: LearningCharacterId | null;
  title: string;
  noTools: string;
  copy: MainDashboardTranslations['operationalJourney'];
  groups: OperationalModuleGroup[];
  activeStageId?: OperationalJourneyStageId;
  favoriteIds: string[];
  onToggleFavorite: (moduleId: string) => void;
  onModuleClick: (moduleRoute: PageId) => void;
  onNavigate: (page: PageId, tab?: string) => void;
}

export function OperationalModulesSection({ characterId, title, noTools, copy, groups, activeStageId, favoriteIds, onToggleFavorite, onModuleClick, onNavigate }: OperationalModulesSectionProps) {
  useAuthorizationRevision();
  const session = getCachedAuthSession();
  const group = groups.find((item) => item.stage.id === activeStageId);
  const labels = activeStageId ? copy.stages[activeStageId] : undefined;
  const modules = group?.modules ?? [];
  const candidateId = activeStageId ? learningStagePractices[activeStageId] : undefined;
  const practiceRoute = candidateId ? learningPracticeRoutes[candidateId] : undefined;
  const practiceId = candidateId && practiceRoute
    && modules.some(module => module.route === practiceRoute.page)
    && canAccessModuleTab(practiceRoute.page, practiceRoute.tab, session)
    ? candidateId : null;
  return (
    <section aria-live="polite">
      <DashboardSectionHeading
        icon={<IndiceEmoji name={activeStageId ? learningStageArtwork[activeStageId].name : 'folder'} className="size-8" />}
        title={title}
        description={labels ? `${copy.goalLabel}: ${labels.description}` : undefined}
        count={modules.length}
      />
      {modules.length > 0 ? (
        <ModuleCarousel singleRow dashboardSpacing>
          {modules.map((module) => (
            <ModuleCard key={module.id} {...module} isFavorite={favoriteIds.includes(module.id)} onToggleFavorite={() => onToggleFavorite(module.id)} onClick={() => onModuleClick(module.route)} size="small" />
          ))}
        </ModuleCarousel>
      ) : <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">{noTools}</p>}
      {practiceId && <div className="mt-5"><LearningPracticeExample key={practiceId} id={practiceId} characterId={characterId} defaultOpen onOpenTools={() => { const route = learningPracticeRoutes[practiceId]; onNavigate(route.page, route.tab); }} /></div>}
    </section>
  );
}
