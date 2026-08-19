import { useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import type { InventoryMovementEntryLine, InventoryStockRow } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { formatInventoryNumber } from '../../utils/inventoryFormatters';
import {
  InventoryModalField,
  InventoryModalSection,
  inventoryModalControlClassName,
  sortInventoryOptions,
} from '../InventoryModalPrimitives';

export type MovementProductLineDraft = InventoryMovementEntryLine;

export function createMovementProductLine(productId = ''): MovementProductLineDraft {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId,
    quantity: 1,
  };
}

export function MovementProductLines({
  rows,
  items,
  fromWarehouseId,
  needsAvailabilityCheck,
  layout = 'stacked',
  t,
  onItemsChange,
}: {
  rows: InventoryStockRow[];
  items: MovementProductLineDraft[];
  fromWarehouseId: string;
  needsAvailabilityCheck: boolean;
  layout?: 'stacked' | 'workspace';
  t: InventoryTranslations;
  onItemsChange: (items: MovementProductLineDraft[]) => void;
}) {
  const selectableRows = useMemo(() => [...rows]
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })), [rows]);
  const firstProductId = selectableRows[0]?.productId ?? '';
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLowerCase();
  const searchResults = useMemo(() => {
    const sourceRows = normalizedSearch
      ? rows.filter((row) => [row.name, row.sku, row.category, row.type, row.description].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch)))
      : selectableRows;

    return sourceRows.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })).slice(0, 8);
  }, [normalizedSearch, rows, selectableRows]);

  const updateLine = (lineId: string, patch: Partial<MovementProductLineDraft>) => {
    onItemsChange(items.map((item) => (item.id === lineId ? { ...item, ...patch } : item)));
  };

  const removeLine = (lineId: string) => {
    if (items.length === 1) return;
    onItemsChange(items.filter((item) => item.id !== lineId));
  };

  const addProductLine = (productId: string) => {
    const existingLine = items.find((item) => item.productId === productId);
    if (existingLine) {
      onItemsChange(items.map((item) => (item.id === existingLine.id ? { ...item, quantity: item.quantity + 1 } : item)));
      return;
    }

    const emptyLine = items.find((item) => !item.productId);
    if (emptyLine) {
      onItemsChange(items.map((item) => (item.id === emptyLine.id ? { ...item, productId, quantity: Math.max(item.quantity, 1) } : item)));
      return;
    }

    onItemsChange([...items, createMovementProductLine(productId)]);
  };

  return (
    <InventoryModalSection>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-medium text-slate-900 dark:text-white">{t.operational.modals.products}</h3>
          <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-[#FF6B5E]/10 px-2 py-1 text-xs font-medium tabular-nums text-[#B63B32]">{items.length}</span>
        </div>
        {layout === 'stacked' ? <Button
          type="button"
          variant="outline"
          className="h-9 gap-2 rounded-lg border-[#FF6B5E]/25 bg-white px-3 text-xs font-medium text-[#B63B32] hover:bg-[#FF6B5E]/10"
          onClick={() => onItemsChange([...items, createMovementProductLine(firstProductId)])}
        >
          <Plus className="h-4 w-4" />
          {t.operational.modals.addProduct}
        </Button> : null}
      </div>

      <div className={layout === 'workspace' ? 'grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]' : ''}>
      <div className={`${layout === 'workspace' ? 'min-h-0' : 'mb-4'} rounded-lg border border-slate-200 bg-slate-50/70 p-3`}>
        <InventoryModalField label={t.operational.modals.searchProducts}>
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.operational.modals.searchProductsPlaceholder}
              className={`${inventoryModalControlClassName} pl-10`}
            />
          </span>
        </InventoryModalField>
        <div className={`mt-3 grid gap-2 ${layout === 'workspace' ? 'max-h-[420px] overflow-y-auto pr-1 sm:grid-cols-2' : 'md:grid-cols-2'}`}>
          {searchResults.map((row) => (
            <button
              key={row.productId}
              type="button"
              aria-label={`${t.operational.modals.addProduct}: ${row.name}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-[#FF6B5E]/40 hover:bg-[#FF6B5E]/5"
              onClick={() => addProductLine(row.productId)}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-900">{row.name}</span>
                <span className="block truncate text-xs font-medium text-slate-500">{row.sku} · {row.category}</span>
              </span>
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32]"
              >
                <Plus className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={`${layout === 'workspace' ? 'max-h-[31rem] overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 pr-2 dark:border-slate-700 dark:bg-slate-900/40' : ''} space-y-3`}>
        {items.map((item) => {
          const row = rows.find((stockRow) => stockRow.productId === item.productId);
          const available = row?.distributions.find((distribution) => distribution.warehouseId === fromWarehouseId)?.available ?? 0;
          const hasAvailabilityIssue = needsAvailabilityCheck && item.quantity > available;

          return (
            <div key={item.id} className={`grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] ${hasAvailabilityIssue ? 'border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-950/30' : 'border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/70'}`}>
              <InventoryModalField label={t.operational.modals.product}>
                <Select value={item.productId} onValueChange={(productId) => updateLine(item.id, { productId })}>
                  <SelectTrigger className={inventoryModalControlClassName}>
                    <SelectValue placeholder={t.operational.emptyStates.noProducts} />
                  </SelectTrigger>
                  <SelectContent>
                    {sortInventoryOptions(selectableRows.map((stockRow) => ({ value: stockRow.productId, label: stockRow.name }))).map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {needsAvailabilityCheck ? (
                  <span className={`text-xs font-medium ${hasAvailabilityIssue ? 'text-red-600' : 'text-slate-500'}`}>
                    {t.operational.modals.available}: {formatInventoryNumber(available)}
                  </span>
                ) : null}
              </InventoryModalField>

              <InventoryModalField label={t.operational.modals.quantity}>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(event) => updateLine(item.id, { quantity: Number(event.target.value) })}
                  className={inventoryModalControlClassName}
                />
              </InventoryModalField>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  disabled={items.length === 1}
                  title={t.operational.modals.removeProduct}
                  aria-label={t.operational.modals.removeProduct}
                  onClick={() => removeLine(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </InventoryModalSection>
  );
}
