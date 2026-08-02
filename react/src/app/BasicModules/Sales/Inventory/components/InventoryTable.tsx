import type { ReactNode } from 'react';
import { ArrowRightLeft, Eye, Package, PackagePlus, PencilLine } from 'lucide-react';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { Badge } from '../../../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { cn } from '../../../../components/ui/utils';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import type { InventoryColumnId, InventoryStockItem } from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';
import { formatInventoryCurrency, formatInventoryNumber } from '../utils/inventoryFormatters';
import { inventoryStatusTone } from '../utils/inventoryStatus';

function InventoryAction({
  label,
  icon,
  className,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/30',
        className,
      )}
    >
      {icon}
    </button>
  );
}

function InventoryThumbnail({ item }: { item: InventoryStockItem }) {
  if (item.thumbnailUrl) {
    return (
      <img
        src={item.thumbnailUrl}
        alt={item.thumbnailAlt || item.name}
        className="h-11 w-11 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
      />
    );
  }

  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/15 dark:text-[#FFB5AD]">
      <Package className="h-5 w-5" />
    </span>
  );
}

function BooleanBadge({ value, t }: { value?: boolean; t: InventoryTranslations }) {
  return (
    <Badge className={cn(
      'rounded-full border px-2 py-1 text-xs font-medium',
      value
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-200'
        : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
    )}>
      {value ? t.common.yes : t.common.no}
    </Badge>
  );
}

function LocationCell({ item, t }: { item: InventoryStockItem; t: InventoryTranslations }) {
  const breadcrumb = item.scopeType === 'business'
    ? `${t.scopeTypes.company} / ${item.businessUnitName ?? t.common.notAvailable} / ${item.businessName ?? t.common.notAvailable}`
    : item.scopeType === 'businessUnit'
      ? `${t.scopeTypes.company} / ${item.businessUnitName ?? t.common.notAvailable}`
      : t.scopeTypes.company;

  return (
    <div>
      <p className="font-medium text-slate-950 dark:text-white">{item.locationName}</p>
      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-300">{breadcrumb}</p>
      {item.locationType ? (
        <Badge className="mt-2 rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/15 dark:text-[#FFB5AD]">
          {t.locationTypes[item.locationType]}
        </Badge>
      ) : null}
    </div>
  );
}

export function InventoryTable({
  items,
  visibleColumns,
  t,
  onViewMovements,
  onNewMovement,
}: {
  items: InventoryStockItem[];
  visibleColumns: InventoryColumnId[];
  t: InventoryTranslations;
  onViewMovements: (item: InventoryStockItem) => void;
  onNewMovement: (item?: InventoryStockItem, movementType?: 'stockIn' | 'stockOut' | 'adjustment' | 'transfer') => void;
}) {
  const isVisible = (column: InventoryColumnId) => visibleColumns.includes(column);
  const {
    currentPage,
    onPageChange,
    onPageSizeChange,
    pageEnd,
    pageSize,
    pageSizeOptions,
    pageStart,
    paginatedRows: paginatedItems,
    totalCount,
    totalPages,
  } = useTablePagination({
    resetKey: items.map((item) => item.id).join('|'),
    rows: items,
  });

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-100 p-5 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-[#FF6B5E]" />
          <h3 className="text-xl font-medium text-slate-950 dark:text-white">{t.table.title}</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{t.table.description}</p>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[1420px] table-fixed">
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-900">
              {visibleColumns.map((column) => (
                <TableHead
                  key={column}
                  className={cn(
                    'px-5 py-5 text-xs font-medium tracking-normal text-slate-500 dark:text-slate-300',
                    column === 'item' && 'w-[360px]',
                    column === 'actions' && 'w-[190px]',
                  )}
                >
                  {t.table.columns[column]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="px-5 py-12 text-center text-sm font-medium text-slate-500 dark:text-slate-300">
                  {t.table.empty}
                </TableCell>
              </TableRow>
            ) : paginatedItems.map((item) => (
              <TableRow key={item.id} className="border-slate-200 align-top hover:bg-slate-50/80 dark:border-slate-700 dark:hover:bg-slate-700/40">
                {isVisible('item') ? (
                  <TableCell className="px-5 py-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <InventoryThumbnail item={item} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-950 dark:text-white">{item.name}</p>
                        <p className="mt-1 line-clamp-2 max-w-[280px] text-sm leading-5 text-slate-500 dark:text-slate-300">{item.description}</p>
                        {item.isPackage ? (
                          <p className="mt-2 rounded-lg border border-[#F4C84A]/35 bg-[#F4C84A]/10 px-2 py-1 text-xs font-medium text-[#9a6b05] dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15 dark:text-[#F8D86A]">
                            {t.table.packageWarning}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                ) : null}
                {isVisible('sku') ? <TableCell className="truncate px-5 py-5 font-medium text-slate-700 dark:text-slate-300">{item.sku ?? t.common.notAvailable}</TableCell> : null}
                {isVisible('category') ? <TableCell className="truncate px-5 py-5 font-medium text-slate-700 dark:text-slate-300">{item.category ?? t.common.notAvailable}</TableCell> : null}
                {isVisible('location') ? <TableCell className="px-5 py-5"><LocationCell item={item} t={t} /></TableCell> : null}
                {isVisible('availableStock') ? <TableCell className="px-5 py-5 font-medium text-slate-950 dark:text-white">{formatInventoryNumber(item.availableStock)}</TableCell> : null}
                {isVisible('reservedStock') ? <TableCell className="px-5 py-5 font-medium text-slate-600 dark:text-slate-300">{formatInventoryNumber(item.reservedStock)}</TableCell> : null}
                {isVisible('minimumStock') ? <TableCell className="px-5 py-5 font-medium text-slate-600 dark:text-slate-300">{formatInventoryNumber(item.minimumStock)}</TableCell> : null}
                {isVisible('status') ? (
                  <TableCell className="px-5 py-5">
                    <Badge className={cn('rounded-full border px-2 py-1 text-xs font-medium', inventoryStatusTone[item.status])}>
                      {t.status[item.status]}
                    </Badge>
                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-300">{t.statusHelpers[item.status]}</p>
                  </TableCell>
                ) : null}
                {isVisible('estimatedValue') ? <TableCell className="px-5 py-5 font-medium text-slate-950 dark:text-white">{formatInventoryCurrency(item.estimatedValue)}</TableCell> : null}
                {isVisible('lastMovement') ? <TableCell className="truncate px-5 py-5 font-medium text-slate-600 dark:text-slate-300">{item.lastMovementAt ?? t.common.notAvailable}</TableCell> : null}
                {isVisible('itemType') ? <TableCell className="truncate px-5 py-5 font-medium text-slate-700 dark:text-slate-300">{item.type}</TableCell> : null}
                {isVisible('unit') ? <TableCell className="truncate px-5 py-5 font-medium text-slate-700 dark:text-slate-300">{item.unit}</TableCell> : null}
                {isVisible('averageCost') ? <TableCell className="px-5 py-5 font-medium text-slate-700 dark:text-slate-300">{formatInventoryCurrency(item.averageCost)}</TableCell> : null}
                {isVisible('usesInventory') ? <TableCell className="px-5 py-5"><BooleanBadge value={item.usesInventory} t={t} /></TableCell> : null}
                {isVisible('readyForPOS') ? <TableCell className="px-5 py-5"><BooleanBadge value={item.readyForPOS} t={t} /></TableCell> : null}
                {isVisible('readyForSales') ? <TableCell className="px-5 py-5"><BooleanBadge value={item.readyForSales} t={t} /></TableCell> : null}
                {isVisible('actions') ? (
                  <TableCell className="px-5 py-5">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <InventoryAction label={t.actions.viewMovements} icon={<Eye className="h-4 w-4" />} className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/15 dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/15 dark:text-[#FFB5AD] dark:hover:bg-[#FF6B5E]/20" onClick={() => onViewMovements(item)} />
                      <InventoryAction label={t.actions.newMovement} icon={<PackagePlus className="h-4 w-4" />} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/20" onClick={() => onNewMovement(item, 'stockIn')} />
                      <InventoryAction label={t.actions.adjustStock} icon={<PencilLine className="h-4 w-4" />} className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700" onClick={() => onNewMovement(item, 'adjustment')} />
                      <InventoryAction label={t.actions.transfer} icon={<ArrowRightLeft className="h-4 w-4" />} className="border-[#F4C84A]/40 bg-[#F4C84A]/10 text-[#9a6b05] hover:bg-[#F4C84A]/20 dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15 dark:text-[#F8D86A] dark:hover:bg-[#F4C84A]/20" onClick={() => onNewMovement(item, 'transfer')} />
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
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
    </section>
  );
}
