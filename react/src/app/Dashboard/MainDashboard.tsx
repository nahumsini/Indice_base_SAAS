import { useEffect, useMemo, useState } from 'react';
import { dashboardApi } from '../api/dashboard';
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
import { OperationalJourney } from './components/OperationalJourney';
import { OperationalModulesSection } from './components/OperationalModulesSection';
import { buildDashboardAvailableKpis, buildDashboardKpiDataMap, defaultDashboardKpiIds } from './dashboardData';
import { useMainDashboardTranslations } from './hooks/useMainDashboardTranslations';
import {
  buildOperationalJourneyView,
  buildOperationalModuleGroups,
  clampOperationalJourneyStep,
  operationalJourneyStages,
  type OperationalJourneyStageId,
} from './operationalJourney';

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
  const copy = useMainDashboardTranslations();
  const { favorites, toggleFavorite, getFavoriteModules } = useFavorites();
  const [isKPIConfigOpen, setIsKPIConfigOpen] = useState(false);
  const [availableModules, setAvailableModules] = useState<DashboardModuleCard[]>(() => buildDefaultModuleCatalog(t));
  const [selectedKPIIds, setSelectedKPIIds] = useLocalStorageState<string[]>(
    'indice.dashboard.selectedKpis',
    [...defaultDashboardKpiIds],
  );

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

  const kpiDataMap = useMemo(() => buildDashboardKpiDataMap(copy), [copy]);
  const kpiData = useMemo(
    () => selectedKPIIds.map(id => kpiDataMap[id]).filter(Boolean),
    [kpiDataMap, selectedKPIIds],
  );
  const availableKPIs = useMemo(
    () => buildDashboardAvailableKpis(copy, {
      expenses: t.modules.gastos,
      pettyCash: t.modules.cajaChica,
      sales: t.modules.ventas,
      pointOfSale: t.modules.puntoVenta,
      humanResources: t.modules.recursosHumanos,
      processesTasks: t.modules.procesosTareas,
      inventory: t.modules.inventarios,
      maintenance: t.modules.mantenimiento,
      invoicing: t.modules.facturacion,
      workClimate: t.modules.climaLaboral,
    }),
    [copy, t],
  );

  const mainModules = availableModules.filter((module) => module.category === 'basic');
  const complementaryModules = availableModules.filter((module) => module.category === 'complementary');
  const aiModules = availableModules.filter((module) => module.category === 'ai');

  const favoriteModules = getFavoriteModules(availableModules);
  const safeLearningStep = clampOperationalJourneyStep(learningStep);
  const isOperationalJourneyVisible = learningModeActive && learningModeVisible;
  const operationalJourneyView = useMemo(
    () => buildOperationalJourneyView(safeLearningStep),
    [safeLearningStep],
  );
  const operationalModuleGroups = useMemo(
    () => buildOperationalModuleGroups(mainModules),
    [mainModules],
  );
  const activeOperationalStageId = isOperationalJourneyVisible
    ? operationalJourneyStages[safeLearningStep]?.id
    : undefined;

  const handleOperationalStageSelect = (stageId: OperationalJourneyStageId) => {
    const stageIndex = operationalJourneyStages.findIndex((stage) => stage.id === stageId);
    if (stageIndex >= 0) {
      setLearningStep(stageIndex);
    }
  };

  const handleOperationalStageAction = (stageId: OperationalJourneyStageId) => {
    const stageIndex = operationalJourneyStages.findIndex((stage) => stage.id === stageId);
    const stage = operationalJourneyStages[stageIndex];

    if (!stage) {
      return;
    }

    setLearningStep(stageIndex);
    onNavigate(stage.primaryRoute);
  };

  return (
    <main className="max-w-[1600px] mx-auto px-8 py-10 space-y-12">
      {isOperationalJourneyVisible && (
        <OperationalJourney
          copy={copy.operationalJourney}
          stages={operationalJourneyView}
          activeStageId={activeOperationalStageId}
          onStageSelect={handleOperationalStageSelect}
          onStageAction={handleOperationalStageAction}
          onDismiss={() => setLearningModeVisible(false)}
        />
      )}

      {!isOperationalJourneyVisible && (
        <KpiSection
          title={copy.sections.kpis}
          kpis={kpiData}
          availableKPIs={availableKPIs}
          defaultKPIIds={defaultDashboardKpiIds}
          copy={copy}
          selectedKPIIds={selectedKPIIds}
          isConfigOpen={isKPIConfigOpen}
          onOpenConfig={() => setIsKPIConfigOpen(true)}
          onCloseConfig={() => setIsKPIConfigOpen(false)}
          onSave={handleSaveKPIs}
        />
      )}

      <FavoritesSection
        title={copy.sections.favorites}
        quickAccessLabel={copy.sections.quickAccess}
        modules={favoriteModules}
        onToggleFavorite={toggleFavorite}
        onModuleClick={handleModuleClick}
      />

      {isOperationalJourneyVisible ? (
        <OperationalModulesSection
          title={copy.operationalModules.title}
          label={copy.operationalModules.label}
          copy={copy.operationalJourney}
          groups={operationalModuleGroups}
          activeStageId={activeOperationalStageId}
          favoriteIds={favorites}
          onToggleFavorite={toggleFavorite}
          onModuleClick={handleModuleClick}
        />
      ) : (
        <ModuleSection
          icon="🏢"
          title={copy.sections.basicModules}
          label={copy.sections.main}
          modules={mainModules}
          favoriteIds={favorites}
          onToggleFavorite={toggleFavorite}
          onModuleClick={handleModuleClick}
          singleRow
        />
      )}

      <ModuleSection
        icon="🔧"
        title={copy.sections.complementaryModules}
        label={copy.sections.additional}
        modules={complementaryModules}
        favoriteIds={favorites}
        onToggleFavorite={toggleFavorite}
        onModuleClick={handleModuleClick}
        singleRow
      />

      <ModuleSection
        icon="🤖"
        title={copy.sections.aiModules}
        label={copy.sections.aiLabel}
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
