import { useMemo, useState } from 'react';
import { ArrowDown, ArrowRightLeft, ArrowUp, ArrowUpDown, History, PackagePlus, SlidersHorizontal } from 'lucide-react';
import { DataTablePagination } from '../../../../../components/table/DataTablePagination';
import { Button } from '../../../../../components/ui/button';
import { Checkbox } from '../../../../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../../components/ui/table';
import { useTablePagination } from '../../../../../hooks/useTablePagination';
import { productCategories } from '../../../types';
import type { InventoryOperationalColumnId, InventoryStockRow } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { formatInventoryCurrency, formatInventoryNumber } from '../../utils/inventoryFormatters';
import { getStockHealth, getStockTotals } from '../../utils/inventoryCalculations';
import { StockWarehouseDistribution } from './StockWarehouseDistribution';

type SortDirection = 'asc' | 'desc';
type SortColumn = Exclude<InventoryOperationalColumnId, 'selection' | 'photo' | 'actions' | 'warehouseDistribution'>;
type SortState = {
  column: SortColumn;
  direction: SortDirection;
};

const statusTone = {
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  lowStock: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  outOfStock: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
  needsReview: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
  inactive: 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const headerClass = 'h-12 whitespace-nowrap px-3 text-sm font-semibold text-slate-500 dark:text-slate-300';
const numberClass = 'text-right font-semibold tabular-nums text-slate-900 dark:text-white';
const actionButtonClasses = [
  'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20',
  'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66] hover:bg-[#59C3A5]/20 dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10 dark:text-[#B8F3E4] dark:hover:bg-[#59C3A5]/20',
  'border-[#F4C84A]/35 bg-[#F4C84A]/15 text-[#9a6b05] hover:bg-[#F4C84A]/25 dark:border-[#F4C84A]/35 dark:bg-[#F4C84A]/10 dark:text-[#F9E7A0] dark:hover:bg-[#F4C84A]/20',
  'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] hover:bg-[#2563EB]/15 dark:border-[#2563EB]/35 dark:bg-[#2563EB]/15 dark:text-blue-200 dark:hover:bg-[#2563EB]/20',
];
const actionButtonBase = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/30 disabled:pointer-events-none disabled:opacity-50';

function getSortValue(row: InventoryStockRow, column: SortColumn) {
  const totals = getStockTotals(row);

  return {
    product: row.name,
    sku: row.sku,
    category: row.category,
    type: row.type,
    totalStock: totals.totalStock,
    available: totals.available,
    reserved: totals.reserved,
    minimum: row.minimumStock,
    status: getStockHealth(row),
    estimatedValue: totals.estimatedValue,
    lastMovement: row.lastMovementAt ?? '',
  }[column];
}

function ProductPhoto({ row, t }: { row: InventoryStockRow; t: InventoryTranslations }) {
  if (row.thumbnailUrl) {
    return <img src={row.thumbnailUrl} alt={row.thumbnailAlt ?? row.name} className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-50 object-cover dark:border-slate-700 dark:bg-slate-800" loading="lazy" />;
  }

  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
      {t.operational.columns.photo}
    </span>
  );
}

function SortableHead({
  column,
  label,
  sort,
  align = 'left',
  onSort,
}: {
  column: SortColumn;
  label: string;
  sort: SortState;
  align?: 'left' | 'right';
  onSort: (column: SortColumn) => void;
}) {
  const isActive = sort.column === column;
  const Icon = !isActive ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <TableHead className={`${headerClass} ${align === 'right' ? 'text-right' : ''}`}>
      <button type="button" className={`inline-flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''}`} onClick={() => onSort(column)}>
        {label}
        <Icon className={`h-4 w-4 ${isActive ? 'text-[#FF6B5E]' : 'text-slate-400 dark:text-slate-500'}`} />
      </button>
    </TableHead>
  );
}

export function StockTable({
  rows,
  visibleColumns,
  selectedState,
  t,
  onToggleRow,
  onAddStock,
  onTransfer,
  onAdjust,
  onViewMovements,
  onCategoryChange,
}: {
  rows: InventoryStockRow[];
  visibleColumns: InventoryOperationalColumnId[];
  selectedState: {
    isSelected: (id: string) => boolean;
  };
  t: InventoryTranslations;
  onToggleRow: (id: string, checked: boolean) => void;
  onAddStock: (row: InventoryStockRow) => void;
  onTransfer: (row: InventoryStockRow) => void;
  onAdjust: (row: InventoryStockRow) => void;
  onViewMovements: (row: InventoryStockRow) => void;
  onCategoryChange: (row: InventoryStockRow, category: InventoryStockRow['category']) => void;
}) {
  const [sort, setSort] = useState<SortState>({ column: 'product', direction: 'asc' });
  const canShow = (column: InventoryOperationalColumnId) => visibleColumns.includes(column);
  const sortedRows = useMemo(() => [...rows].sort((firstRow, secondRow) => {
    const firstValue = getSortValue(firstRow, sort.column);
    const secondValue = getSortValue(secondRow, sort.column);
    const modifier = sort.direction === 'asc' ? 1 : -1;

    if (typeof firstValue === 'number' && typeof secondValue === 'number') {
      return (firstValue - secondValue) * modifier;
    }

    return String(firstValue).localeCompare(String(secondValue), undefined, { numeric: true, sensitivity: 'base' }) * modifier;
  }), [rows, sort]);
  const {
    currentPage,
    onPageChange,
    onPageSizeChange,
    pageEnd,
    pageSize,
    pageSizeOptions,
    pageStart,
    paginatedRows,
    totalCount,
    totalPages,
  } = useTablePagination({
    resetKey: `${sort.column}:${sort.direction}:${rows.map((row) => row.id).join('|')}`,
    rows: sortedRows,
  });
  const pageRowIds = useMemo(() => paginatedRows.map((row) => row.id), [paginatedRows]);
  const allPageRowsSelected = pageRowIds.length > 0 && pageRowIds.every((id) => selectedState.isSelected(id));
  const somePageRowsSelected = !allPageRowsSelected && pageRowIds.some((id) => selectedState.isSelected(id));

  const toggleSort = (column: SortColumn) => {
    setSort((current) => ({
      column,
      direction: current.column === column && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/90 dark:bg-slate-900">
            <TableRow className="border-slate-200 dark:border-slate-700">
              <TableHead className="h-10 w-12 px-4">
                <Checkbox
                  checked={allPageRowsSelected ? true : somePageRowsSelected ? 'indeterminate' : false}
                  onCheckedChange={(checked) => {
                    pageRowIds.forEach((id) => onToggleRow(id, Boolean(checked)));
                  }}
                />
              </TableHead>
              {canShow('photo') ? <TableHead className={headerClass}>{t.operational.columns.photo}</TableHead> : null}
              {canShow('product') ? <SortableHead column="product" label={t.operational.columns.product} sort={sort} onSort={toggleSort} /> : null}
              {canShow('sku') ? <SortableHead column="sku" label={t.operational.columns.sku} sort={sort} onSort={toggleSort} /> : null}
              {canShow('category') ? <SortableHead column="category" label={t.operational.columns.category} sort={sort} onSort={toggleSort} /> : null}
              {canShow('type') ? <SortableHead column="type" label={t.operational.columns.type} sort={sort} onSort={toggleSort} /> : null}
              {canShow('totalStock') ? <SortableHead column="totalStock" label={t.operational.columns.totalStock} sort={sort} align="right" onSort={toggleSort} /> : null}
              {canShow('available') ? <SortableHead column="available" label={t.operational.columns.available} sort={sort} align="right" onSort={toggleSort} /> : null}
              {canShow('reserved') ? <SortableHead column="reserved" label={t.operational.columns.reserved} sort={sort} align="right" onSort={toggleSort} /> : null}
              {canShow('minimum') ? <SortableHead column="minimum" label={t.operational.columns.minimum} sort={sort} align="right" onSort={toggleSort} /> : null}
              {canShow('status') ? <SortableHead column="status" label={t.operational.columns.status} sort={sort} onSort={toggleSort} /> : null}
              {canShow('warehouseDistribution') ? <TableHead className={headerClass}>{t.operational.columns.warehouseDistribution}</TableHead> : null}
              {canShow('estimatedValue') ? <SortableHead column="estimatedValue" label={t.operational.columns.estimatedValue} sort={sort} align="right" onSort={toggleSort} /> : null}
              {canShow('lastMovement') ? <SortableHead column="lastMovement" label={t.operational.columns.lastMovement} sort={sort} onSort={toggleSort} /> : null}
              <TableHead className={`${headerClass} text-right`}>{t.operational.columns.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.map((row) => {
              const totals = getStockTotals(row);
              const health = getStockHealth(row);
              const selected = selectedState.isSelected(row.id);

              return (
                <TableRow key={row.id} className={`border-slate-100 dark:border-slate-700 ${selected ? 'bg-[#FF6B5E]/5 dark:bg-[#FF6B5E]/10' : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/40'}`}>
                  <TableCell className="px-4">
                    <Checkbox checked={selected} onCheckedChange={(checked) => onToggleRow(row.id, Boolean(checked))} />
                  </TableCell>
                  {canShow('photo') ? <TableCell className="px-3 py-2"><ProductPhoto row={row} t={t} /></TableCell> : null}
                  {canShow('product') ? <TableCell className="min-w-[260px] px-3 py-2"><div className="text-sm font-semibold leading-5 text-slate-950 dark:text-white">{row.name}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-300"><span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">{row.sku}</span><span className="max-w-[240px] truncate">{row.description}</span></div></TableCell> : null}
                  {canShow('sku') ? <TableCell className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{row.sku}</TableCell> : null}
                  {canShow('category') ? (
                    <TableCell className="px-3 py-2">
                      <Select value={row.category} onValueChange={(category) => onCategoryChange(row, category as InventoryStockRow['category'])}>
                        <SelectTrigger className="h-9 min-w-[150px] rounded-full border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-none focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {productCategories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  ) : null}
                  {canShow('type') ? <TableCell className="px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{row.type}</TableCell> : null}
                  {canShow('totalStock') ? <TableCell className={`px-3 py-2 ${numberClass}`}>{formatInventoryNumber(totals.totalStock)}</TableCell> : null}
                  {canShow('available') ? <TableCell className={`px-3 py-2 ${numberClass}`}>{formatInventoryNumber(totals.available)}</TableCell> : null}
                  {canShow('reserved') ? <TableCell className={`px-3 py-2 ${numberClass}`}>{formatInventoryNumber(totals.reserved)}</TableCell> : null}
                  {canShow('minimum') ? <TableCell className={`px-3 py-2 ${numberClass}`}>{formatInventoryNumber(row.minimumStock)}</TableCell> : null}
                  {canShow('status') ? <TableCell className="px-3 py-2"><span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone[health]}`}>{t.operational.statuses[health]}</span></TableCell> : null}
                  {canShow('warehouseDistribution') ? <TableCell><StockWarehouseDistribution distributions={row.distributions} t={t} /></TableCell> : null}
                  {canShow('estimatedValue') ? <TableCell className={`px-3 py-2 ${numberClass}`}>{formatInventoryCurrency(totals.estimatedValue)}</TableCell> : null}
                  {canShow('lastMovement') ? <TableCell className="px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{row.lastMovementAt ?? t.common.notAvailable}</TableCell> : null}
                  <TableCell className="px-3 py-2">
                    <div className="flex justify-end gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <Button size="icon" variant="ghost" className={`${actionButtonBase} ${actionButtonClasses[0]}`} title={t.operational.actions.addStock} onClick={() => onAddStock(row)}><PackagePlus className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className={`${actionButtonBase} ${actionButtonClasses[1]}`} title={t.operational.actions.transfer} onClick={() => onTransfer(row)}><ArrowRightLeft className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className={`${actionButtonBase} ${actionButtonClasses[2]}`} title={t.operational.actions.adjust} onClick={() => onAdjust(row)}><SlidersHorizontal className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className={`${actionButtonBase} ${actionButtonClasses[3]}`} title={t.operational.actions.viewMovements} onClick={() => onViewMovements(row)}><History className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        currentPage={currentPage}
        itemLabel="items"
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
  );
}
