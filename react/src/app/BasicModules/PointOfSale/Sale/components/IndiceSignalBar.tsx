import { Activity, AlertTriangle, Archive, ShieldCheck, TrendingUp } from 'lucide-react';

interface IndiceSignalBarProps {
  salesTrendLabel: string;
  lowStockCount: number;
  suspendedCount: number;
  activeAlertCount: number;
  isShiftActive: boolean;
}

export function IndiceSignalBar({
  salesTrendLabel,
  lowStockCount,
  suspendedCount,
  activeAlertCount,
  isShiftActive,
}: IndiceSignalBarProps) {
  const stockSignal = lowStockCount === 0 ? 'stock estable' : `${lowStockCount} alerta${lowStockCount === 1 ? '' : 's'} de stock`;
  const ticketSignal = suspendedCount === 0 ? 'sin tickets pausados' : `${suspendedCount} ticket${suspendedCount === 1 ? '' : 's'} pausado${suspendedCount === 1 ? '' : 's'}`;

  return (
    <section className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm dark:border-blue-800 dark:bg-blue-900/20">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Activity className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Señal Indice</h3>
              <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold uppercase text-blue-700 shadow-sm dark:bg-gray-900 dark:text-blue-300">
                Control comercial
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Operacion legible: {salesTrendLabel}, {stockSignal}, {ticketSignal}, {activeAlertCount} señal{activeAlertCount === 1 ? '' : 'es'} activa{activeAlertCount === 1 ? '' : 's'}.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <SignalChip
            icon={ShieldCheck}
            label={isShiftActive ? 'Caja controlada' : 'Abrir turno'}
            tone={isShiftActive ? 'control' : 'risk'}
          />
          <SignalChip
            icon={lowStockCount > 0 ? AlertTriangle : Archive}
            label={lowStockCount > 0 ? 'Reponer' : 'Stock estable'}
            tone={lowStockCount > 0 ? 'risk' : 'control'}
          />
          <SignalChip icon={TrendingUp} label={salesTrendLabel} tone="opportunity" />
        </div>
      </div>
    </section>
  );
}

function SignalChip({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  tone: 'control' | 'risk' | 'opportunity';
}) {
  const toneClass = {
    control: 'border-blue-200 bg-white text-blue-700 dark:border-blue-800 dark:bg-gray-900 dark:text-blue-300',
    risk: 'border-red-200 bg-white text-red-700 dark:border-red-800 dark:bg-gray-900 dark:text-red-300',
    opportunity: 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-300',
  }[tone];

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${toneClass}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
