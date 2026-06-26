import { AlertTriangle, ArrowRight, Inbox, ShieldCheck } from 'lucide-react';
import type { SupplierSubmission } from '../types/purchaseOrder.types';
import { formatMoney, numberFrom } from '../utils/purchaseOrderFormat';

export function SupplierSubmissionKpis({ submissions }: { submissions: SupplierSubmission[] }) {
  const pendingReview = submissions.filter((submission) => (
    ['SUBMITTED', 'IN_REVIEW', 'NEEDS_CLARIFICATION'].includes(submission.status)
  )).length;
  const approved = submissions.filter((submission) => (
    ['APPROVED', 'PARTIALLY_APPROVED'].includes(submission.status)
  )).length;
  const convertible = submissions.filter((submission) => (
    ['APPROVED', 'PARTIALLY_APPROVED'].includes(submission.status)
    && !submission.convertedPurchaseOrderId
    && submission.items.every((item) => item.productId)
    && numberFrom(submission.totalAmount) > 0
  )).length;
  const unresolvedItems = submissions.reduce((sum, submission) => (
    sum + submission.items.filter((item) => !item.productId).length
  ), 0);
  const valueByCurrency = Array.from(
    submissions.reduce((map, submission) => {
      const currency = submission.currencyCode || 'MXN';
      map.set(currency, (map.get(currency) ?? 0) + numberFrom(submission.totalAmount));
      return map;
    }, new Map<string, number>()),
  );
  const valueLabel = valueByCurrency.length === 0
    ? '$0'
    : valueByCurrency.map(([currency, total]) => formatMoney(total, currency)).join(' · ');

  return (
    <section className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={Inbox} label="Propuestas" value={String(submissions.length)} />
        <Kpi icon={ShieldCheck} label="En revision" value={String(pendingReview)} tone="amber" />
        <Kpi icon={ArrowRight} label="Listas para OC" value={String(convertible)} tone="blue" />
        <Kpi icon={AlertTriangle} label="Partidas sin ligar" value={String(unresolvedItems)} tone={unresolvedItems > 0 ? 'red' : 'gray'} />
        <Kpi icon={Inbox} label="Valor propuesto" value={valueLabel} />
      </div>
      <div className="rounded-[20px] border border-orange-100 bg-orange-50 px-5 py-4 text-sm font-semibold text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100">
        {pendingReview} propuestas requieren decision interna · {approved} aprobadas · {convertible} listas para convertirse en orden de compra.
      </div>
    </section>
  );
}

function Kpi({
  icon: Icon,
  label,
  tone = 'gray',
  value,
}: {
  icon: typeof Inbox;
  label: string;
  tone?: 'gray' | 'blue' | 'amber' | 'red';
  value: string;
}) {
  const tones = {
    gray: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200',
    red: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200',
  };
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="truncate text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
