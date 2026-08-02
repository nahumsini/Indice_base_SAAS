import { useCallback, useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { GripVertical } from 'lucide-react';
import type { InventoryOperationalMovement } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { formatInventoryNumber } from '../../utils/inventoryFormatters';
import { CancelMovementDialog } from './CancelMovementDialog';
import { MovementFlow, movementStatusTone, movementTone } from './movementUi';

const kanbanStatuses: InventoryOperationalMovement['status'][] = ['draft', 'inTransit', 'received', 'completed', 'cancelled'];

type MovementDragState = {
  movementId: string;
  label: string;
  status: InventoryOperationalMovement['status'];
  x: number;
  y: number;
};

function isKanbanStatus(value?: string): value is InventoryOperationalMovement['status'] {
  return kanbanStatuses.includes(value as InventoryOperationalMovement['status']);
}

function getDropStatusFromPoint(x: number, y: number) {
  const target = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-movement-status]');
  const status = target?.dataset.movementStatus;
  return isKanbanStatus(status) ? status : null;
}

export function MovementsKanban({
  movements,
  t,
  onStatusChange,
  onCancel,
}: {
  movements: InventoryOperationalMovement[];
  t: InventoryTranslations;
  onStatusChange: (movement: InventoryOperationalMovement, status: InventoryOperationalMovement['status']) => void;
  onCancel: (movement: InventoryOperationalMovement) => void;
}) {
  const [movementPendingCancellation, setMovementPendingCancellation] = useState<InventoryOperationalMovement | null>(null);
  const [dragState, setDragState] = useState<MovementDragState | null>(null);
  const [activeDropStatus, setActiveDropStatus] = useState<InventoryOperationalMovement['status'] | null>(null);

  const handleDrop = useCallback((movementId: string, status: InventoryOperationalMovement['status']) => {
    const movement = movements.find((item) => item.id === movementId);

    if (!movement || movement.status === status || movement.status === 'cancelled') {
      return;
    }

    if (status === 'cancelled') {
      setMovementPendingCancellation(movement);
      return;
    }

    onStatusChange(movement, status);
  }, [movements, onStatusChange]);

  useEffect(() => {
    if (!dragState) return;

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    const handlePointerMove = (event: PointerEvent) => {
      setDragState((current) => current ? { ...current, x: event.clientX, y: event.clientY } : current);
      setActiveDropStatus(getDropStatusFromPoint(event.clientX, event.clientY));
    };

    const handlePointerUp = (event: PointerEvent) => {
      const status = getDropStatusFromPoint(event.clientX, event.clientY);
      const movementId = dragState.movementId;
      setDragState(null);
      setActiveDropStatus(null);
      if (status) {
        handleDrop(movementId, status);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [dragState, handleDrop]);

  const startDrag = (movement: InventoryOperationalMovement, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (movement.status === 'cancelled') return;
    event.preventDefault();
    event.stopPropagation();
    setDragState({
      movementId: movement.id,
      label: movement.movementNumber ?? movement.id,
      status: movement.status,
      x: event.clientX,
      y: event.clientY,
    });
    setActiveDropStatus(movement.status);
  };

  const confirmCancellation = (movement: InventoryOperationalMovement) => {
    onCancel(movement);
    setMovementPendingCancellation(null);
  };

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto bg-slate-50/70 p-4">
          <div className="grid min-w-[1380px] grid-cols-5 gap-4">
            {kanbanStatuses.map((status) => (
              <MovementKanbanColumn
                key={status}
                movements={movements.filter((movement) => movement.status === status)}
                status={status}
                activeDropStatus={activeDropStatus}
                t={t}
                onStartDrag={startDrag}
              />
            ))}
          </div>
        </div>
      </div>

      {dragState ? (
        <div
          className="pointer-events-none fixed z-[9999] rounded-lg border border-[#FF6B5E]/30 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-xl ring-4 ring-[#FF6B5E]/10"
          style={{ left: dragState.x + 12, top: dragState.y + 12 }}
        >
          {dragState.label}
          <span className={`ml-2 rounded-full border px-2 py-0.5 font-medium ${movementStatusTone[dragState.status]}`}>
            {t.operational.movementStatuses[dragState.status]}
          </span>
        </div>
      ) : null}

      <CancelMovementDialog movement={movementPendingCancellation} t={t} onClose={() => setMovementPendingCancellation(null)} onConfirm={confirmCancellation} />
    </>
  );
}

function MovementKanbanColumn({
  movements,
  status,
  activeDropStatus,
  t,
  onStartDrag,
}: {
  movements: InventoryOperationalMovement[];
  status: InventoryOperationalMovement['status'];
  activeDropStatus: InventoryOperationalMovement['status'] | null;
  t: InventoryTranslations;
  onStartDrag: (movement: InventoryOperationalMovement, event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const isActiveDrop = activeDropStatus === status;

  return (
    <section
      data-movement-status={status}
      className={`min-h-[520px] rounded-lg border p-3 transition ${isActiveDrop ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 shadow-sm shadow-[#FF6B5E]/20' : 'border-slate-200 bg-white/75'}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full border ${movementStatusTone[status]}`} />
            <h3 className="text-sm font-medium text-slate-900">{t.operational.movementStatuses[status]}</h3>
          </div>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{t.operational.kanbanColumns[status]}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
          {movements.length}
        </span>
      </div>

      <div className="space-y-3">
        {movements.length === 0 ? (
          <div className={`flex min-h-[140px] items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm font-medium transition ${isActiveDrop ? 'border-[#FF6B5E]/40 bg-[#FF6B5E]/10 text-[#B63B32]' : 'border-slate-200 bg-white/70 text-slate-400'}`}>
            {t.operational.emptyStates.movementsDescription}
          </div>
        ) : movements.map((movement) => (
          <MovementKanbanCard key={movement.id} movement={movement} t={t} onStartDrag={onStartDrag} />
        ))}
      </div>
    </section>
  );
}

function MovementKanbanCard({
  movement,
  t,
  onStartDrag,
}: {
  movement: InventoryOperationalMovement;
  t: InventoryTranslations;
  onStartDrag: (movement: InventoryOperationalMovement, event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <article
      className={`select-none rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#FF6B5E]/50 hover:shadow-md ${movement.status === 'cancelled' ? 'opacity-80' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{movement.movementNumber ?? movement.id}</span>
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${movementTone[movement.movementType]}`}>
            {t.operational.movementTypes[movement.movementType]}
          </span>
        </div>
        <button
          type="button"
          className={`flex h-8 w-8 shrink-0 touch-none items-center justify-center rounded-lg border transition ${movement.status === 'cancelled' ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300' : 'cursor-grab border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/15 active:cursor-grabbing'}`}
          aria-label={t.operational.actions.track}
          disabled={movement.status === 'cancelled'}
          onPointerDown={(event) => onStartDrag(movement, event)}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3">
        <MovementFlow movement={movement} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-[9px] font-medium text-slate-400">
          {movement.productImageUrl ? <img src={movement.productImageUrl} alt={movement.productImageAlt ?? movement.productName} className="h-full w-full object-cover" loading="lazy" /> : t.operational.columns.photo}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-950">{movement.productName}</p>
          <p className="text-xs font-medium text-slate-500">{movement.productSku ?? t.common.notAvailable}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-medium text-slate-500">
        <div>
          <span className="block text-xs font-medium text-slate-400">{t.operational.columns.quantity}</span>
          <span className={movement.quantity >= 0 ? 'text-emerald-600' : 'text-red-600'}>
            {movement.quantity >= 0 ? '+' : ''}{formatInventoryNumber(movement.quantity)}
          </span>
        </div>
        <div>
          <span className="block text-xs font-medium text-slate-400">{t.operational.columns.date}</span>
          <span>{movement.movementDate}</span>
        </div>
        <div className="col-span-2">
          <span className="block text-xs font-medium text-slate-400">{t.operational.columns.responsible}</span>
          <span>{movement.responsibleName}</span>
        </div>
      </div>
    </article>
  );
}
