import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { ArrowRightLeft, Ban, ChevronDown, ChevronUp, History, PackagePlus } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../../components/ui/table';
import type { InventoryOperationalColumnId, InventoryStockRow, InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations as Translations } from '../../translations';
import { getWarehouseInventoryEntries, getWarehouseInventorySummary } from '../../utils/inventoryCalculations';
import { formatInventoryCurrency, formatInventoryNumber } from '../../utils/inventoryFormatters';
import { WarehouseInventoryProducts } from './WarehouseInventoryProducts';

const headerClass = 'h-12 px-5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300';
const actionButtonClass = 'h-9 w-9 rounded-xl border transition-colors';
const healthTone = {
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  needsReview: 'border-blue-200 bg-blue-50 text-blue-700',
  inactive: 'border-slate-200 bg-slate-50 text-slate-500',
};

function WarehouseProductPreview({
  warehouse,
  rows,
  t,
}: {
  warehouse: InventoryWarehouse;
  rows: InventoryStockRow[];
  t: Translations;
}) {
  const entries = getWarehouseInventoryEntries(warehouse.id, rows);
  const visibleEntries = entries.slice(0, 3);
  const hiddenCount = Math.max(0, entries.length - visibleEntries.length);

  if (entries.length === 0) {
    return <span className="text-xs font-semibold text-slate-400">{t.operational.noWarehouseProducts}</span>;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {visibleEntries.map(({ row, distribution }) => (
        <span key={row.id} className="rounded-full border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 px-2 py-1 text-[11px] font-black text-[#B63B32]">
          {row.name} · {formatInventoryNumber(distribution.available)}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-500">
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}

export function WarehousesTable({
  warehouses,
  rows,
  visibleColumns,
  t,
  onAddStock,
  onTransferStock,
  onViewMovements,
  onDisableWarehouse,
}: {
  warehouses: InventoryWarehouse[];
  rows: InventoryStockRow[];
  visibleColumns: InventoryOperationalColumnId[];
  t: Translations;
  onAddStock: (warehouse: InventoryWarehouse) => void;
  onTransferStock: (warehouse: InventoryWarehouse) => void;
  onViewMovements: (warehouse: InventoryWarehouse) => void;
  onDisableWarehouse: (warehouseId: string) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(warehouses[0]?.id ? [warehouses[0].id] : []));
  const summaries = useMemo(() => new Map(warehouses.map((warehouse) => [
    warehouse.id,
    getWarehouseInventorySummary(warehouse, rows),
  ])), [rows, warehouses]);

  const toggleExpanded = (warehouseId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(warehouseId)) {
        next.delete(warehouseId);
      } else {
        next.add(warehouseId);
      }
      return next;
    });
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <Table className="min-w-[1280px]">
          <TableHeader className="bg-slate-50/90 dark:bg-slate-900">
            <TableRow className="dark:border-slate-700">
              <TableHead className={headerClass}>
                <GroupedHeader
                  title={t.operational.columns.warehouse}
                  labels={[t.operational.columns.warehouseType, t.operational.columns.responsible]}
                />
              </TableHead>
              <TableHead className={headerClass}>
                <GroupedHeader
                  title={t.operational.columns.businessUnit}
                  labels={[t.operational.columns.businessUnit, t.operational.columns.business]}
                />
              </TableHead>
              <TableHead className={headerClass}>
                <GroupedHeader
                  title={t.operational.warehouseInventory}
                  labels={[t.operational.columns.storedItems, t.operational.columns.totalUnits, t.operational.columns.estimatedValue]}
                  columns={3}
                />
              </TableHead>
              <TableHead className={headerClass}>
                <GroupedHeader
                  title={t.operational.columns.stockHealth}
                  labels={[t.operational.columns.stockHealth, t.operational.columns.status]}
                />
              </TableHead>
              <TableHead className={headerClass}>
                <GroupedHeader title={t.operational.columns.lastMovement} labels={[t.operational.columns.date]} />
              </TableHead>
              <TableHead className={`${headerClass} text-center`}>
                <GroupedHeader title={t.operational.columns.actions} labels={[t.operational.columns.actions]} align="center" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.map((warehouse) => {
              const summary = summaries.get(warehouse.id) ?? getWarehouseInventorySummary(warehouse, rows);
              const isExpanded = expandedIds.has(warehouse.id);

              return (
                <Fragment key={warehouse.id}>
                  <TableRow className="border-slate-100 hover:bg-slate-50/80 dark:border-slate-700 dark:hover:bg-slate-700/40">
                    <TableCell className="min-w-[320px] px-5 py-4 align-top">
                      <div className="flex items-start gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-0.5 h-8 w-8 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-[#FF6B5E]/10 hover:text-[#B63B32] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          aria-label={isExpanded ? t.operational.hideProducts : t.operational.showProducts}
                          onClick={() => toggleExpanded(warehouse.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black leading-5 text-slate-950 dark:text-white">{warehouse.name}</p>
                            <span className="rounded-full border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 px-2 py-0.5 text-[11px] font-black text-[#B63B32]">
                              {t.operational.warehouseTypes[warehouse.type]}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                            {warehouse.jurisdiction} · {warehouse.responsibleName}
                          </p>
                          <WarehouseProductPreview warehouse={warehouse} rows={rows} t={t} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[220px] px-5 py-4 align-top">
                      <p className="text-sm font-black text-slate-800 dark:text-white">{warehouse.businessUnitName ?? t.common.notAvailable}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">{warehouse.businessName ?? t.common.notAvailable}</p>
                    </TableCell>
                    <TableCell className="min-w-[300px] px-5 py-4 align-top">
                      <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left dark:border-slate-700 dark:bg-slate-900">
                        <Metric value={formatInventoryNumber(summary.storedItems)} label={t.operational.columns.storedItems} />
                        <Metric value={formatInventoryNumber(summary.totalUnits)} label={t.operational.columns.totalUnits} />
                        <Metric value={formatInventoryCurrency(summary.estimatedValue)} label={t.operational.columns.estimatedValue} />
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 align-top">
                      <div className="grid gap-2">
                        <span className={`w-fit rounded-md border px-2 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${healthTone[summary.stockHealth]}`}>
                          {t.operational.statuses[summary.stockHealth]}
                        </span>
                        <span className={`w-fit rounded-md border px-2 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${warehouse.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                          {warehouse.status === 'active' ? t.filters.active : t.filters.inactive}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 align-top text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {summary.lastMovement ?? t.common.notAvailable}
                    </TableCell>
                    <TableCell className="px-5 py-4 align-top">
                      <div className="flex justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <ActionButton className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" title={t.operational.actions.addStock} icon={<PackagePlus className="h-4 w-4" />} onClick={() => onAddStock(warehouse)} />
                        <ActionButton className="border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100" title={t.operational.actions.transferStock} icon={<ArrowRightLeft className="h-4 w-4" />} onClick={() => onTransferStock(warehouse)} />
                        <ActionButton className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100" title={t.operational.actions.viewMovements} icon={<History className="h-4 w-4" />} onClick={() => onViewMovements(warehouse)} />
                        <ActionButton className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100" title={t.operational.actions.disable} icon={<Ban className="h-4 w-4" />} onClick={() => onDisableWarehouse(warehouse.id)} />
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded ? (
                    <TableRow className="border-slate-100 bg-slate-50/60 hover:bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:bg-slate-900/70">
                      <TableCell colSpan={6} className="px-5 py-4">
                        <WarehouseInventoryProducts warehouse={warehouse} rows={rows} visibleColumns={visibleColumns} t={t} />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function GroupedHeader({
  title,
  labels,
  columns = labels.length,
  align = 'left',
}: {
  title: string;
  labels: string[];
  columns?: number;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'text-center' : 'text-left'}>
      <p className="whitespace-nowrap">{title}</p>
      <div
        className={`mt-1 grid gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 ${align === 'center' ? 'justify-center' : ''}`}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {labels.map((label) => (
          <span key={label} className="truncate">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-r border-slate-200 px-3 py-2 last:border-r-0 dark:border-slate-700">
      <p className="text-sm font-black leading-5 text-slate-950 dark:text-white">{value}</p>
      <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function ActionButton({
  className,
  icon,
  title,
  onClick,
}: {
  className: string;
  icon: ReactNode;
  title: string;
  onClick?: () => void;
}) {
  return (
    <Button size="icon" variant="ghost" className={`${actionButtonClass} ${className}`} title={title} onClick={onClick}>
      {icon}
    </Button>
  );
}
