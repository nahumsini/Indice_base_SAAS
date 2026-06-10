import { Banknote, Calculator, CheckCircle, Receipt, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CashAuditKpis } from '../types/cashAudit.types';

interface CashAuditKpiStripProps {
  kpis: CashAuditKpis;
  formatCurrency: (amount: number) => string;
}

export function CashAuditKpiStrip({ kpis, formatCurrency }: CashAuditKpiStripProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard icon={Receipt} label="Ventas" value={formatCurrency(kpis.totalSales)} />
      <KpiCard icon={Calculator} label="Esperado" value={formatCurrency(kpis.expectedTotal)} />
      <KpiCard icon={Banknote} label="Contado" value={formatCurrency(kpis.countedTotal)} />
      <KpiCard
        icon={Scale}
        label="Diferencia neta"
        value={`${kpis.netDifference > 0 ? '+' : ''}${formatCurrency(kpis.netDifference)}`}
        tone={Math.abs(kpis.netDifference) < 1 ? 'green' : kpis.netDifference > 0 ? 'blue' : 'red'}
      />
      <KpiCard icon={CheckCircle} label="Cierres" value={String(kpis.closings)} />
      <KpiCard icon={CheckCircle} label="Balanceados" value={String(kpis.balanced)} tone="green" />
      <KpiCard icon={TrendingUp} label="Sobrantes" value={String(kpis.over)} tone="blue" />
      <KpiCard icon={TrendingDown} label="Faltantes" value={String(kpis.short)} tone="red" />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone = 'gray',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: 'gray' | 'green' | 'blue' | 'red';
}) {
  const toneClasses = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }[tone];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClasses}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
          <p className="truncate text-xl font-black text-gray-950 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
