import { Clock, User, DollarSign, TrendingUp, TrendingDown, LogOut, RotateCcw } from 'lucide-react';
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
      currency: 'MXN',
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
    <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 py-2 flex items-center justify-between shadow-sm">
      {/* Left: Shift Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 opacity-80" />
          <span className="font-semibold text-sm">{shift.cashierName}</span>
        </div>

        <div className="h-4 w-px bg-white/30" />

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 opacity-80" />
          <span className="text-sm opacity-90">{elapsed}</span>
        </div>

        <div className="h-4 w-px bg-white/30" />

        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 opacity-80" />
          <span className="text-sm font-mono">{formatCurrency(shift.expectedCash)}</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {onOpenReturn && (
          <button
            onClick={onOpenReturn}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
            title="Procesar devolución"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Devolución</span>
          </button>
        )}

        <button
          onClick={onOpenCashMovement}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
          title="Entradas/Salidas de efectivo"
        >
          <TrendingUp className="w-4 h-4" />
          <span className="hidden sm:inline">Movimientos</span>
        </button>

        <button
          onClick={onCloseShift}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/80 hover:bg-red-600 rounded-lg transition-colors text-sm font-medium"
          title="Cerrar turno"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Cerrar Turno</span>
        </button>
      </div>
    </div>
  );
}
