import { useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, ArrowRightLeft, Eye, PackageOpen, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { DataTablePagination } from '../../../../../components/table/DataTablePagination';
import { Button } from '../../../../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../../components/ui/table';
import { useTablePagination } from '../../../../../hooks/useTablePagination';
import { SalesFilterBar, SalesFilterSearch, SalesFilterSelect } from '../../../components/SalesFilterBar';
import type { InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { getWarehouseInventorySummary } from '../../utils/inventoryCalculations';
import { formatInventoryCurrency, formatInventoryNumber } from '../../utils/inventoryFormatters';
import { defaultWarehouseTableVisibleColumns, type WarehouseTableColumnId } from './WarehouseColumnsModal';

type WarehouseSummary = ReturnType<typeof getWarehouseInventorySummary>;
type WarehouseFilterValue = 'all' | string;

const headClass = 'h-12 whitespace-nowrap px-4 text-sm font-medium text-slate-500 dark:text-slate-300';
const bodyClass = 'px-4 py-4 text-sm text-slate-700 dark:text-slate-200';
const numberClass = `${bodyClass} text-right font-medium tabular-nums text-slate-950 dark:text-white`;

export function WarehouseManagerView({
  warehouses, summaries, invalidWarehouseIds = new Set<string>(), visibleColumns = defaultWarehouseTableVisibleColumns, t,
  onCreate, onEdit, onRequestDelete, onViewInventory,
}: {
  warehouses: InventoryWarehouse[];
  summaries: Map<string, WarehouseSummary>;
  invalidWarehouseIds?: Set<string>;
  visibleColumns?: WarehouseTableColumnId[];
  t: InventoryTranslations;
  onCreate?: () => void;
  onEdit?: (warehouse: InventoryWarehouse) => void;
  onRequestDelete: (warehouse: InventoryWarehouse) => void;
  onViewInventory?: (warehouseId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [businessUnitFilter, setBusinessUnitFilter] = useState<WarehouseFilterValue>('all');
  const [businessFilter, setBusinessFilter] = useState<WarehouseFilterValue>('all');
  const [statusFilter, setStatusFilter] = useState<WarehouseFilterValue>('all');

  const businessUnitOptions = useMemo(() => Array.from(new Map(warehouses
    .filter((warehouse) => warehouse.businessUnitId)
    .map((warehouse) => [warehouse.businessUnitId as string, warehouse.businessUnitName || t.common.notAvailable])).entries())
    .map(([value, label]) => ({ value, label })), [t.common.notAvailable, warehouses]);

  const businessOptions = useMemo(() => Array.from(new Map(warehouses
    .filter((warehouse) => warehouse.businessId && (businessUnitFilter === 'all' || warehouse.businessUnitId === businessUnitFilter))
    .map((warehouse) => [warehouse.businessId as string, warehouse.businessName || t.common.notAvailable])).entries())
    .map(([value, label]) => ({ value, label })), [businessUnitFilter, t.common.notAvailable, warehouses]);

  const filteredWarehouses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return warehouses.filter((warehouse) => {
      const matchesSearch = !normalizedQuery || [warehouse.name, warehouse.businessUnitName, warehouse.businessName, warehouse.jurisdiction, warehouse.responsibleName, t.operational.warehouseTypes[warehouse.type]]
        .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));
      return matchesSearch
        && (businessUnitFilter === 'all' || warehouse.businessUnitId === businessUnitFilter)
        && (businessFilter === 'all' || warehouse.businessId === businessFilter)
        && (statusFilter === 'all' || warehouse.status === statusFilter);
    });
  }, [businessFilter, businessUnitFilter, query, statusFilter, t.operational.warehouseTypes, warehouses]);

  const hasFilters = Boolean(query.trim()) || businessUnitFilter !== 'all' || businessFilter !== 'all' || statusFilter !== 'all';
  const resetFilters = () => {
    setQuery('');
    setBusinessUnitFilter('all');
    setBusinessFilter('all');
    setStatusFilter('all');
  };
  const pagination = useTablePagination({
    resetKey: `${query}|${businessUnitFilter}|${businessFilter}|${statusFilter}|${filteredWarehouses.map((warehouse) => warehouse.id).join('|')}`,
    rows: filteredWarehouses,
  });

  return (
    <div className="space-y-5">
      <SalesFilterBar
        title={t.operational.filtersTitle}
        gridClassName="lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]"
        summary={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span>{t.operational.modals.warehouseCount(filteredWarehouses.length)}</span>
            {hasFilters ? (
              <Button type="button" variant="ghost" className="h-9 gap-2 rounded-lg px-3 text-sm font-medium text-[#B63B32] hover:bg-[#FF6B5E]/10 hover:text-[#B63B32]" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" />{t.operational.actions.clearFilters}
              </Button>
            ) : null}
            {onCreate ? <Button type="button" className="h-9 gap-2 rounded-lg bg-[#FF6B5E] px-3 text-sm font-medium text-[#222831] hover:bg-[#E85C50]" onClick={onCreate}><Plus className="h-4 w-4" />{t.operational.actions.createWarehouse}</Button> : null}
          </div>
        )}
      >
        <SalesFilterSearch label={t.operational.filterLabels.searchWarehouse} value={query} onValueChange={setQuery} placeholder={t.operational.filterLabels.searchWarehouse} />
        <SalesFilterSelect label={t.operational.filterLabels.businessUnit} value={businessUnitFilter} onValueChange={(value) => {
          setBusinessUnitFilter(value);
          setBusinessFilter('all');
        }} options={[{ value: 'all', label: `${t.common.all} · ${t.operational.filterLabels.businessUnit}` }, ...businessUnitOptions]} />
        <SalesFilterSelect label={t.operational.filterLabels.business} value={businessFilter} onValueChange={setBusinessFilter} options={[{ value: 'all', label: `${t.common.all} · ${t.operational.filterLabels.business}` }, ...businessOptions]} />
        <SalesFilterSelect label={t.operational.filterLabels.status} value={statusFilter} onValueChange={setStatusFilter} options={[
          { value: 'all', label: t.filters.allStatuses },
          { value: 'active', label: t.filters.active },
          { value: 'inactive', label: t.filters.inactive },
        ]} />
      </SalesFilterBar>

      {filteredWarehouses.length === 0 ? (
        <section className="grid min-h-64 place-items-center rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div>
            <PackageOpen className="mx-auto h-9 w-9 text-slate-400" />
            <p className="mt-3 text-base font-medium text-slate-800 dark:text-white">{t.operational.emptyStates.warehousesTitle}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.operational.emptyStates.warehousesDescription}</p>
            {hasFilters ? <Button type="button" variant="outline" className="mt-4 h-10 gap-2 rounded-lg" onClick={resetFilters}><RotateCcw className="h-4 w-4" />{t.operational.actions.clearFilters}</Button> : null}
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <Table className="min-w-[1040px]">
              <TableHeader className="bg-slate-50/90 dark:bg-slate-900">
                <TableRow className="border-slate-200 dark:border-slate-700">
                  <TableHead className={`${headClass} min-w-[260px]`}>{t.operational.columns.warehouse}</TableHead>
                  {visibleColumns.map((column) => <WarehouseColumnHead key={column} column={column} t={t} />)}
                  <TableHead className={`${headClass} min-w-[170px] text-right`}>{t.operational.columns.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedRows.map((warehouse) => {
                  const summary = summaries.get(warehouse.id);
                  const hasStock = (summary?.totalUnits ?? 0) > 0;
                  const invalidAssignment = invalidWarehouseIds.has(warehouse.id);
                  return (
                    <TableRow key={warehouse.id} className="border-slate-100 transition-colors hover:bg-[#FF6B5E]/[0.04] dark:border-slate-700 dark:hover:bg-slate-700/50">
                      <TableCell className="px-4 py-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-[#FF6B5E]" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{warehouse.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="rounded-full border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 px-2 py-0.5 text-[11px] font-medium text-[#B63B32]">{t.operational.warehouseTypes[warehouse.type]}</span>
                              {invalidAssignment ? <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700"><AlertTriangle className="h-3 w-3" />{t.operational.modals.organizationMissing}</span> : null}
                            </div>
                            <p className="mt-1 truncate text-xs text-slate-500">{warehouse.jurisdiction || t.common.notAvailable}</p>
                          </div>
                        </div>
                      </TableCell>
                      {visibleColumns.map((column) => <WarehouseColumnCell key={column} column={column} warehouse={warehouse} summary={summary} t={t} />)}
                      <TableCell className="px-4 py-4 text-right">
                        <div className="inline-flex justify-end gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                          {onViewInventory ? <ActionButton title={t.operational.actions.viewInventory} icon={<Eye className="h-4 w-4" />} onClick={() => onViewInventory(warehouse.id)} /> : null}
                          {onEdit ? <ActionButton title={t.operational.modals.editWarehouseTitle} icon={<Pencil className="h-4 w-4" />} onClick={() => onEdit(warehouse)} /> : null}
                          <ActionButton destructive={!hasStock} transfer={hasStock} title={hasStock ? t.operational.modals.transferAndDeleteWarehouse : t.operational.modals.deleteWarehouse} icon={hasStock ? <ArrowRightLeft className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />} onClick={() => onRequestDelete(warehouse)} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination currentPage={pagination.currentPage} itemLabel={t.operational.views.warehouses.toLocaleLowerCase()} onPageChange={pagination.onPageChange} onPageSizeChange={pagination.onPageSizeChange} pageEnd={pagination.pageEnd} pageSize={pagination.pageSize} pageSizeOptions={pagination.pageSizeOptions} pageStart={pagination.pageStart} totalCount={pagination.totalCount} totalPages={pagination.totalPages} />
        </section>
      )}
    </div>
  );
}

function WarehouseColumnHead({ column, t }: { column: WarehouseTableColumnId; t: InventoryTranslations }) {
  const numeric = column === 'storedItems' || column === 'totalUnits' || column === 'estimatedValue';
  return <TableHead className={`${headClass} ${numeric ? 'text-right' : column === 'status' ? 'text-center' : ''}`}>{t.operational.columns[column]}</TableHead>;
}

function WarehouseColumnCell({ column, warehouse, summary, t }: { column: WarehouseTableColumnId; warehouse: InventoryWarehouse; summary?: WarehouseSummary; t: InventoryTranslations }) {
  if (column === 'businessUnit') return <TableCell className={`${bodyClass} min-w-[180px]`}><p className="truncate">{warehouse.businessUnitName || t.common.notAvailable}</p>{warehouse.businessName ? <p className="mt-0.5 truncate text-xs text-slate-500">{warehouse.businessName}</p> : null}</TableCell>;
  if (column === 'responsible') return <TableCell className={`${bodyClass} min-w-[150px]`}>{warehouse.responsibleName || t.common.notAvailable}</TableCell>;
  if (column === 'storedItems') return <TableCell className={numberClass}>{formatInventoryNumber(summary?.storedItems ?? 0)}</TableCell>;
  if (column === 'totalUnits') return <TableCell className={numberClass}>{formatInventoryNumber(summary?.totalUnits ?? 0)}</TableCell>;
  if (column === 'estimatedValue') return <TableCell className={numberClass}>{formatInventoryCurrency(summary?.estimatedValue ?? 0)}</TableCell>;
  return <TableCell className={`${bodyClass} text-center`}><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${warehouse.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{warehouse.status === 'active' ? t.filters.active : t.filters.inactive}</span></TableCell>;
}

function ActionButton({ destructive = false, transfer = false, icon, title, onClick }: { destructive?: boolean; transfer?: boolean; icon: ReactNode; title: string; onClick: () => void }) {
  return <Button type="button" variant="outline" size="icon" className={`h-9 w-9 rounded-lg ${destructive ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : transfer ? 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100' : 'border-slate-200 bg-white text-slate-700 hover:border-[#FF6B5E] hover:text-[#B63B32]'}`} onClick={onClick} aria-label={title} title={title}>{icon}</Button>;
}
