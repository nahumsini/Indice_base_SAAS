import { Settings } from 'lucide-react';
import { KPIConfiguration } from '../../components/KPIConfiguration';
import { KPICard } from '../../components/KPICard';
import { KPICarousel } from '../../components/KPICarousel';
import { Button } from '../../components/ui/button';
import type { DashboardKpiCardData } from '../dashboardData';

interface KpiSectionProps {
  title: string;
  kpis: DashboardKpiCardData[];
  selectedKPIIds: string[];
  isConfigOpen: boolean;
  onOpenConfig: () => void;
  onCloseConfig: () => void;
  onSave: (kpis: string[]) => void;
}

export function KpiSection({
  title,
  kpis,
  selectedKPIIds,
  isConfigOpen,
  onOpenConfig,
  onCloseConfig,
  onSave,
}: KpiSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            📊 {title}
          </h2>
          {kpis.length > 0 && (
            <span className="bg-[#558DBD] text-white text-sm font-medium px-3 py-1 rounded-full">
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
        />
      </div>
      {kpis.length > 0 ? (
        <KPICarousel>
          {kpis.map((kpi, index) => (
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
            onClick={onOpenConfig}
            className="bg-[#558DBD] hover:bg-[#4a7aa8] text-white"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure KPIs
          </Button>
        </div>
      )}
    </section>
  );
}
