import { useEffect, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  Clock3,
  ClipboardList,
  LogOut,
  Monitor,
  MoreHorizontal,
  ReceiptText,
  RotateCcw,
  TrendingUp,
  PackagePlus,
} from 'lucide-react';
import type { Shift } from '../types/shift.types';

interface ShiftBarProps {
  shift: Shift | null;
  onOpenCashMovement: () => void;
  onOpenShiftSummary: () => void;
  onCloseShift: () => void;
  onOpenReturn?: () => void;
  onOpenInventoryReceipt?: () => void;
  onToggleFullscreen?: () => void;
  fiscalSummary?: string;
  fiscalDetail?: string;
  onOpenFiscalSettings?: () => void;
}

export function ShiftBar({
  shift,
  onOpenCashMovement,
  onOpenShiftSummary,
  onCloseShift,
  onOpenReturn,
  onOpenInventoryReceipt,
  onToggleFullscreen,
  fiscalSummary,
  fiscalDetail,
  onOpenFiscalSettings,
}: ShiftBarProps) {
  const [elapsed, setElapsed] = useState('');
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    if (!shift) return;
    const updateElapsed = () => {
      const diff = Date.now() - shift.startTime.getTime();
      const hours = Math.floor(diff / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      setElapsed(`${hours}h ${minutes}m`);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 60_000);
    return () => clearInterval(interval);
  }, [shift]);

  if (!shift) return null;

  const warehouseName = shift.warehouseName?.trim() || shift.cashRegisterName || 'Almacén no asignado';
  const shiftStartedAt = new Intl.DateTimeFormat('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(shift.startTime);

  return (
    <header className="relative z-20 rounded-lg border border-[#222831] bg-[#222831] px-3 py-2 text-white shadow-sm">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div
            className="min-w-0 rounded-lg px-1 py-1 text-left"
            title={`${shift.businessUnitName} · ${shift.businessName} · ${warehouseName} · ${shift.cashierName}`}
          >
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-medium">{`Caja ${shift.cashRegisterCode}`}</span>
              <span className="rounded-full bg-[#F4C84A]/20 px-2 py-0.5 text-xs font-medium text-[#F4C84A]">{shift.cashRegisterName}</span>
              <span className="text-xs font-normal text-gray-300">{shift.businessUnitName}</span>
              <span className="text-gray-500">·</span>
              <span className="text-xs font-normal text-gray-300">{shift.businessName}</span>
              <span className="text-gray-500">·</span>
              <span className="text-xs font-normal text-gray-300">{warehouseName}</span>
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-2 text-xs font-normal text-gray-400">
              <span>{shift.cashierName}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />{` Inicio ${shiftStartedAt} · ${elapsed}`}
              </span>
              <span>·</span>
              <span>
                {fiscalSummary ?? 'Fiscal'}
                {fiscalDetail ? ` · ${fiscalDetail}` : ''}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {onOpenInventoryReceipt ? (
            <CompactAction icon={<PackagePlus />} label="Recibir mercancía" onClick={onOpenInventoryReceipt} />
          ) : null}
          {onOpenReturn ? <CompactAction icon={<RotateCcw />} label="Devolución" onClick={onOpenReturn} /> : null}
          <CompactAction icon={<TrendingUp />} label="Movimientos" onClick={onOpenCashMovement} />
          <CompactAction icon={<ClipboardList />} label="Resumen" onClick={onOpenShiftSummary} />
          {onToggleFullscreen ? <CompactAction icon={<Monitor />} label="Pantalla" onClick={onToggleFullscreen} /> : null}

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMoreOpen((current) => !current)}
              aria-expanded={isMoreOpen}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 text-sm font-medium text-white transition hover:bg-white/20"
            >
              <MoreHorizontal className="h-4 w-4" /> Más <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {isMoreOpen ? (
              <div className="absolute right-0 top-12 z-40 w-56 rounded-lg border border-gray-200 bg-white p-1.5 text-gray-800 shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                {onOpenFiscalSettings ? (
                  <MenuAction
                    icon={<ReceiptText />}
                    label="Divisa e impuestos"
                    onClick={() => {
                      setIsMoreOpen(false);
                      onOpenFiscalSettings();
                    }}
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onCloseShift}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#EF4444] px-3 text-sm font-medium text-white transition hover:bg-red-600"
          >
            <LogOut className="h-4 w-4" /> Cerrar turno
          </button>
        </div>
      </div>
    </header>
  );
}

function CompactAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 bg-white px-3 text-sm font-medium text-[#222831] transition hover:bg-gray-100"
    >
      <span className="[&_svg]:h-4 [&_svg]:w-4" aria-hidden="true">
        {icon}
      </span>
      {label}
    </button>
  );
}

function MenuAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium transition hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      <span className="[&_svg]:h-4 [&_svg]:w-4" aria-hidden="true">
        {icon}
      </span>
      {label}
    </button>
  );
}
