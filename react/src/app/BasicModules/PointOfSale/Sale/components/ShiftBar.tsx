import { Building2, Clock, DollarSign, LogOut, Monitor, RotateCcw, Store, TrendingUp, User } from 'lucide-react';
import { Shift } from '../types/shift.types';
import { useEffect, useState } from 'react';

interface ShiftBarProps {
  shift: Shift | null;
  onOpenCashMovement: () => void;
  onCloseShift: () => void;
  onOpenReturn?: () => void;
}

export function ShiftBar({ shift, onOpenCashMovement, onCloseShift, onOpenReturn }: ShiftBarProps) {
  const [elapsed, setElapsed] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: shift?.currencyCode || 'MXN',
    }).format(amount);
  };

  useEffect(() => {
    if (!shift) return;

    const updateElapsed = () => {
      const now = new Date().getTime();
      const diff = now - shift.startTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setElapsed(`${hours}h ${minutes}m`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [shift]);

  if (!shift) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950 px-4 py-3 text-white shadow-sm">
      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <ShiftMetric icon={Monitor} label="Caja" value={`${shift.cashRegisterCode} · ${shift.cashRegisterName}`} strong />
        <ShiftMetric icon={Building2} label="Empresa" value={shift.companyName} />
        <ShiftMetric icon={Building2} label="Unidad" value={shift.businessUnitName} />
        <ShiftMetric icon={Store} label="Sucursal" value={shift.businessName} />
        <ShiftMetric icon={User} label="Responsable" value={shift.cashierName} />
        <ShiftMetric icon={Clock} label="Estado" value={`Abierta · ${elapsed}`} />
        <ShiftMetric
          icon={DollarSign}
          label="Fondo apertura"
          value={`${formatCurrency(shift.initialCash)} · esperado ${formatCurrency(shift.expectedCash)}`}
          strong
        />
      </div>

      <div className="flex items-center gap-2">
        {onOpenReturn && (
          <button
            onClick={onOpenReturn}
            className="flex min-h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/20"
            title="Procesar devolución"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Devolución</span>
          </button>
        )}

        <button
          onClick={onOpenCashMovement}
          className="flex min-h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/20"
          title="Entradas/Salidas de efectivo"
        >
          <TrendingUp className="w-4 h-4" />
          <span className="hidden sm:inline">Movimientos</span>
        </button>

        <button
          onClick={onCloseShift}
          className="flex min-h-9 items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-red-600"
          title="Cerrar turno"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Cerrar turno</span>
        </button>
      </div>
    </div>
  );
}

function ShiftMetric({
  icon: Icon,
  label,
  value,
  strong = false,
}: {
  icon: typeof Monitor;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md bg-white/10 px-2.5 py-2">
      <Icon className="h-4 w-4 shrink-0 opacity-80" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-normal text-white/55">{label}</p>
        <p className={`truncate text-xs ${strong ? 'font-bold text-white' : 'font-medium text-white/90'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
