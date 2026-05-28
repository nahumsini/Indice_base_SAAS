import { useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import type { InventoryMovementEntryLine, InventoryStockRow } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { formatInventoryNumber } from '../../utils/inventoryFormatters';

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
  t,
  onItemsChange,
}: {
  rows: InventoryStockRow[];
  items: MovementProductLineDraft[];
  fromWarehouseId: string;
  needsAvailabilityCheck: boolean;
  t: InventoryTranslations;
  onItemsChange: (items: MovementProductLineDraft[]) => void;
}) {
  const firstProductId = rows[0]?.productId ?? '';
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLowerCase();
  const searchResults = useMemo(() => {
    const sourceRows = normalizedSearch
      ? rows.filter((row) => [row.name, row.sku, row.category, row.type, row.description].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch)))
      : rows;

    return sourceRows.slice(0, 8);
  }, [normalizedSearch, rows]);

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
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">{t.operational.modals.products}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">{items.length} selected</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-2 rounded-xl border-[#FF6B5E]/25 bg-white px-3 text-xs font-black text-[#B63B32] hover:bg-[#FF6B5E]/10"
          onClick={() => onItemsChange([...items, createMovementProductLine(firstProductId)])}
        >
          <Plus className="h-4 w-4" />
          {t.operational.modals.addProduct}
        </Button>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <label className="grid gap-2">
          <FieldLabel>{t.operational.modals.searchProducts}</FieldLabel>
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.operational.modals.searchProductsPlaceholder}
              className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"
            />
          </span>
        </label>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {searchResults.map((row) => (
            <button
              key={row.productId}
              type="button"
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-[#FF6B5E]/40 hover:bg-[#FF6B5E]/5"
              onClick={() => addProductLine(row.productId)}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-slate-900">{row.name}</span>
                <span className="block truncate text-xs font-semibold text-slate-500">{row.sku} · {row.category}</span>
              </span>
              <span className="shrink-0 rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-2 py-1 text-xs font-black text-[#B63B32]">
                + Add
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const row = rows.find((stockRow) => stockRow.productId === item.productId);
          const available = row?.distributions.find((distribution) => distribution.warehouseId === fromWarehouseId)?.available ?? 0;
          const hasAvailabilityIssue = needsAvailabilityCheck && item.quantity > available;

          return (
            <div key={item.id} className={`grid gap-3 rounded-2xl border p-3 md:grid-cols-[minmax(0,1fr)_140px_auto] ${hasAvailabilityIssue ? 'border-red-200 bg-red-50/60' : 'border-slate-200 bg-slate-50/70'}`}>
              <label className="grid gap-2">
                <FieldLabel>{t.operational.modals.product}</FieldLabel>
                <Select value={item.productId} onValueChange={(productId) => updateLine(item.id, { productId })}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20">
                    <SelectValue placeholder={t.operational.emptyStates.noProducts} />
                  </SelectTrigger>
                  <SelectContent>
                    {rows.map((stockRow) => <SelectItem key={stockRow.productId} value={stockRow.productId}>{stockRow.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {needsAvailabilityCheck ? (
                  <span className={`text-xs font-bold ${hasAvailabilityIssue ? 'text-red-600' : 'text-slate-500'}`}>
                    {t.operational.modals.available}: {formatInventoryNumber(available)}
                  </span>
                ) : null}
              </label>

              <label className="grid gap-2">
                <FieldLabel>{t.operational.modals.quantity}</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(event) => updateLine(item.id, { quantity: Number(event.target.value) })}
                  className="h-11 rounded-xl border-slate-200 bg-white text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"
                />
              </label>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  disabled={items.length === 1}
                  title={t.operational.modals.removeProduct}
                  onClick={() => removeLine(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{children}</span>;
}
