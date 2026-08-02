import { AlertTriangle, ArrowUpRight, Scale, Ticket } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';
import type { PosKpiAnalytics } from '../utils/posKpiAnalytics';

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function StatusPill({ label, tone }: { label: string; tone: 'green' | 'red' | 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-900',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900',
    red: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:border-rose-900',
  };

  return <span className={cn('rounded-full border px-3 py-1 text-xs font-medium', tones[tone])}>{label}</span>;
}

function ProgressLine({ danger = false, value }: { danger?: boolean; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={cn('h-full rounded-full', danger ? 'bg-rose-500' : 'bg-[#FF6B5E]')} style={{ width: `${Math.min(Math.max(value, 2), 100)}%` }} />
      </div>
      <span className="w-12 text-right text-sm font-medium text-slate-900 dark:text-white">{percent(value)}</span>
    </div>
  );
}

export function PosKpiSignals({
  analytics,
  insight,
}: {
  analytics: PosKpiAnalytics;
  insight: { text: string; tone: 'info' | 'risk' | 'success' };
}) {
  const cashAccuracy = analytics.totalCashSales > 0
    ? Math.max(0, 100 - analytics.overShortRate)
    : analytics.closings > 0 ? 100 : 0;
  const hasRisk = insight.tone === 'risk';

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-950 dark:text-white">Senales ejecutivas POS</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Lectura de caja, tickets y estabilidad operativa del periodo.</p>
        </div>
        <StatusPill label={hasRisk ? 'Requiere revision' : analytics.closings > 0 ? 'Operativo' : 'Sin cierres'} tone={hasRisk ? 'red' : analytics.closings > 0 ? 'green' : 'blue'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-5 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium text-slate-700 dark:text-slate-200">Precision de caja</p>
            <Scale className="h-5 w-5 text-[#B63B32] dark:text-[#FFB0AA]" />
          </div>
          <p className="mb-4 text-3xl font-medium text-slate-950 dark:text-white">{percent(cashAccuracy)}</p>
          <ProgressLine value={cashAccuracy} danger={hasRisk} />
        </div>

        <div className="rounded-lg border border-slate-200 p-5 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium text-slate-700 dark:text-slate-200">Tickets cerrados</p>
            <Ticket className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
          </div>
          <p className="mb-4 text-3xl font-medium text-slate-950 dark:text-white">{analytics.tickets}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{analytics.closings} cierres alimentan la lectura.</p>
        </div>

        <div className="rounded-lg border border-slate-200 p-5 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium text-slate-700 dark:text-slate-200">Lectura ejecutiva</p>
            {hasRisk ? <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-300" /> : <ArrowUpRight className="h-5 w-5 text-blue-600 dark:text-blue-300" />}
          </div>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{insight.text}</p>
        </div>
      </div>
    </section>
  );
}
