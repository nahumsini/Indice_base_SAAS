import { BarChart3, CreditCard, Package, Users, Wallet, type LucideIcon } from 'lucide-react';
import type { PosKpiAnalytics } from '../utils/posKpiAnalytics';

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-500 dark:bg-slate-950 dark:text-slate-400">{text}</p>;
}

export function PosKpiOperatingPanels({
  analytics,
  formatCurrency,
  maxHourlySales,
  paymentBreakdownNote,
  preferredCurrency,
}: {
  analytics: PosKpiAnalytics;
  formatCurrency: (amount: number) => string;
  maxHourlySales: number;
  paymentBreakdownNote: string;
  preferredCurrency: string;
}) {
  return (
    <>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <HourlySalesChart rows={analytics.hourlySales} max={maxHourlySales} formatCurrency={formatCurrency} />
        <PaymentMixPanel rows={analytics.paymentMix} formatCurrency={formatCurrency} note={paymentBreakdownNote} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <TopList title="Cajas con venta" icon={Users} rows={analytics.topCashRegisters} formatValue={formatCurrency} emptyText="Sin cierres por caja en el periodo" />
        <TopList title="Almacenes POS" icon={Package} rows={analytics.topWarehouses} formatValue={formatCurrency} emptyText="Sin cierres por almacen en el periodo" />
        <CurrencyPanel totals={analytics.currencyTotals} formatCurrency={formatCurrency} primaryCurrency={preferredCurrency} />
      </section>
    </>
  );
}

function HourlySalesChart({ rows, max, formatCurrency }: {
  rows: Array<{ hour: string; sales: number }>;
  max: number;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-950 dark:text-white">Ventas por cierre</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Ritmo operativo segun hora de arqueo.</p>
        </div>
        <BarChart3 className="h-5 w-5 text-[#B63B32] dark:text-[#FFB0AA]" />
      </div>
      {rows.length === 0 ? (
        <EmptyText text="Sin cierres de caja en el periodo." />
      ) : (
        <div className="flex h-72 items-end gap-3">
          {rows.map((entry) => (
            <div key={entry.hour} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end rounded-xl bg-slate-50 px-2 dark:bg-slate-950">
                <div
                  className="w-full rounded-t-lg bg-[#FF6B5E] transition-all hover:bg-[#E85C50]"
                  style={{ height: `${Math.max(8, max > 0 ? (entry.sales / max) * 100 : 0)}%` }}
                  title={formatCurrency(entry.sales)}
                />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{entry.hour}:00</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentMixPanel({ rows, formatCurrency, note }: {
  rows: Array<{ method: string; amount: number; percentage: number }>;
  formatCurrency: (amount: number) => string;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-[#B63B32] dark:text-[#FFB0AA]" />
        <h3 className="text-lg font-medium text-slate-950 dark:text-white">Mezcla de pago</h3>
      </div>
      {rows.length === 0 ? <EmptyText text="Sin pagos registrados en el periodo." /> : (
        <div className="space-y-4">
          {rows.map((payment) => (
            <div key={payment.method}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-200">{payment.method}</span>
                <span className="text-slate-500 dark:text-slate-400">{formatCurrency(payment.amount)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-[#FF6B5E]" style={{ width: `${payment.percentage}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{payment.percentage}% cobrado</p>
            </div>
          ))}
        </div>
      )}
      {note ? <p className="mt-4 rounded-xl bg-[#FF6B5E]/10 p-3 text-xs font-medium text-[#B63B32] dark:text-[#FFB0AA]">{note}</p> : null}
    </div>
  );
}

function TopList({ title, icon: Icon, rows, formatValue, emptyText }: {
  title: string;
  icon: LucideIcon;
  rows: Array<{ name: string; value: number; detail: string }>;
  formatValue: (value: number) => string;
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-[#B63B32] dark:text-[#FFB0AA]" />
        <h3 className="text-lg font-medium text-slate-950 dark:text-white">{title}</h3>
      </div>
      {rows.length === 0 ? <EmptyText text={emptyText} /> : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF6B5E]/10 text-sm font-medium text-[#B63B32] dark:text-[#FFB0AA]">{index + 1}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{row.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{row.detail}</p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-medium text-slate-950 dark:text-white">{formatValue(row.value)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CurrencyPanel({ totals, formatCurrency, primaryCurrency }: {
  totals: Array<{ currency: string; amount: number }>;
  formatCurrency: (amount: number) => string;
  primaryCurrency: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-[#B63B32] dark:text-[#FFB0AA]" />
        <h3 className="text-lg font-medium text-slate-950 dark:text-white">Divisas POS</h3>
      </div>
      <div className="space-y-3">
        {totals.length === 0 ? <EmptyText text="Sin divisas registradas en el periodo." /> : totals.map((total) => (
          <div key={total.currency} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
            <span className="text-sm font-medium text-slate-950 dark:text-white">{total.currency}</span>
            <span className="text-sm font-medium text-slate-950 dark:text-white">
              {total.currency === primaryCurrency ? formatCurrency(total.amount) : `${total.amount.toLocaleString('es-MX')} ${total.currency}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
