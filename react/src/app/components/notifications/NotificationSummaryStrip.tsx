import { ArrowRight, AlertTriangle, Bell, CheckCircle2, CircleDot } from 'lucide-react';
import { Button } from '../ui/button';

interface NotificationSummaryStripProps {
  totalCount: number;
  unreadCount: number;
  urgentCount: number;
  actionableCount: number;
  onShowUrgent: () => void;
  copy: {
    total: string;
    unread: string;
    urgent: string;
    actionable: string;
    attentionInsight: string;
    calmInsight: string;
    viewUrgent: string;
  };
}

export function NotificationSummaryStrip({
  totalCount,
  unreadCount,
  urgentCount,
  actionableCount,
  onShowUrgent,
  copy,
}: NotificationSummaryStripProps) {
  const metrics = [
    {
      label: copy.total,
      value: totalCount,
      icon: Bell,
      tone: 'bg-[var(--indice-brand-soft)]/75 text-[var(--indice-brand-text)] dark:bg-[var(--indice-brand-primary)]/15 dark:text-[var(--indice-brand-text-dark)]',
    },
    { label: copy.unread, value: unreadCount, icon: CircleDot, tone: 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200' },
    { label: copy.urgent, value: urgentCount, icon: AlertTriangle, tone: 'bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-200' },
    { label: copy.actionable, value: actionableCount, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200' },
  ];

  return (
    <section aria-label={copy.total} className="space-y-3">
      <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="flex min-h-20 items-center gap-3 rounded-xl px-3 py-2.5">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${metric.tone}`}>
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{metric.label}</p>
                <p className="mt-0.5 text-2xl font-semibold leading-none text-slate-950 dark:text-white">{metric.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${urgentCount > 0 ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100' : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100'}`}>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/75 shadow-sm dark:bg-white/10">
            {urgentCount > 0
              ? <AlertTriangle className="h-[18px] w-[18px]" aria-hidden="true" />
              : <CheckCircle2 className="h-[18px] w-[18px]" aria-hidden="true" />}
          </span>
          <p className="text-sm font-medium">
            {urgentCount > 0 ? (
              <><strong className="font-semibold">{urgentCount} {copy.urgent.toLowerCase()}</strong> · {copy.attentionInsight}</>
            ) : copy.calmInsight}
          </p>
        </div>
        {urgentCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onShowUrgent}
            className="h-9 shrink-0 justify-center rounded-xl px-3 text-amber-900 hover:bg-white/70 hover:text-amber-950 dark:text-amber-100 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {copy.viewUrgent}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </section>
  );
}
