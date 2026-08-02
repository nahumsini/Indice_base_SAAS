import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { BudgetHealthStatus } from '../../types/finance-status.types';
import type {
  FinancialOverviewAlert,
  FinancialOverviewConcentrationRisk,
  FinancialOverviewCostDriverType,
  FinancialOverviewMetrics,
} from '../../types/financial-overview.types';
import type { FinanceCurrency } from '../../types/finance-domain.types';
import type { FinanceLocale, FinanceTranslations } from '../../translations';
import { formatKpiCurrency, formatKpiPercent } from '../../KPIs/kpiUtils';
import { cn } from '../../../../components/ui/utils';
import { KpiEmptyState } from './KpiPanelParts';

const signalToneClasses = {
  critical: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
  info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
};

export function ExecutiveSignalList({ alerts, emptyMessage }: { alerts: FinancialOverviewAlert[]; emptyMessage: string }) {
  if (alerts.length === 0) return <KpiEmptyState message={emptyMessage} />;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
      {alerts.slice(0, 5).map(alert => (
        <article key={alert.id} className={cn('rounded-xl border p-4', signalToneClasses[alert.tone])}>
          <div className="mb-2 flex items-center gap-2">
            {alert.tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <p className="text-xs font-medium">{alert.title}</p>
          </div>
          <p className="text-sm font-medium leading-5">{alert.message}</p>
        </article>
      ))}
    </div>
  );
}

export function ConcentrationRiskList({
  currency,
  emptyMessage,
  labels,
  locale = 'en-CA',
  risks,
}: {
  currency: FinanceCurrency;
  emptyMessage: string;
  labels: Record<FinancialOverviewCostDriverType, string>;
  locale?: FinanceLocale;
  risks: FinancialOverviewConcentrationRisk[];
}) {
  if (risks.length === 0) return <KpiEmptyState message={emptyMessage} />;

  return (
    <div className="space-y-3">
      {risks.slice(0, 4).map(risk => (
        <article key={`${risk.driverType}-${risk.id}`} className={cn('rounded-xl border p-4', signalToneClasses[risk.tone])}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium opacity-80">{labels[risk.driverType]}</p>
              <p className="mt-1 truncate text-sm font-medium">{risk.name}</p>
            </div>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-900/40 dark:text-slate-100">
              {formatKpiPercent(risk.percentage)}
            </span>
          </div>
          <p className="mt-3 text-sm font-medium">{formatKpiCurrency(risk.total, currency, locale)}</p>
        </article>
      ))}
    </div>
  );
}

export function FinancialSummaryCard({
  budgetHealthRows,
  concentrationRisks,
  copy,
  metrics,
}: {
  budgetHealthRows: Array<{ healthStatus: BudgetHealthStatus }>;
  concentrationRisks: FinancialOverviewConcentrationRisk[];
  copy: FinanceTranslations['kpis']['summaryCopy'];
  metrics: FinancialOverviewMetrics;
}) {
  const lines = buildSummaryLines({ budgetHealthRows, concentrationRisks, copy, metrics });

  return (
    <div className="space-y-3">
      {lines.map(line => (
        <div key={line} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#147514] dark:text-emerald-300" />
          <p className="text-sm font-medium leading-5 text-slate-700 dark:text-slate-200">{line}</p>
        </div>
      ))}
    </div>
  );
}

function buildSummaryLines({
  budgetHealthRows,
  concentrationRisks,
  copy,
  metrics,
}: {
  budgetHealthRows: Array<{ healthStatus: BudgetHealthStatus }>;
  concentrationRisks: FinancialOverviewConcentrationRisk[];
  copy: FinanceTranslations['kpis']['summaryCopy'];
  metrics: FinancialOverviewMetrics;
}) {
  const hasExceededBudget = budgetHealthRows.some(row => row.healthStatus === BudgetHealthStatus.EXCEEDED);
  const hasWarningBudget = budgetHealthRows.some(row => row.healthStatus === BudgetHealthStatus.WARNING);
  const availablePercent = metrics.planned > 0 ? Math.max(0, (metrics.available / metrics.planned) * 100) : 0;
  const lines: string[] = [];

  if (metrics.planned <= 0) lines.push(copy.noBudget);
  else if (hasExceededBudget) lines.push(copy.budgetExceeded);
  else if (hasWarningBudget) lines.push(copy.budgetWarning);
  else lines.push(copy.budgetStable);

  if (metrics.planned > 0) lines.push(copy.budgetAvailable(formatKpiPercent(availablePercent)));
  lines.push(metrics.overdueExpenseCount > 0 ? copy.overdue(metrics.overdueExpenseCount) : copy.noOverdue);

  if (metrics.unpaidExpenseCount > 0) lines.push(copy.unpaid(metrics.unpaidExpenseCount));

  const materialRisks = concentrationRisks.filter(risk => risk.percentage > 50);
  if (materialRisks.length > 0) {
    lines.push(copy.concentration(materialRisks[0].name, materialRisks[1]?.name));
  }

  return lines.slice(0, 4);
}
