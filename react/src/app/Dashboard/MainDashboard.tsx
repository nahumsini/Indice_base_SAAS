import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import { KPIConfiguration } from '../components/KPIConfiguration';
import { KPICard } from '../components/KPICard';
import { KPICarousel } from '../components/KPICarousel';
import { LearningModeBanner } from '../components/LearningModeBanner';
import { ModuleCard } from '../components/ModuleCard';
import { ModuleCarousel } from '../components/ModuleCarousel';
import { Button } from '../components/ui/button';
import {
  buildDefaultModuleCatalog,
  mapBackendModuleToCard,
  mergeDashboardModules,
  type DashboardModuleCard,
} from '../config/moduleCatalog';
import type { PageId } from '../config/navigation';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { useFavorites, useLanguage } from '../shared/context';
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

      {/* KPI section, visible only when learning mode is inactive */}
      {!isGuidedLearningVisible && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                📊 {t.sections.kpis}
              </h2>
              {kpiData.length > 0 && (
                <span className="bg-[#558DBD] text-white text-sm font-medium px-3 py-1 rounded-full">
                  {kpiData.length}
                </span>
              )}
            </div>
            <KPIConfiguration
              isOpen={isKPIConfigOpen}
              onOpen={() => setIsKPIConfigOpen(true)}
              onClose={() => setIsKPIConfigOpen(false)}
              selectedKPIIds={selectedKPIIds}
              onSave={handleSaveKPIs}
            />
          </div>
          {kpiData.length > 0 ? (
            <KPICarousel>
              {kpiData.map((kpi, index) => (
                <KPICard key={index} {...kpi} orderNumber={index + 1} />
              ))}
            </KPICarousel>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No KPIs configured
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Select the KPIs you want to display to get started.
              </p>
              <Button 
                onClick={() => setIsKPIConfigOpen(true)}
                className="bg-[#558DBD] hover:bg-[#4a7aa8] text-white"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure KPIs
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Favorites section, visible only when learning mode is inactive */}
      {!isGuidedLearningVisible && favoriteModules.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              ⭐ {t.sections.favorites}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.sections.quickAccess}</span>
          </div>
          <ModuleCarousel gridClasses="grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
            {favoriteModules.map((module, index) => (
              <ModuleCard
                key={index}
                {...module}
                isFavorite={true}
                onToggleFavorite={() => toggleFavorite(module.id)}
                onClick={() => handleModuleClick(module.route)}
                size="small"
              />
            ))}
          </ModuleCarousel>
        </section>
      )}

      {/* Main modules section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            🏢 {t.sections.basicModules}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.sections.main}</span>
        </div>
        <ModuleCarousel gridClasses="grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
          {mainModules.map((module, index) => (
            <ModuleCard
              key={index}
              {...module}
              isFavorite={favorites.includes(module.id)}
              onToggleFavorite={() => toggleFavorite(module.id)}
              onClick={() => handleModuleClick(module.route)}
              size="small"
              stepNumber={isGuidedLearningVisible ? index + 1 : undefined}
              isHighlighted={isGuidedLearningVisible && learningStep === index}
            />
          ))}
        </ModuleCarousel>
      </section>

      {/* Complementary modules section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            🔧 {t.sections.complementaryModules}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.sections.additional}</span>
        </div>
        <ModuleCarousel singleRow={true}>
          {complementaryModules.map((module, index) => (
            <ModuleCard
              key={index}
              {...module}
              isFavorite={favorites.includes(module.id)}
              onToggleFavorite={() => toggleFavorite(module.id)}
              onClick={() => handleModuleClick(module.route)}
              size="small"
            />
          ))}
        </ModuleCarousel>
      </section>

      {/* AI modules section */}
      <section className="pb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            🤖 {t.sections.aiModules}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.sections.aiLabel}</span>
        </div>
        <ModuleCarousel gridClasses="grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
          {aiModules.map((module, index) => (
            <ModuleCard
              key={index}
              {...module}
              isFavorite={favorites.includes(module.id)}
              onToggleFavorite={() => toggleFavorite(module.id)}
              onClick={() => handleModuleClick(module.route)}
              size="small"
            />
          ))}
        </ModuleCarousel>
      </section>
    </main>
  );
}
