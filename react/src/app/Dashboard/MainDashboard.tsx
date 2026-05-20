import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/dashboard';
import { LearningModeBanner } from '../components/LearningModeBanner';
import {
  buildDefaultModuleCatalog,
  mapBackendModuleToCard,
  mergeDashboardModules,
  type DashboardModuleCard,
} from '../config/moduleCatalog';
import type { PageId } from '../config/navigation';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { useFavorites, useLanguage } from '../shared/context';
import { FavoritesSection } from './components/FavoritesSection';
import { KpiSection } from './components/KpiSection';
import { ModuleSection } from './components/ModuleSection';
import { buildDashboardKpiDataMap, defaultDashboardKpiIds } from './dashboardData';

export interface MainDashboardProps {
  learningModeActive: boolean;
  learningModeVisible: boolean;
  setLearningModeVisible: (visible: boolean) => void;
  learningStep: number;
  setLearningStep: (step: number) => void;
  onNavigate: (page: PageId) => void;
}

export function MainDashboard({
  learningModeActive,
  learningModeVisible,
  setLearningModeVisible,
  learningStep,
  setLearningStep,
  onNavigate,
}: MainDashboardProps) {
  const { t } = useLanguage();
  const { favorites, toggleFavorite, getFavoriteModules } = useFavorites();
  const [isKPIConfigOpen, setIsKPIConfigOpen] = useState(false);
  const [availableModules, setAvailableModules] = useState<DashboardModuleCard[]>(() => buildDefaultModuleCatalog(t));
  const [selectedKPIIds, setSelectedKPIIds] = useLocalStorageState<string[]>(
    'indice.dashboard.selectedKpis',
    [...defaultDashboardKpiIds],
  );

  const handleNextStep = () => {
    if (learningStep < 7) {
      setLearningStep(learningStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (learningStep > 0) {
      setLearningStep(learningStep - 1);
    }
  };

  const handleSaveKPIs = (kpis: string[]) => {
    setSelectedKPIIds(kpis);
  };

  const handleModuleClick = (moduleRoute: PageId) => {
    onNavigate(moduleRoute);
  };

  useEffect(() => {
    let active = true;

    const defaultModules = buildDefaultModuleCatalog(t);
    setAvailableModules(defaultModules);

    dashboardApi.listModules()
      .then((backendModules) => {
        if (!active) {
          return;
        }

        const mappedModules = backendModules
          .map((module) => mapBackendModuleToCard(module, t))
          .filter((module): module is DashboardModuleCard => module !== null);

        if (mappedModules.length === 0) {
          setAvailableModules(defaultModules);
          return;
        }

        setAvailableModules(mergeDashboardModules(mappedModules, defaultModules));
      })
      .catch(() => {
        if (active) {
          setAvailableModules(defaultModules);
        }
      });

    return () => {
      active = false;
    };
  }, [t]);

  const kpiDataMap = buildDashboardKpiDataMap(t);
  const kpiData = selectedKPIIds.map(id => kpiDataMap[id]).filter(Boolean);

  const mainModules = availableModules.filter((module) => module.category === 'basic');
  const complementaryModules = availableModules.filter((module) => module.category === 'complementary');
  const aiModules = availableModules.filter((module) => module.category === 'ai');

  const favoriteModules = getFavoriteModules(availableModules);
  const isGuidedLearningVisible = learningModeActive && learningModeVisible;

  return (
    <main className="max-w-[1600px] mx-auto px-8 py-10 space-y-12">
      {/* Learning mode banner */}
      {isGuidedLearningVisible && (
        <LearningModeBanner
          isVisible={learningModeVisible}
          onHide={() => setLearningModeVisible(false)}
          currentStep={learningStep}
          totalSteps={8}
          onNext={handleNextStep}
          onPrevious={handlePreviousStep}
        />
      )}

      {!isGuidedLearningVisible && (
        <KpiSection
          title={t.sections.kpis}
          kpis={kpiData}
          selectedKPIIds={selectedKPIIds}
          isConfigOpen={isKPIConfigOpen}
          onOpenConfig={() => setIsKPIConfigOpen(true)}
          onCloseConfig={() => setIsKPIConfigOpen(false)}
          onSave={handleSaveKPIs}
        />
      )}

      {!isGuidedLearningVisible && (
        <FavoritesSection
          title={t.sections.favorites}
          quickAccessLabel={t.sections.quickAccess}
          modules={favoriteModules}
          onToggleFavorite={toggleFavorite}
          onModuleClick={handleModuleClick}
        />
      )}

      <ModuleSection
        icon="🏢"
        title={t.sections.basicModules}
        label={t.sections.main}
        modules={mainModules}
        favoriteIds={favorites}
        onToggleFavorite={toggleFavorite}
        onModuleClick={handleModuleClick}
        gridClasses="grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10"
        getStepNumber={(index) => isGuidedLearningVisible ? index + 1 : undefined}
        getIsHighlighted={(index) => isGuidedLearningVisible && learningStep === index}
      />

      <ModuleSection
        icon="🔧"
        title={t.sections.complementaryModules}
        label={t.sections.additional}
        modules={complementaryModules}
        favoriteIds={favorites}
        onToggleFavorite={toggleFavorite}
        onModuleClick={handleModuleClick}
        singleRow
      />

      <ModuleSection
        icon="🤖"
        title={t.sections.aiModules}
        label={t.sections.aiLabel}
        modules={aiModules}
        favoriteIds={favorites}
        onToggleFavorite={toggleFavorite}
        onModuleClick={handleModuleClick}
        className="pb-10"
        gridClasses="grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10"
      />
    </main>
  );
}
