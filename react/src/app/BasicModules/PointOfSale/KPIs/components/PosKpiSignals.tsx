import { AlertTriangle, CircleDollarSign, RefreshCw, RotateCcw } from 'lucide-react';
import type { PosKpiAnalytics } from '../utils/posKpiAnalytics';
import type { PosKpiCopy } from '../posKpiTranslations';

export function PosKpiSignals({
  analytics,
  copy,
  dataPartial,
  formatCurrency,
}: {
  analytics: PosKpiAnalytics;
  copy: PosKpiCopy;
  dataPartial: boolean;
  formatCurrency: (value: number) => string;
}) {
  const alerts = [
    dataPartial ? {
      icon: RefreshCw,
      title: copy.alerts.partialTitle,
      text: copy.alerts.partialText,
    } : null,
    analytics.absoluteDifference >= 1 ? {
      icon: CircleDollarSign,
      title: copy.alerts.differenceTitle,
      text: copy.alerts.differenceText(formatCurrency(analytics.shortage), formatCurrency(analytics.overage)),
    } : null,
    analytics.refundRate >= 5 ? {
      icon: RotateCcw,
      title: copy.alerts.refundTitle,
      text: copy.alerts.refundText(analytics.refundRate.toFixed(1)),
    } : null,
    analytics.cashAccuracy !== null && analytics.cashAccuracy < 99.5 ? {
      icon: AlertTriangle,
      title: copy.alerts.accuracyTitle,
      text: copy.alerts.accuracyText(analytics.cashAccuracy.toFixed(1)),
    } : null,
  ].filter(Boolean) as Array<{
    icon: typeof AlertTriangle;
    text: string;
    title: string;
  }>;

  if (alerts.length === 0) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900 dark:bg-amber-950/20">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.alerts.title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">{copy.alerts.subtitle}</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {alerts.map(({ icon: Icon, text, title }) => (
          <article key={title} className="flex gap-3 rounded-xl border border-amber-200 bg-white p-4 dark:border-amber-900 dark:bg-slate-900">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h4 className="font-medium text-slate-950 dark:text-white">{title}</h4>
              <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
