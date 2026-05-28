import { PackageSearch } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../../components/ui/table';
import type { InventoryOperationalColumnId, InventoryStockRow, InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations as Translations } from '../../translations';
import { getWarehouseInventoryEntries } from '../../utils/inventoryCalculations';
import { formatInventoryCurrency, formatInventoryNumber } from '../../utils/inventoryFormatters';

const headerClass = 'h-10 whitespace-nowrap px-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500';
const numberClass = 'px-3 py-3 text-right text-sm font-black tabular-nums text-slate-900';
const healthTone = {
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  lowStock: 'border-amber-200 bg-amber-50 text-amber-700',
  outOfStock: 'border-red-200 bg-red-50 text-red-700',
  needsReview: 'border-blue-200 bg-blue-50 text-blue-700',
  inactive: 'border-slate-200 bg-slate-50 text-slate-500',
};

export function WarehouseInventoryProducts({
  warehouse,
  rows,
  visibleColumns,
  t,
}: {
  warehouse: InventoryWarehouse;
  rows: InventoryStockRow[];
  visibleColumns: InventoryOperationalColumnId[];
  t: Translations;
}) {
  const entries = getWarehouseInventoryEntries(warehouse.id, rows);
  const canShow = (column: InventoryOperationalColumnId) => visibleColumns.includes(column);

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
        <PackageSearch className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm font-semibold text-slate-500">{t.operational.noWarehouseProducts}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <Table className="min-w-[1060px]">
          <TableHeader className="bg-slate-50/90">
            <TableRow className="border-slate-200">
              {canShow('photo') ? <TableHead className={headerClass}>{t.operational.columns.photo}</TableHead> : null}
              {canShow('product') ? <TableHead className={headerClass}>{t.operational.columns.product}</TableHead> : null}
              {canShow('sku') ? <TableHead className={headerClass}>{t.operational.columns.sku}</TableHead> : null}
              {canShow('category') ? <TableHead className={headerClass}>{t.operational.columns.category}</TableHead> : null}
              {canShow('type') ? <TableHead className={headerClass}>{t.operational.columns.type}</TableHead> : null}
              {canShow('totalStock') ? <TableHead className={`${headerClass} text-right`}>{t.operational.columns.totalStock}</TableHead> : null}
              {canShow('available') ? <TableHead className={`${headerClass} text-right`}>{t.operational.columns.available}</TableHead> : null}
              {canShow('reserved') ? <TableHead className={`${headerClass} text-right`}>{t.operational.columns.reserved}</TableHead> : null}
              {canShow('minimum') ? <TableHead className={`${headerClass} text-right`}>{t.operational.columns.minimum}</TableHead> : null}
              {canShow('status') ? <TableHead className={headerClass}>{t.operational.columns.status}</TableHead> : null}
              {canShow('estimatedValue') ? <TableHead className={`${headerClass} text-right`}>{t.operational.columns.estimatedValue}</TableHead> : null}
              {canShow('lastMovement') ? <TableHead className={headerClass}>{t.operational.columns.lastMovement}</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(({ row, distribution, estimatedValue, health, totalUnits }) => (
              <TableRow key={row.id} className="border-slate-100 hover:bg-slate-50/80">
                {canShow('photo') ? (
                  <TableCell className="px-3 py-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                      {row.thumbnailUrl ? (
                        <img src={row.thumbnailUrl} alt={row.thumbnailAlt ?? row.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        t.operational.columns.photo
                      )}
                    </div>
                  </TableCell>
                ) : null}
                {canShow('product') ? (
                  <TableCell className="min-w-[240px] px-3 py-3">
                    <p className="truncate text-sm font-black text-slate-950">{row.name}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">{row.description}</p>
                  </TableCell>
                ) : null}
                {canShow('sku') ? <TableCell className="px-3 py-3 text-sm font-bold text-slate-600">{row.sku}</TableCell> : null}
                {canShow('category') ? <TableCell className="px-3 py-3 text-sm font-semibold text-slate-600">{row.category}</TableCell> : null}
                {canShow('type') ? <TableCell className="px-3 py-3 text-sm font-semibold text-slate-600">{row.type}</TableCell> : null}
                {canShow('totalStock') ? <TableCell className={numberClass}>{formatInventoryNumber(totalUnits)}</TableCell> : null}
                {canShow('available') ? <TableCell className={numberClass}>{formatInventoryNumber(distribution.available)}</TableCell> : null}
                {canShow('reserved') ? <TableCell className={numberClass}>{formatInventoryNumber(distribution.reserved)}</TableCell> : null}
                {canShow('minimum') ? <TableCell className={numberClass}>{formatInventoryNumber(distribution.minimum)}</TableCell> : null}
                {canShow('status') ? (
                  <TableCell className="px-3 py-3">
                    <span className={`rounded-md border px-2 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${healthTone[health]}`}>
                      {t.operational.statuses[health]}
                    </span>
                  </TableCell>
                ) : null}
                {canShow('estimatedValue') ? <TableCell className={numberClass}>{formatInventoryCurrency(estimatedValue)}</TableCell> : null}
                {canShow('lastMovement') ? <TableCell className="px-3 py-3 text-sm font-semibold text-slate-600">{row.lastMovementAt ?? t.common.notAvailable}</TableCell> : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
