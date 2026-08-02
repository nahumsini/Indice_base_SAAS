import { useMemo, useState } from 'react';
import { ArrowRightLeft, PackageOpen, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import type { InventoryStockRow, InventoryWarehouse } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';
import { getWarehouseInventorySummary } from '../../utils/inventoryCalculations';
import { formatInventoryCurrency, formatInventoryNumber } from '../../utils/inventoryFormatters';

type WarehouseSummary = ReturnType<typeof getWarehouseInventorySummary>;

export function WarehouseManagerView({
  warehouses,
  summaries,
  t,
  onCreate,
  onRequestDelete,
}: {
  warehouses: InventoryWarehouse[];
  summaries: Map<string, WarehouseSummary>;
  t: InventoryTranslations;
  onCreate: () => void;
  onRequestDelete: (warehouse: InventoryWarehouse) => void;
}) {
  const [query, setQuery] = useState('');
  const filteredWarehouses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return warehouses;
    return warehouses.filter((warehouse) => [
      warehouse.name,
      warehouse.businessUnitName,
      warehouse.businessName,
      warehouse.jurisdiction,
      warehouse.responsibleName,
      t.operational.warehouseTypes[warehouse.type],
    ].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)));
  }, [query, t, warehouses]);

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <label className="relative min-w-0 flex-1">
          <span className="mb-1.5 block text-xs font-normal text-slate-600">{t.operational.filterLabels.searchWarehouse}</span>
          <Search className="pointer-events-none absolute bottom-3.5 left-3 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.operational.filterLabels.searchWarehouse}
            className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10"
          />
        </label>
        <span className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-normal text-slate-600">
          {t.operational.modals.warehouseCount(filteredWarehouses.length)}
        </span>
        <Button type="button" className="h-11 gap-2 rounded-xl bg-[#FF6B5E] px-5 font-normal text-[#222831] hover:bg-[#E85C50]" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          {t.operational.actions.createWarehouse}
        </Button>
      </section>

      {filteredWarehouses.length === 0 ? (
        <section className="grid min-h-56 place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div>
            <PackageOpen className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-base font-normal text-slate-800">{t.operational.emptyStates.warehousesTitle}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{t.operational.emptyStates.warehousesDescription}</p>
          </div>
        </section>
      ) : (
        <section className="space-y-2">
          {filteredWarehouses.map((warehouse) => {
            const summary = summaries.get(warehouse.id);
            const hasStock = (summary?.totalUnits ?? 0) > 0;
            return (
              <article key={warehouse.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="h-5 w-1 shrink-0 rounded-full bg-[#FF6B5E]" aria-hidden="true" />
                    <h3 className="truncate text-lg font-normal text-slate-950">{warehouse.name}</h3>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-normal ${warehouse.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {warehouse.status === 'active' ? t.filters.active : t.filters.inactive}
                    </span>
                    <span className="rounded-full border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 px-2 py-1 text-[11px] font-normal text-[#B63B32]">
                      {t.operational.warehouseTypes[warehouse.type]}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs font-medium text-slate-500">
                    {[warehouse.businessUnitName, warehouse.businessName, warehouse.responsibleName].filter(Boolean).join(' · ') || t.common.notAvailable}
                  </p>
                </div>

                <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl bg-slate-50 px-2 py-2 text-center">
                  <Metric value={formatInventoryNumber(summary?.storedItems ?? 0)} label={t.operational.columns.storedItems} />
                  <Metric value={formatInventoryNumber(summary?.totalUnits ?? 0)} label={t.operational.columns.totalUnits} />
                  <Metric value={formatInventoryCurrency(summary?.estimatedValue ?? 0)} label={t.operational.columns.estimatedValue} />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className={`h-11 justify-center gap-2 rounded-xl px-4 font-normal ${hasStock ? 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}
                  onClick={() => onRequestDelete(warehouse)}
                >
                  {hasStock ? <ArrowRightLeft className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                  {hasStock ? t.operational.modals.transferAndDeleteWarehouse : t.operational.modals.deleteWarehouse}
                </Button>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-[88px] px-3">
      <p className="text-base font-normal text-slate-950">{value}</p>
      <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">{label}</p>
    </div>
  );
}
