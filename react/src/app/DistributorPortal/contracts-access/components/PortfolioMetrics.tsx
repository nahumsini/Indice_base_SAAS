import { AlertTriangle, Building2, FileCheck2, FlaskConical, Telescope } from 'lucide-react';
import type { DistributorPortfolioSummary } from '../types/contractsAccess';
import type { DistributorPortalCopy } from '../translations';

const metrics = [
  { key: 'total_clients', label: 'totalClients', icon: Building2, tone: 'bg-blue-50 text-[#2563EB]' },
  { key: 'prospects', label: 'prospects', icon: Telescope, tone: 'bg-amber-50 text-amber-600' },
  { key: 'demos_and_trials', label: 'demosTrials', icon: FlaskConical, tone: 'bg-violet-50 text-violet-600' },
  { key: 'active_contracts', label: 'activeContracts', icon: FileCheck2, tone: 'bg-emerald-50 text-[#177D66]' },
  { key: 'attention_required', label: 'attention', icon: AlertTriangle, tone: 'bg-rose-50 text-rose-600' },
] as const;

export function PortfolioMetrics({ copy, summary }: { copy: DistributorPortalCopy; summary: DistributorPortfolioSummary }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label={copy.filters.title}>
      {metrics.map(({ key, label, icon: Icon, tone }) => (
        <article key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{copy.metrics[label]}</p>
              <p className="mt-0.5 text-2xl font-semibold text-slate-950 dark:text-white">{summary[key]}</p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
