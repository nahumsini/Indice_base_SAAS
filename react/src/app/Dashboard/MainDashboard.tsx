import { useMemo, useState } from "react";
import {
  sortBasicModulesForOperationalLauncher,
  type DashboardModuleCard,
} from "../config/moduleCatalog";
import type { PageId } from "../config/navigation";
import { useAccessibleModuleCatalog } from "../hooks/useAccessibleModuleCatalog";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { useFavorites, useLanguage } from "../shared/context";
import { FavoritesSection } from "./components/FavoritesSection";
import { KpiSection } from "./components/KpiSection";
import { LearningCharacterSection } from "./components/LearningCharacterSection";
import { ModuleSection } from "./components/ModuleSection";
import { OperationalJourney } from "./components/OperationalJourney";
import { OperationalModulesSection } from "./components/OperationalModulesSection";
import {
  buildDashboardAvailableKpis,
  defaultDashboardKpiIds,
} from "./dashboardData";
import { useDashboardLiveKpis } from "./hooks/useDashboardLiveKpis";
import { useMainDashboardTranslations } from "./hooks/useMainDashboardTranslations";
import {
  buildOperationalJourneyView,
  buildOperationalModuleGroups,
  clampOperationalJourneyStep,
  operationalJourneyStages,
  type OperationalJourneyStageId,
} from "./operationalJourney";
import {
  learningCharacterIds,
  learningCharacterStorageKey,
  type LearningCharacterId,
} from "./learningCharacters";

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
  const { currentLanguage, t } = useLanguage();
  const copy = useMainDashboardTranslations();
  const { favorites, toggleFavorite, getFavoriteModules } = useFavorites();
  const [isKPIConfigOpen, setIsKPIConfigOpen] = useState(false);
  const availableModules = useAccessibleModuleCatalog(t);
  const [selectedLearningCharacter, setSelectedLearningCharacter] =
    useLocalStorageState<LearningCharacterId | null>(
      learningCharacterStorageKey,
      null,
    );
  const [selectedKPIIds, setSelectedKPIIds] = useLocalStorageState<string[]>(
    "indice.dashboard.selectedKpis",
    [...defaultDashboardKpiIds],
  );

  const handleSaveKPIs = (kpis: string[]) => {
    setSelectedKPIIds(kpis);
  };

  const handleModuleClick = (moduleRoute: PageId) => {
    onNavigate(moduleRoute);
  };

  const liveKpiDataMap = useDashboardLiveKpis(copy, currentLanguage.code);
  const kpiData = useMemo(
    () =>
      selectedKPIIds.flatMap((id) => {
        const kpi = liveKpiDataMap[id];
        return kpi ? [{ ...kpi, id }] : [];
      }),
    [liveKpiDataMap, selectedKPIIds],
  );
  const availableKPIs = useMemo(
    () =>
      buildDashboardAvailableKpis(copy, {
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

  const mainModules = useMemo(
    () => availableModules.filter((module) => module.category === "basic"),
    [availableModules],
  );
  const operationalLauncherModules = useMemo(
    () => sortBasicModulesForOperationalLauncher(mainModules),
    [mainModules],
  );
  const standardBasicModules = operationalLauncherModules;
  const complementaryModules = useMemo(
    () =>
      availableModules.filter((module) => module.category === "complementary"),
    [availableModules],
  );
  const aiModules = useMemo(
    () => availableModules.filter((module) => module.category === "ai"),
    [availableModules],
  );

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
  const operationalJourneyModules = useMemo(
    () =>
      operationalModuleGroups.reduce<
        Partial<Record<OperationalJourneyStageId, DashboardModuleCard[]>>
      >(
        (groupsByStage, group) => ({
          ...groupsByStage,
          [group.stage.id]: group.modules,
        }),
        {},
      ),
    [operationalModuleGroups],
  );
  const activeOperationalStageId = isOperationalJourneyVisible
    ? operationalJourneyStages[safeLearningStep]?.id
    : undefined;
  const safeSelectedLearningCharacter =
    selectedLearningCharacter &&
    learningCharacterIds.includes(selectedLearningCharacter)
      ? selectedLearningCharacter
      : null;

  const handleOperationalStageSelect = (stageId: OperationalJourneyStageId) => {
    const stageIndex = operationalJourneyStages.findIndex(
      (stage) => stage.id === stageId,
    );
    if (stageIndex >= 0) {
      setLearningStep(stageIndex);
    }
  };

  return (
    <main className="mx-auto max-w-[1600px] space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {isOperationalJourneyVisible && (
        <OperationalJourney
          copy={copy.operationalJourney}
          stages={operationalJourneyView}
          stageModules={operationalJourneyModules}
          activeStageId={activeOperationalStageId}
          onStageSelect={handleOperationalStageSelect}
          onModuleClick={handleModuleClick}
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

      {!isOperationalJourneyVisible && (
        <FavoritesSection
          title={copy.sections.favorites}
          quickAccessLabel={copy.sections.quickAccess}
          modules={favoriteModules}
          onToggleFavorite={toggleFavorite}
          onModuleClick={handleModuleClick}
        />
      )}

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
          icon="⚙️"
          title={copy.sections.basicModules}
          label={copy.sections.main}
          modules={standardBasicModules}
          favoriteIds={favorites}
          onToggleFavorite={toggleFavorite}
          onModuleClick={handleModuleClick}
          singleRow
        />
      )}

      {isOperationalJourneyVisible && (
        <LearningCharacterSection
          copy={copy.operationalJourney.characters}
          selectedCharacterId={safeSelectedLearningCharacter}
          onCharacterSelect={setSelectedLearningCharacter}
        />
      )}

      <ModuleSection
        icon="🧰"
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
      />
    </main>
  );
}
