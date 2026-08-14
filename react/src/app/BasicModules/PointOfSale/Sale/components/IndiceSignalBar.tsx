import { AlertTriangle, CheckCircle2 } from 'lucide-react';

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
  const hasAttention = lowStockCount > 0 || suspendedCount > 0 || activeAlertCount > 0 || !isShiftActive;

  if (!hasAttention) {
    return (
      <div className="inline-flex min-h-9 w-fit items-center gap-2 rounded-full border border-[#FF6B5E]/25 bg-[#59C3A5]/10 px-3 text-xs font-medium text-[#14745F] dark:border-[#FF6B5E]/30 dark:text-[#9DE7D3]">
        <CheckCircle2 className="h-4 w-4" /> Operación estable · {salesTrendLabel}
      </div>
    );
  }

  const signals = [
    !isShiftActive ? 'turno pendiente' : '',
    lowStockCount > 0 ? `${lowStockCount} producto${lowStockCount === 1 ? '' : 's'} con stock bajo` : '',
    suspendedCount > 0 ? `${suspendedCount} ticket${suspendedCount === 1 ? '' : 's'} pausado${suspendedCount === 1 ? '' : 's'}` : '',
    activeAlertCount > 0 ? `${activeAlertCount} alerta${activeAlertCount === 1 ? '' : 's'} activa${activeAlertCount === 1 ? '' : 's'}` : '',
  ].filter(Boolean);

  return (
    <div className="flex min-h-10 items-center gap-2 rounded-lg border border-[#F4C84A]/50 bg-[#F4C84A]/10 px-3 text-sm font-normal text-[#715400] dark:text-[#F4C84A]">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{signals.join(' · ')}</span>
    </div>
  );
}
