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
  status?: 'loading' | 'ready' | 'error';
  statusCopy?: { loading: string; failed: string; retry: string };
  onRetry?: () => void;
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
  status = 'ready',
  statusCopy,
  onRetry,
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
        count={status === 'ready' ? kpis.length : undefined}
        action={
          <fieldset disabled={status !== 'ready'} className="min-w-0">
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
          </fieldset>
        }
      />
      {status === 'loading' ? (
        <div role="status" aria-busy="true" aria-label={statusCopy?.loading}>
          <span className="sr-only">{statusCopy?.loading}</span>
          <KPICarousel mode="carousel" compactCards dashboardSpacing>
            {[0, 1, 2].map(index => <div key={index} aria-hidden="true" className="aspect-[11/12] w-[200px] shrink-0 snap-center rounded-2xl border border-slate-200 bg-slate-100 motion-safe:animate-pulse dark:border-slate-700 dark:bg-slate-800" />)}
          </KPICarousel>
        </div>
      ) : status === 'error' ? (
        <div role="alert" className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-700 dark:text-slate-200">{statusCopy?.failed}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={onRetry}>{statusCopy?.retry}</Button>
        </div>
      ) : kpis.length > 0 ? (
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
