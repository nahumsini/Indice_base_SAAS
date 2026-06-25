import { useEffect, useState } from 'react';
import type { Shift } from '../types/shift.types';

interface ShiftBarProps {
  shift: Shift | null;
  onOpenCashMovement: () => void;
  onCloseShift: () => void;
  onOpenReturn?: () => void;
  onToggleFullscreen?: () => void;
  onOpenCustomerDisplay?: () => void;
  fiscalSummary?: string;
  fiscalDetail?: string;
  onOpenFiscalSettings?: () => void;
}

export function ShiftBar({
  shift,
  onOpenCashMovement,
  onCloseShift,
  onOpenReturn,
  onToggleFullscreen,
  onOpenCustomerDisplay,
  fiscalSummary,
  fiscalDetail,
  onOpenFiscalSettings,
}: ShiftBarProps) {
  const [elapsed, setElapsed] = useState('');

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

  const shiftStartedAt = new Intl.DateTimeFormat('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(shift.startTime);
  const warehouseName = shift.warehouseName?.trim() || shift.cashRegisterName || 'Almacén no asignado';

  return (
    <div className="rounded-[24px] border border-[#222831] bg-[#222831] p-2 text-gray-950 shadow-sm dark:border-gray-700 dark:bg-[#111827] dark:text-white">
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(620px,840px)] xl:items-stretch">
        <div className="min-w-0 rounded-[20px] border border-white/10 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <p className="text-[11px] font-black uppercase tracking-normal text-[#FF6B5E] dark:text-[#FF8A80]">Turno operativo</p>
              <p className="text-sm font-black text-gray-800 dark:text-gray-200">
                Caja {shift.cashRegisterCode}
              </p>
            </div>
            <span className="rounded-full bg-[#F4C84A]/20 px-3 py-1 text-[11px] font-black uppercase text-[#222831] dark:bg-[#F4C84A]/15 dark:text-[#F4C84A]">
              {shift.cashRegisterName}
            </span>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            <ShiftPill emoji="🏢" label="Unidad" value={shift.businessUnitName} tone="blue" />
            <ShiftPill emoji="🏬" label="Negocio" value={shift.businessName} tone="aqua" />
            <ShiftPill emoji="📦" label="Almacén" value={warehouseName} tone="yellow" />
            <ShiftPill emoji="👤" label="Responsable" value={shift.cashierName} tone="coral" />
            <ShiftPill
              emoji="🕒"
              label="Turno"
              value={`Inició ${shiftStartedAt}`}
              detail={`Abierta · ${elapsed}`}
              tone="success"
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {onOpenFiscalSettings && (
            <button
              type="button"
              onClick={onOpenFiscalSettings}
              className="group flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-[20px] border border-white/10 bg-white px-2.5 py-3 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F4C84A]/50 hover:bg-[#F4C84A]/10 hover:shadow-md active:translate-y-0 active:scale-[0.98] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-[#F4C84A]/40 dark:hover:bg-[#F4C84A]/10"
              aria-label="Configurar divisa e impuestos"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#F4C84A]/20 text-xl transition-all duration-200 group-hover:rotate-6 group-hover:scale-110 dark:bg-[#F4C84A]/15" aria-hidden="true">
                🧾
              </span>
              <span className="flex min-w-0 flex-col items-center gap-1">
                <span className="block text-[10px] font-black uppercase tracking-normal text-gray-500 dark:text-gray-400">Divisa / Impuestos</span>
                <span className="max-w-full truncate text-sm font-black text-gray-950 dark:text-white">
                  {fiscalSummary ?? 'Fiscal'}
                </span>
                {fiscalDetail && (
                  <span className="max-w-full rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase leading-none text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                    {fiscalDetail}
                  </span>
                )}
              </span>
            </button>
          )}

          {onOpenReturn && (
            <ActionButton
              emoji="🔄"
              label="Devolución"
              title="Procesar devolución"
              onClick={onOpenReturn}
              tone="blue"
            />
          )}

          <ActionButton
            emoji="📈"
            label="Movimientos"
            title="Entradas/Salidas de efectivo"
            onClick={onOpenCashMovement}
            tone="aqua"
          />

          {onToggleFullscreen && (
            <ActionButton
              emoji="🖥️"
              label="Pantalla"
              title="Modo pantalla completa"
              onClick={onToggleFullscreen}
              tone="graphite"
            />
          )}

          {onOpenCustomerDisplay && (
            <ActionButton
              emoji="🪞"
              label="Espejo"
              title="Pantalla espejo del cliente"
              onClick={onOpenCustomerDisplay}
              tone="aqua"
            />
          )}

          <ActionButton
            emoji="🚪"
            label="Cerrar turno"
            title="Cerrar turno"
            onClick={onCloseShift}
            variant="danger"
          />
        </div>
      </div>
    </div>
  );
}

function ShiftPill({
  emoji,
  label,
  value,
  detail,
  tone = 'default',
}: {
  emoji: string;
  label: string;
  value: string;
  detail?: string;
  tone?: 'default' | 'blue' | 'aqua' | 'yellow' | 'coral' | 'success' | 'money';
}) {
  const toneClassName = {
    default: 'bg-white text-gray-950 dark:bg-gray-900 dark:text-white',
    blue: 'bg-blue-50 text-gray-950 dark:bg-blue-500/10 dark:text-blue-50',
    aqua: 'bg-[#59C3A5]/10 text-gray-950 dark:bg-[#59C3A5]/10 dark:text-[#D8FFF4]',
    yellow: 'bg-[#F4C84A]/20 text-gray-950 dark:bg-[#F4C84A]/10 dark:text-[#FFF2BF]',
    coral: 'bg-[#FF6B5E]/10 text-gray-950 dark:bg-[#FF6B5E]/10 dark:text-[#FFE5E2]',
    success: 'bg-emerald-50 text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-100',
    money: 'bg-amber-50 text-amber-950 dark:bg-amber-500/10 dark:text-amber-100',
  }[tone];

  const iconClassName = {
    default: 'bg-gray-50 dark:bg-gray-800',
    blue: 'bg-blue-100 dark:bg-blue-500/15',
    aqua: 'bg-[#59C3A5]/20 dark:bg-[#59C3A5]/15',
    yellow: 'bg-[#F4C84A]/25 dark:bg-[#F4C84A]/15',
    coral: 'bg-[#FF6B5E]/20 dark:bg-[#FF6B5E]/15',
    success: 'bg-emerald-100 dark:bg-emerald-500/15',
    money: 'bg-amber-100 dark:bg-amber-500/15',
  }[tone];

  return (
    <div className={`flex min-h-[66px] min-w-0 items-center gap-2 rounded-2xl border border-black/5 px-2.5 py-2 shadow-sm dark:border-white/10 ${toneClassName}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-lg ${iconClassName}`} aria-hidden="true">
        {emoji}
      </span>
      <div className="min-w-0 flex-1 text-center">
        <p className="text-[10px] font-black uppercase tracking-normal text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-0.5 break-words text-[13px] font-black leading-snug text-gray-950 dark:text-white" title={value}>{value}</p>
        {detail && (
          <p className="break-words text-[11px] font-bold leading-snug text-gray-500 dark:text-gray-300" title={detail}>{detail}</p>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  emoji,
  label,
  title,
  onClick,
  variant = 'default',
  tone = 'default',
}: {
  emoji: string;
  label: string;
  title: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  tone?: 'default' | 'blue' | 'aqua' | 'graphite';
}) {
  const className = variant === 'danger'
    ? 'border-[#EF4444] bg-[#EF4444] text-white hover:bg-red-600 dark:border-[#EF4444] dark:bg-[#EF4444] dark:hover:bg-red-600'
    : {
      default: 'border-white/10 bg-white text-gray-800 hover:border-[#FF6B5E]/40 hover:bg-[#FF6B5E]/10 hover:text-[#222831] dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-[#FF6B5E]/30 dark:hover:bg-[#FF6B5E]/10 dark:hover:text-orange-100',
      blue: 'border-white/10 bg-white text-gray-800 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-100',
      aqua: 'border-white/10 bg-white text-gray-800 hover:border-[#59C3A5]/50 hover:bg-[#59C3A5]/10 hover:text-[#146B58] dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-[#59C3A5]/35 dark:hover:bg-[#59C3A5]/10 dark:hover:text-[#D8FFF4]',
      graphite: 'border-white/10 bg-white text-gray-800 hover:border-[#222831]/30 hover:bg-[#222831]/10 hover:text-[#222831] dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-500 dark:hover:bg-gray-800',
    }[tone];
  const iconClassName = variant === 'danger'
    ? 'bg-white/15 group-hover:bg-white/25'
    : {
      default: 'bg-[#FF6B5E]/10 group-hover:bg-[#FF6B5E]/20 dark:bg-gray-800 dark:group-hover:bg-[#FF6B5E]/15',
      blue: 'bg-blue-50 group-hover:bg-blue-100 dark:bg-gray-800 dark:group-hover:bg-blue-500/15',
      aqua: 'bg-[#59C3A5]/10 group-hover:bg-[#59C3A5]/20 dark:bg-gray-800 dark:group-hover:bg-[#59C3A5]/15',
      graphite: 'bg-[#222831]/8 group-hover:bg-[#222831]/15 dark:bg-gray-800 dark:group-hover:bg-gray-700',
    }[tone];

  return (
    <button
      onClick={onClick}
      aria-label={title}
      className={`group relative flex min-h-[88px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[20px] border px-2.5 py-3 text-center text-sm font-black shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] ${className}`}
    >
      {variant === 'danger' && (
        <span className="absolute inset-0 animate-pulse bg-white/0 transition-colors group-hover:bg-white/5" aria-hidden="true" />
      )}
      <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xl transition-all duration-200 group-hover:scale-110 ${iconClassName}`} aria-hidden="true">
        {emoji}
      </span>
      <span className="relative max-w-full whitespace-normal break-words leading-tight">{label}</span>
    </button>
  );
}
