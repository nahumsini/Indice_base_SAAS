import { MovementFilesModal } from './MovementFilesModal';
import { useMemo, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { DataTablePagination } from '../../../../../components/table/DataTablePagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../../components/ui/table';
import { useTablePagination } from '../../../../../hooks/useTablePagination';
import type { InventoryOperationalMovement } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { formatInventoryCurrency, formatInventoryNumber } from '../../utils/inventoryFormatters';
import { CancelMovementDialog } from './CancelMovementDialog';
import { MovementActions, MovementFlow, MovementNumber, MovementQuantity, movementStatusTone } from './movementUi';

const headerClass = 'h-12 whitespace-nowrap px-4 text-sm font-medium text-slate-500 dark:text-slate-300';
const selectableStatuses: InventoryOperationalMovement['status'][] = ['draft', 'inTransit', 'received', 'completed', 'cancelled'];

type MovementGroup = {
  id: string;
  primary: InventoryOperationalMovement;
  lines: InventoryOperationalMovement[];
};

function groupMovements(movements: InventoryOperationalMovement[]): MovementGroup[] {
  const groups = new Map<string, MovementGroup>();

  movements.forEach((movement) => {
    const groupId = movement.groupId ?? movement.movementNumber ?? movement.id;
    const existing = groups.get(groupId);
    if (existing) {
      existing.lines.push(movement);
      return;
    }

    groups.set(groupId, { id: groupId, primary: movement, lines: [movement] });
  });

  return Array.from(groups.values());
}

function GroupedProducts({ group, t }: { group: MovementGroup; t: InventoryTranslations }) {
  return (
    <div className="min-w-[300px] space-y-2">
      {group.lines.slice(0, 4).map((movement) => (
        <div key={movement.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-[9px] font-medium text-slate-400">
            {movement.productImageUrl ? <img src={movement.productImageUrl} alt={movement.productImageAlt ?? movement.productName} className="h-full w-full object-cover" loading="lazy" /> : t.operational.columns.photo}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{movement.productName}</p>
            <p className="truncate text-xs font-medium text-slate-500">SKU: {movement.productSku ?? t.common.notAvailable}</p>
          </div>
          <span className={`text-sm font-medium tabular-nums ${movement.quantity >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {movement.quantity >= 0 ? '+' : ''}{formatInventoryNumber(movement.quantity)}
          </span>
        </div>
      ))}
      {group.lines.length > 4 ? (
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          +{group.lines.length - 4} more
        </span>
      ) : null}
    </div>
  );
}

export function MovementsTable({
  movements,
  t,
  onEdit,
  onPrint,
  onTrack,
  onCancel,
  onStatusChange,
}: {
  movements: InventoryOperationalMovement[];
  t: InventoryTranslations;
  onEdit: (movement: InventoryOperationalMovement) => void;
  onPrint: (movement: InventoryOperationalMovement) => void;
  onTrack: (movement: InventoryOperationalMovement) => void;
  onCancel: (movement: InventoryOperationalMovement) => void;
  onStatusChange: (movement: InventoryOperationalMovement, status: InventoryOperationalMovement['status']) => void;
}) {
  const movementGroups = useMemo(() => groupMovements(movements), [movements]);
  const {
    currentPage,
    onPageChange,
    onPageSizeChange,
    pageEnd,
    pageSize,
    pageSizeOptions,
    pageStart,
    paginatedRows: paginatedMovementGroups,
    totalCount,
    totalPages,
  } = useTablePagination({
    resetKey: movementGroups.map((group) => group.id).join('|'),
    rows: movementGroups,
  });
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [filesMovement, setFilesMovement] = useState<InventoryOperationalMovement | null>(null);
  const [movementPendingCancellation, setMovementPendingCancellation] = useState<InventoryOperationalMovement | null>(null);

  const requestCancellation = (movement: InventoryOperationalMovement) => {
    if (movement.status === 'cancelled') return;
    setMovementPendingCancellation(movement);
  };

  const confirmCancellation = (movement: InventoryOperationalMovement) => {
    onCancel(movement);
    setMovementPendingCancellation(null);
  };

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="min-w-0">
          <Table className="min-w-[1300px]">
            <TableHeader className="bg-slate-50/90 dark:bg-slate-900">
              <TableRow className="border-slate-200 dark:border-slate-700">
                <TableHead className={headerClass}>{t.operational.columns.movement}</TableHead>
                <TableHead className={headerClass}>{t.operational.columns.flow}</TableHead>
                <TableHead className={headerClass}>{t.operational.columns.product}</TableHead>
                <TableHead className={`${headerClass} text-right`}>{t.operational.columns.quantity}</TableHead>
                <TableHead className={headerClass}>{t.operational.columns.responsible}</TableHead>
                <TableHead className={headerClass}>{t.operational.columns.status}</TableHead>
                <TableHead className={headerClass}>{t.operational.columns.reference}</TableHead>
                <TableHead className={headerClass}>{t.operational.columns.files}</TableHead>
                <TableHead className={`${headerClass} text-right`}>{t.operational.columns.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMovementGroups.map((group) => {
                const movement = group.primary;
                const movementValue = group.lines.reduce((total, line) => total + Math.abs(line.quantity) * (line.unitCost ?? 0), 0);
                const totalQuantity = group.lines.reduce((total, line) => total + line.quantity, 0);
                const filesTarget = group.lines.find(line => line.attachments?.some(file => file.registered)) ?? movement;
                const attachmentCount = fileCounts[filesTarget.id] ?? filesTarget.attachments?.filter(file => file.registered).length ?? 0;

                return (
                  <TableRow key={group.id} className="border-slate-100 hover:bg-[#FF6B5E]/5 dark:border-slate-700 dark:hover:bg-slate-700/40">
                    <TableCell className="px-4 py-4 align-top">
                      <MovementNumber movement={movement} t={t} />
                      {group.lines.length > 1 ? <p className="mt-2 text-xs font-medium text-slate-500">{group.lines.length} products</p> : null}
                    </TableCell>
                    <TableCell className="px-4 py-4 align-top">
                      <MovementFlow movement={movement} t={t} />
                    </TableCell>
                    <TableCell className="px-4 py-4 align-top">
                      <GroupedProducts group={group} t={t} />
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right align-top">
                      <MovementQuantity quantity={totalQuantity} />
                      <p className="mt-1 text-xs font-medium text-slate-400">{formatInventoryCurrency(movementValue)}</p>
                    </TableCell>
                    <TableCell className="min-w-[160px] px-4 py-4 align-top">
                      <p className="text-sm font-medium text-slate-800 dark:text-white">{movement.responsibleName}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{movement.businessUnitName ?? t.common.notAvailable}</p>
                    </TableCell>
                    <TableCell className="px-4 py-4 align-top">
                      <MovementStatusSelector
                        movement={movement}
                        t={t}
                        onStatusChange={(selectedMovement, status) => {
                          if (status === 'cancelled') {
                            requestCancellation(selectedMovement);
                            return;
                          }
                          onStatusChange(selectedMovement, status);
                        }}
                      />
                    </TableCell>
                    <TableCell className="min-w-[180px] px-4 py-4 align-top">
                      <p className="text-sm font-medium text-slate-800 dark:text-white">{movement.reference ?? t.common.notAvailable}</p>
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">{movement.reason}</p>
                      {movement.status === 'cancelled' ? (
                        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium leading-5 text-red-700">
                          {t.operational.cancelledReturnMessage}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="min-w-[150px] px-4 py-4 align-top">
                      <button type="button" onClick={() => setFilesMovement(filesTarget)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 px-3 text-sm text-blue-700 dark:border-blue-800 dark:text-blue-300" aria-label={`${t.operational.modals.files}: ${movement.movementNumber}`}>
                        <Paperclip className="h-4 w-4" />{t.operational.modals.files} {attachmentCount || ''}
                      </button>
                    </TableCell>
                    <TableCell className="px-4 py-4 align-top">
                      <MovementActions movement={movement} t={t} onEdit={onEdit} onPrint={onPrint} onTrack={onTrack} onCancel={requestCancellation} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination
          currentPage={currentPage}
          itemLabel="movimientos"
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageEnd={pageEnd}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          pageStart={pageStart}
          totalCount={totalCount}
          totalPages={totalPages}
        />
      </div>

      {filesMovement ? <MovementFilesModal movement={filesMovement} onClose={() => setFilesMovement(null)} onFileCountChange={count => setFileCounts(current => ({ ...current, [filesMovement.id]: count }))} /> : null}
      <CancelMovementDialog movement={movementPendingCancellation} t={t} onClose={() => setMovementPendingCancellation(null)} onConfirm={confirmCancellation} />
    </>
  );
}

function MovementStatusSelector({
  movement,
  t,
  onStatusChange,
}: {
  movement: InventoryOperationalMovement;
  t: InventoryTranslations;
  onStatusChange: (movement: InventoryOperationalMovement, status: InventoryOperationalMovement['status']) => void;
}) {
  return (
    <div className="min-w-[160px]">
      <select
        value={movement.status}
        disabled={movement.status === 'cancelled'}
        onChange={(event) => onStatusChange(movement, event.target.value as InventoryOperationalMovement['status'])}
        className={`h-11 md:h-9 w-full rounded-full border px-3 text-xs font-medium shadow-none outline-none transition focus:ring-2 focus:ring-[#FF6B5E]/25 disabled:cursor-not-allowed ${movementStatusTone[movement.status]}`}
      >
        {selectableStatuses.map((status) => (
          <option key={status} value={status}>
            {t.operational.movementStatuses[status]}
          </option>
        ))}
      </select>
      {movement.status === 'cancelled' ? (
        <p className="mt-2 text-xs font-medium leading-4 text-red-700">
          {t.operational.cancelledReturnMessage}
        </p>
      ) : null}
    </div>
  );
}
