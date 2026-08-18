import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, Eye, PackageOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../../components/ui/table';
import type { InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { getWarehouseInventorySummary } from '../../utils/inventoryCalculations';
import { formatInventoryCurrency, formatInventoryNumber } from '../../utils/inventoryFormatters';

type WarehouseSummary = ReturnType<typeof getWarehouseInventorySummary>;
const headClass = 'h-12 whitespace-nowrap px-3 text-sm font-medium text-slate-500 dark:text-slate-300';
const numberClass = 'px-3 py-3 text-right text-sm font-medium tabular-nums text-slate-950 dark:text-white';

export function WarehouseManagerView({ warehouses, summaries, invalidWarehouseIds = new Set<string>(), t, onCreate, onEdit, onRequestDelete, onViewInventory }: {
  warehouses: InventoryWarehouse[];
  summaries: Map<string, WarehouseSummary>;
  invalidWarehouseIds?: Set<string>;
  t: InventoryTranslations;
  onCreate: () => void;
  onEdit?: (warehouse: InventoryWarehouse) => void;
  onRequestDelete: (warehouse: InventoryWarehouse) => void;
  onViewInventory?: (warehouseId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const filteredWarehouses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return warehouses;
    return warehouses.filter((warehouse) => [warehouse.name, warehouse.businessUnitName, warehouse.businessName, warehouse.jurisdiction, warehouse.responsibleName, t.operational.warehouseTypes[warehouse.type]].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)));
  }, [query, t, warehouses]);

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <label className="relative min-w-0 flex-1">
          <span className="mb-1.5 block text-xs font-normal text-slate-600">{t.operational.filterLabels.searchWarehouse}</span>
          <Search className="pointer-events-none absolute bottom-3.5 left-3 h-4 w-4 text-slate-400" />
          <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.operational.filterLabels.searchWarehouse} className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10" />
        </label>
        <span className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-normal text-slate-600">{t.operational.modals.warehouseCount(filteredWarehouses.length)}</span>
        <Button type="button" className="h-11 gap-2 rounded-xl bg-[#FF6B5E] px-5 font-normal text-[#222831] hover:bg-[#E85C50]" onClick={onCreate}><Plus className="h-4 w-4" />{t.operational.actions.createWarehouse}</Button>
      </section>

      {filteredWarehouses.length === 0 ? (
        <section className="grid min-h-56 place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div><PackageOpen className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 text-base font-normal text-slate-800">{t.operational.emptyStates.warehousesTitle}</p><p className="mt-1 text-xs font-medium text-slate-500">{t.operational.emptyStates.warehousesDescription}</p></div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/90 dark:bg-slate-900">
                <TableRow className="border-slate-200 dark:border-slate-700">
                  <TableHead className={`${headClass} min-w-[220px] px-4`}>{t.operational.columns.warehouse}</TableHead>
                  <TableHead className={`${headClass} min-w-[170px]`}>{t.operational.columns.businessUnit}</TableHead>
                  <TableHead className={`${headClass} min-w-[150px]`}>{t.operational.columns.responsible}</TableHead>
                  <TableHead className={`${headClass} text-right`}>{t.operational.columns.storedItems}</TableHead>
                  <TableHead className={`${headClass} text-right`}>{t.operational.columns.totalUnits}</TableHead>
                  <TableHead className={`${headClass} text-right`}>{t.operational.columns.estimatedValue}</TableHead>
                  <TableHead className={`${headClass} text-center`}>{t.operational.columns.status}</TableHead>
                  <TableHead className={`${headClass} min-w-[190px] px-4 text-right`}>{t.operational.columns.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWarehouses.map((warehouse) => {
                  const summary = summaries.get(warehouse.id);
                  const hasStock = (summary?.totalUnits ?? 0) > 0;
                  const invalidAssignment = invalidWarehouseIds.has(warehouse.id);
                  return (
                    <TableRow key={warehouse.id} className="border-slate-100 transition-colors hover:bg-[#FF6B5E]/[0.04] dark:border-slate-700 dark:hover:bg-slate-700/50">
                      <TableCell className="px-4 py-3">
                        <div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 h-9 w-1 shrink-0 rounded-full bg-[#FF6B5E]" aria-hidden="true" /><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{warehouse.name}</p><div className="mt-1 flex flex-wrap items-center gap-1.5"><span className="rounded-full border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 px-2 py-0.5 text-[11px] font-normal text-[#B63B32]">{t.operational.warehouseTypes[warehouse.type]}</span>{invalidAssignment ? <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700"><AlertTriangle className="h-3 w-3" />{t.operational.modals.organizationMissing}</span> : null}<span className="truncate text-xs text-slate-500">{warehouse.jurisdiction || t.common.notAvailable}</span></div></div></div>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200"><p className="truncate">{warehouse.businessUnitName || t.common.notAvailable}</p>{warehouse.businessName ? <p className="mt-0.5 truncate text-xs text-slate-500">{warehouse.businessName}</p> : null}</TableCell>
                      <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">{warehouse.responsibleName || t.common.notAvailable}</TableCell>
                      <TableCell className={numberClass}>{formatInventoryNumber(summary?.storedItems ?? 0)}</TableCell>
                      <TableCell className={numberClass}>{formatInventoryNumber(summary?.totalUnits ?? 0)}</TableCell>
                      <TableCell className={numberClass}>{formatInventoryCurrency(summary?.estimatedValue ?? 0)}</TableCell>
                      <TableCell className="px-3 py-3 text-center"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-normal ${warehouse.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{warehouse.status === 'active' ? t.filters.active : t.filters.inactive}</span></TableCell>
                      <TableCell className="px-4 py-3 text-right"><div className="flex justify-end gap-2">{onViewInventory ? <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => onViewInventory(warehouse.id)} aria-label={t.operational.actions.viewInventory} title={t.operational.actions.viewInventory}><Eye className="h-4 w-4" /></Button> : null}{onEdit ? <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-lg border-slate-200 bg-white text-slate-700 hover:border-[#FF6B5E] hover:text-[#B63B32]" onClick={() => onEdit(warehouse)} aria-label={t.operational.modals.editWarehouseTitle} title={t.operational.modals.editWarehouseTitle}><Pencil className="h-4 w-4" /></Button> : null}<Button type="button" variant="outline" size="icon" className={`h-9 w-9 rounded-lg ${hasStock ? 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`} onClick={() => onRequestDelete(warehouse)} aria-label={hasStock ? t.operational.modals.transferAndDeleteWarehouse : t.operational.modals.deleteWarehouse} title={hasStock ? t.operational.modals.transferAndDeleteWarehouse : t.operational.modals.deleteWarehouse}>{hasStock ? <ArrowRightLeft className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}</Button></div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
