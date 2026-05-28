import type { ReactNode } from 'react';
import { ArrowRightLeft, Eye, Package, PackagePlus, PencilLine } from 'lucide-react';
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
        'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6B5E]/20',
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
        className="h-11 w-11 rounded-lg border border-slate-200 object-cover"
      />
    );
  }

  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32]">
      <Package className="h-5 w-5" />
    </span>
  );
}

function BooleanBadge({ value, t }: { value?: boolean; t: InventoryTranslations }) {
  return (
    <Badge className={cn(
      'rounded-full border px-2 py-1 text-xs font-bold',
      value ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600',
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
      <p className="font-black text-slate-950">{item.locationName}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{breadcrumb}</p>
      {item.locationType ? (
        <Badge className="mt-2 rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32]">
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

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-[#FF6B5E]" />
          <h3 className="text-xl font-black text-slate-950">{t.table.title}</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500">{t.table.description}</p>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[1420px] table-fixed">
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
              {visibleColumns.map((column) => (
                <TableHead
                  key={column}
                  className={cn(
                    'px-5 py-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500',
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
                <TableCell colSpan={visibleColumns.length} className="px-5 py-12 text-center text-sm font-semibold text-slate-500">
                  {t.table.empty}
                </TableCell>
              </TableRow>
            ) : items.map((item) => (
              <TableRow key={item.id} className="border-slate-200 align-top hover:bg-slate-50/80">
                {isVisible('item') ? (
                  <TableCell className="px-5 py-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <InventoryThumbnail item={item} />
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950">{item.name}</p>
                        <p className="mt-1 line-clamp-2 max-w-[280px] text-sm leading-5 text-slate-500">{item.description}</p>
                        {item.isPackage ? (
                          <p className="mt-2 rounded-lg border border-[#F4C84A]/35 bg-[#F4C84A]/10 px-2 py-1 text-xs font-semibold text-[#9a6b05]">
                            {t.table.packageWarning}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                ) : null}
                {isVisible('sku') ? <TableCell className="truncate px-5 py-5 font-semibold text-slate-700">{item.sku ?? t.common.notAvailable}</TableCell> : null}
                {isVisible('category') ? <TableCell className="truncate px-5 py-5 font-semibold text-slate-700">{item.category ?? t.common.notAvailable}</TableCell> : null}
                {isVisible('location') ? <TableCell className="px-5 py-5"><LocationCell item={item} t={t} /></TableCell> : null}
                {isVisible('availableStock') ? <TableCell className="px-5 py-5 font-black text-slate-950">{formatInventoryNumber(item.availableStock)}</TableCell> : null}
                {isVisible('reservedStock') ? <TableCell className="px-5 py-5 font-semibold text-slate-600">{formatInventoryNumber(item.reservedStock)}</TableCell> : null}
                {isVisible('minimumStock') ? <TableCell className="px-5 py-5 font-semibold text-slate-600">{formatInventoryNumber(item.minimumStock)}</TableCell> : null}
                {isVisible('status') ? (
                  <TableCell className="px-5 py-5">
                    <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold', inventoryStatusTone[item.status])}>
                      {t.status[item.status]}
                    </Badge>
                    <p className="mt-1 text-xs font-medium text-slate-500">{t.statusHelpers[item.status]}</p>
                  </TableCell>
                ) : null}
                {isVisible('estimatedValue') ? <TableCell className="px-5 py-5 font-black text-slate-950">{formatInventoryCurrency(item.estimatedValue)}</TableCell> : null}
                {isVisible('lastMovement') ? <TableCell className="truncate px-5 py-5 font-semibold text-slate-600">{item.lastMovementAt ?? t.common.notAvailable}</TableCell> : null}
                {isVisible('itemType') ? <TableCell className="truncate px-5 py-5 font-semibold text-slate-700">{item.type}</TableCell> : null}
                {isVisible('unit') ? <TableCell className="truncate px-5 py-5 font-semibold text-slate-700">{item.unit}</TableCell> : null}
                {isVisible('averageCost') ? <TableCell className="px-5 py-5 font-semibold text-slate-700">{formatInventoryCurrency(item.averageCost)}</TableCell> : null}
                {isVisible('usesInventory') ? <TableCell className="px-5 py-5"><BooleanBadge value={item.usesInventory} t={t} /></TableCell> : null}
                {isVisible('readyForPOS') ? <TableCell className="px-5 py-5"><BooleanBadge value={item.readyForPOS} t={t} /></TableCell> : null}
                {isVisible('readyForSales') ? <TableCell className="px-5 py-5"><BooleanBadge value={item.readyForSales} t={t} /></TableCell> : null}
                {isVisible('actions') ? (
                  <TableCell className="px-5 py-5">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
                      <InventoryAction label={t.actions.viewMovements} icon={<Eye className="h-4 w-4" />} className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/15" onClick={() => onViewMovements(item)} />
                      <InventoryAction label={t.actions.newMovement} icon={<PackagePlus className="h-4 w-4" />} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" onClick={() => onNewMovement(item, 'stockIn')} />
                      <InventoryAction label={t.actions.adjustStock} icon={<PencilLine className="h-4 w-4" />} className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50" onClick={() => onNewMovement(item, 'adjustment')} />
                      <InventoryAction label={t.actions.transfer} icon={<ArrowRightLeft className="h-4 w-4" />} className="border-[#F4C84A]/40 bg-[#F4C84A]/10 text-[#9a6b05] hover:bg-[#F4C84A]/20" onClick={() => onNewMovement(item, 'transfer')} />
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
