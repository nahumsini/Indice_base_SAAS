import { getFinanceBulkCopy } from './financeBulkActions.copy';

type AmountRow = { amount: number; currency: string };
export function sumNativeAmounts(rows: AmountRow[], emptyCurrency: string) {
  const totals = new Map<string, number>();
  rows.forEach(row => totals.set(row.currency, (totals.get(row.currency) ?? 0) + Math.round(row.amount * 100)));
  if (!totals.size) totals.set(emptyCurrency, 0);
  return Array.from(totals, ([currency, minor]) => ({ currency, amount: minor / 100 }));
}

export function FinanceSelectionTotals({ rows, selected, locale, currency }: {
  rows: AmountRow[]; selected: AmountRow[]; locale: string; currency: string;
}) {
  const copy = getFinanceBulkCopy(locale);
  const render = (values: AmountRow[], label: string, highlighted = false) => <div className={`flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-xs font-medium ${highlighted ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200' : 'text-slate-500'}`}>
    <span>{label}</span><div className="flex flex-wrap gap-2">{sumNativeAmounts(values, currency).map(total => <span key={total.currency} className="rounded-xl border bg-white px-3 py-2 shadow-sm dark:bg-slate-900">
      {copy.total} <strong className="ml-2 tabular-nums">{new Intl.NumberFormat(locale, { style: 'currency', currency: total.currency, currencyDisplay: 'code' }).format(total.amount)}</strong>
    </span>)}</div>
  </div>;
  return <>{render(rows, copy.filtered)}{selected.length > 0 && render(selected, `${selected.length} ${copy.selected} · ${copy.selectedTotal}`, true)}</>;
}
