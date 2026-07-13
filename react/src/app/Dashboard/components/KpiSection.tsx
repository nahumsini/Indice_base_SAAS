import { Settings } from 'lucide-react';
import { KPIConfiguration } from '../../components/KPIConfiguration';
import { KPICard } from '../../components/KPICard';
import { KPICarousel } from '../../components/KPICarousel';
import { Button } from '../../components/ui/button';
import type { KPIItem } from '../../components/KPIConfiguration';
import type { DashboardKpiCardData } from '../dashboardData';
import type { MainDashboardTranslations } from '../translations';

interface KpiSectionProps {
  title: string;
  kpis: DashboardKpiCardData[];
  availableKPIs: KPIItem[];
  defaultKPIIds: readonly string[];
  copy: Pick<MainDashboardTranslations, 'kpiEmptyState' | 'kpiConfiguration'>;
  selectedKPIIds: string[];
  isConfigOpen: boolean;
  onOpenConfig: () => void;
  onCloseConfig: () => void;
  onSave: (kpis: string[]) => void;
}

export function KpiSection({
  title,
  kpis,
  availableKPIs,
  defaultKPIIds,
  copy,
  selectedKPIIds,
  isConfigOpen,
  onOpenConfig,
  onCloseConfig,
  onSave,
}: KpiSectionProps) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            <span className="text-lg leading-none" aria-hidden="true">📊</span>
            <span>{title}</span>
          </h2>
          {kpis.length > 0 && (
            <span className="bg-[#2563EB] text-white text-sm font-medium px-3 py-1 rounded-full">
              {kpis.length}
            </span>
          )}
        </div>
        <KPIConfiguration
          isOpen={isConfigOpen}
          onOpen={onOpenConfig}
          onClose={onCloseConfig}
          selectedKPIIds={selectedKPIIds}
          onSave={onSave}
          availableKPIs={availableKPIs}
          defaultKPIIds={defaultKPIIds}
          copy={copy.kpiConfiguration}
        />
      </div>
      {kpis.length > 0 ? (
        <KPICarousel mode="carousel">
          {kpis.map((kpi, index) => (
            <KPICard key={kpi.id ?? index} {...kpi} kpiId={kpi.id} />
          ))}
        </KPICarousel>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {copy.kpiEmptyState.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {copy.kpiEmptyState.description}
          </p>
          <Button
            onClick={onOpenConfig}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
          >
            <Settings className="h-4 w-4 mr-2" />
            {copy.kpiEmptyState.action}
          </Button>
        </div>
      )}
    </section>
  );
}
