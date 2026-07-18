import { AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';
import type { SalesKpisTranslations } from '../translations';

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function StatusPill({ label, tone = 'gray' }: { label: string; tone?: 'green' | 'red' | 'blue' | 'gray' }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900',
    red: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:border-rose-900',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-900',
    gray: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:border-slate-800',
  };

  return <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', tones[tone])}>{label}</span>;
}

function ProgressLine({ danger = false, value }: { danger?: boolean; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={cn('h-full rounded-full', danger ? 'bg-rose-500' : 'bg-[#FF6B5E]')} style={{ width: `${Math.min(Math.max(value, 2), 100)}%` }} />
      </div>
      <span className="w-10 text-right text-sm font-bold text-slate-900 dark:text-white">{percent(value)}</span>
    </div>
  );
}

export function SalesKpiSignals({
  activeCustomers,
  commercialRisk,
  copy,
  quoteApprovalRate,
  quoteConversionRate,
  quoteRejectionRate,
  totalContacts,
}: {
  activeCustomers: number;
  commercialRisk: number;
  copy: SalesKpisTranslations;
  quoteApprovalRate: number;
  quoteConversionRate: number;
  quoteRejectionRate: number;
  totalContacts: number;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">{copy.signals.title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.signals.subtitle}</p>
        </div>
        <StatusPill label={commercialRisk ? copy.signals.risk : copy.signals.stable} tone={commercialRisk ? 'red' : 'green'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-5 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold text-slate-700 dark:text-slate-200">{copy.signals.conversion}</p>
            <TrendingUp className="h-5 w-5 text-[#B63B32] dark:text-[#FFB0AA]" />
          </div>
          <p className="mb-4 text-3xl font-bold text-slate-950 dark:text-white">{percent(quoteConversionRate)}</p>
          <ProgressLine value={quoteConversionRate} danger={quoteConversionRate < 25} />
        </div>

        <div className="rounded-lg border border-slate-200 p-5 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold text-slate-700 dark:text-slate-200">{copy.cards.quoteApproval.label}</p>
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
          </div>
          <p className="mb-4 text-3xl font-bold text-slate-950 dark:text-white">{percent(quoteApprovalRate)}</p>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{copy.cards.quoteApproval.detail(percent(quoteRejectionRate))}</p>
          <ProgressLine value={quoteApprovalRate} danger={quoteApprovalRate < 40} />
        </div>

        <div className="rounded-lg border border-slate-200 p-5 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold text-slate-700 dark:text-slate-200">{copy.signals.commercialRisk}</p>
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-300" />
          </div>
          <p className="mb-4 text-3xl font-bold text-slate-950 dark:text-white">{commercialRisk}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.signals.commercialRiskDescription}</p>
          <p className="mt-2 text-xs font-semibold text-slate-400 dark:text-slate-500">{copy.cards.contacts.detail(activeCustomers)} / {totalContacts}</p>
        </div>
      </div>
    </section>
  );
}
