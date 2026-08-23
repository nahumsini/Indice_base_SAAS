import { useMemo, useState } from 'react';
import { Check, Plus, Search, Trash2 } from 'lucide-react';
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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stagedQuantities, setStagedQuantities] = useState<Record<string, number>>({});
  const normalizedSearch = search.trim().toLowerCase();
  const categoryOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.category).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' })), [rows]);
  const searchResults = useMemo(() => {
    const sourceRows = normalizedSearch
      ? rows.filter((row) => [row.name, row.sku, row.category, row.type, row.description].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch)))
      : selectableRows;

    return sourceRows.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })).slice(0, 8);
  }, [normalizedSearch, rows, selectableRows]);
  const workspaceResults = useMemo(() => selectableRows.filter((row) => {
    const matchesSearch = !normalizedSearch || [row.name, row.sku, row.category, row.type, row.description]
      .some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch));
    return matchesSearch && (categoryFilter === 'all' || row.category === categoryFilter);
  }), [categoryFilter, normalizedSearch, selectableRows]);
  const stagedEntries = Object.entries(stagedQuantities).filter(([, quantity]) => Number.isFinite(quantity) && quantity > 0);
  const stagedSelectionIsValid = stagedEntries.length > 0
    && Object.values(stagedQuantities).every((quantity) => Number.isInteger(quantity) && quantity > 0);

  const updateLine = (lineId: string, patch: Partial<MovementProductLineDraft>) => {
    onItemsChange(items.map((item) => (item.id === lineId ? { ...item, ...patch } : item)));
  };

  const removeLine = (lineId: string) => {
    if (layout !== 'workspace' && items.length === 1) return;
    onItemsChange(items.filter((item) => item.id !== lineId));
  };

  const toggleStagedProduct = (productId: string) => {
    setStagedQuantities((current) => {
      if (productId in current) {
        const next = { ...current };
        delete next[productId];
        return next;
      }
      return { ...current, [productId]: 1 };
    });
  };

  const loadStagedProducts = () => {
    if (!stagedSelectionIsValid) return;
    const nextItems = [...items];
    stagedEntries.forEach(([productId, quantity]) => {
      const existingIndex = nextItems.findIndex((item) => item.productId === productId);
      if (existingIndex >= 0) nextItems[existingIndex] = { ...nextItems[existingIndex], quantity };
      else nextItems.push({ ...createMovementProductLine(productId), quantity });
    });
    const normalizedItems = nextItems.filter((item) => item.id && item.productId && item.quantity > 0).map((item) => {
      const stagedQuantity = stagedQuantities[item.productId];
      return stagedQuantity ? { ...item, quantity: stagedQuantity } : item;
    });
    onItemsChange(normalizedItems);
    setStagedQuantities({});
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

  if (layout === 'workspace') {
    return (
      <InventoryModalSection>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-medium text-slate-900 dark:text-white">Carga masiva de productos</h3>
            <p className="mt-1 text-xs text-slate-500">Selecciona productos y cantidades. Esta acción sólo los carga al borrador del modal.</p>
          </div>
          <span className="rounded-full bg-[#FF6B5E]/10 px-3 py-1.5 text-xs font-medium text-[#B63B32]">{items.length} cargados</span>
        </div>

        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="grid gap-3 border-b border-slate-200 bg-slate-50/80 p-3 sm:grid-cols-[minmax(0,1fr)_15rem] dark:border-slate-700 dark:bg-slate-800/60">
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.operational.modals.searchProductsPlaceholder} className={`${inventoryModalControlClassName} pl-10`} />
              </span>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className={inventoryModalControlClassName}><SelectValue placeholder="Todas las categorías" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categoryOptions.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-[25rem] overflow-auto">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="w-12 border-b border-r border-slate-200 px-3 py-3 text-center font-medium dark:border-slate-700">✓</th>
                    <th className="border-b border-r border-slate-200 px-3 py-3 text-left font-medium dark:border-slate-700">Producto</th>
                    <th className="w-36 border-b border-r border-slate-200 px-3 py-3 text-left font-medium dark:border-slate-700">SKU</th>
                    <th className="w-44 border-b border-r border-slate-200 px-3 py-3 text-left font-medium dark:border-slate-700">Categoría</th>
                    <th className="w-32 border-b border-slate-200 px-3 py-3 text-left font-medium dark:border-slate-700">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaceResults.map((row) => {
                    const selected = row.productId in stagedQuantities;
                    const quantity = stagedQuantities[row.productId] ?? 1;
                    const invalidQuantity = selected && (!Number.isInteger(quantity) || quantity <= 0);
                    return (
                      <tr key={row.productId} className={selected ? 'bg-[#FF6B5E]/5' : 'bg-white dark:bg-slate-900'}>
                        <td className="border-b border-r border-slate-200 px-3 py-2 text-center dark:border-slate-700">
                          <input type="checkbox" checked={selected} onChange={() => toggleStagedProduct(row.productId)} aria-label={`Seleccionar ${row.name}`} className="h-4 w-4 rounded border-slate-300 accent-[#FF6B5E]" />
                        </td>
                        <td className="border-b border-r border-slate-200 px-3 py-2 dark:border-slate-700"><span className="block max-w-sm truncate font-medium text-slate-900 dark:text-white">{row.name}</span></td>
                        <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 dark:border-slate-700 dark:text-slate-300">{row.sku}</td>
                        <td className="border-b border-r border-slate-200 px-3 py-2 text-slate-600 dark:border-slate-700 dark:text-slate-300">{row.category}</td>
                        <td className="border-b border-slate-200 p-1.5 dark:border-slate-700">
                          <Input type="number" min={1} step={1} disabled={!selected} aria-invalid={invalidQuantity} value={quantity} onChange={(event) => setStagedQuantities((current) => ({ ...current, [row.productId]: Number(event.target.value) }))} className={`h-9 rounded-md ${invalidQuantity ? 'border-red-400 ring-1 ring-red-300' : ''}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {workspaceResults.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500">No hay productos que coincidan con los filtros.</p> : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
              <span className="text-xs text-slate-500">{stagedEntries.length} productos seleccionados</span>
              <Button type="button" disabled={!stagedSelectionIsValid} className="h-10 gap-2 rounded-lg bg-[#FF6B5E] px-4 text-white hover:bg-[#E9574F]" onClick={loadStagedProducts}><Check className="h-4 w-4" />Seleccionar</Button>
            </div>
          </div>

          <div className="max-h-[32rem] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-3"><h4 className="text-sm font-medium text-slate-900 dark:text-white">Productos cargados</h4><span className="text-xs text-slate-500">{items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} unidades</span></div>
            {items.length === 0 ? <p className="rounded-lg bg-slate-50 px-3 py-8 text-center text-sm text-slate-500 dark:bg-slate-800">Selecciona productos en la tabla y cárgalos aquí.</p> : (
              <div className="space-y-2">
                {items.map((item) => {
                  const row = rows.find((stockRow) => stockRow.productId === item.productId);
                  const invalidQuantity = !Number.isInteger(item.quantity) || item.quantity <= 0;
                  return (
                    <div key={item.id} className={`grid grid-cols-[minmax(0,1fr)_6rem_2.75rem] items-center gap-2 rounded-lg border p-2 ${invalidQuantity ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/70'}`}>
                      <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900 dark:text-white">{row?.name ?? t.common.notAvailable}</p><p className="truncate text-xs text-slate-500">{row?.sku ?? t.common.notAvailable}</p></div>
                      <Input type="number" min={1} step={1} aria-invalid={invalidQuantity} value={item.quantity} onChange={(event) => updateLine(item.id, { quantity: Number(event.target.value) })} className={`h-9 rounded-md ${invalidQuantity ? 'border-red-400' : ''}`} />
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100" aria-label={`${t.operational.modals.removeProduct}: ${row?.name ?? ''}`} onClick={() => removeLine(item.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </InventoryModalSection>
    );
  }

  return (
    <InventoryModalSection>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-medium text-slate-900 dark:text-white">{t.operational.modals.products}</h3>
          <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-[#FF6B5E]/10 px-2 py-1 text-xs font-medium tabular-nums text-[#B63B32]">{items.length}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-2 rounded-lg border-[#FF6B5E]/25 bg-white px-3 text-xs font-medium text-[#B63B32] hover:bg-[#FF6B5E]/10"
          onClick={() => onItemsChange([...items, createMovementProductLine(firstProductId)])}
        >
          <Plus className="h-4 w-4" />
          {t.operational.modals.addProduct}
        </Button>
      </div>

      <div>
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
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
        <div className="mt-3 grid gap-2 md:grid-cols-2">
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

      <div className="space-y-3">
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
