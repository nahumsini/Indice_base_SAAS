import { DashboardSectionHeading } from './DashboardSectionHeading';
import { IndiceEmoji } from '../../components/icons/ModuleTabEmoji';
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
  description: string;
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
  description,
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
      <DashboardSectionHeading
        title={title}
        description={description}
        icon={<IndiceEmoji name="chart" className="size-8" />}
        count={kpis.length}
        action={
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
        }
      />
      {kpis.length > 0 ? (
        <KPICarousel mode="carousel" compactCards dashboardSpacing>
          {kpis.map((kpi, index) => (
            <KPICard
              key={kpi.id ?? index}
              {...kpi}
              kpiId={kpi.id}
              presentation="portrait"
              moduleLabel={availableKPIs.find((item) => item.id === kpi.id)?.module}
            />
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
