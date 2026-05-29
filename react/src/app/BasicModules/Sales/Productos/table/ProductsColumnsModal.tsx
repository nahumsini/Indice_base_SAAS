import { useEffect, useMemo, useState } from 'react';
import { Columns3, RotateCcw, Search, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Checkbox } from '../../../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import type { ProductsTranslations } from '../translations';

export type ProductTableColumnId =
  | 'sku'
  | 'category'
  | 'type'
  | 'price'
  | 'cost'
  | 'profit'
  | 'status'
  | 'visibility'
  | 'availableIn'
  | 'lastUpdated';

type ProductFixedColumnId = 'selection' | 'cover' | 'item' | 'actions';

type ProductColumnConfig = {
  id: ProductTableColumnId;
  defaultVisible: boolean;
};

const productColumnConfigs: ProductColumnConfig[] = [
  { id: 'sku', defaultVisible: false },
  { id: 'category', defaultVisible: true },
  { id: 'type', defaultVisible: false },
  { id: 'price', defaultVisible: true },
  { id: 'cost', defaultVisible: true },
  { id: 'profit', defaultVisible: true },
  { id: 'status', defaultVisible: true },
  { id: 'visibility', defaultVisible: true },
  { id: 'availableIn', defaultVisible: true },
  { id: 'lastUpdated', defaultVisible: true },
];

const fixedColumnIds: ProductFixedColumnId[] = ['selection', 'cover', 'item', 'actions'];

export const defaultProductTableVisibleColumns = productColumnConfigs
  .filter((column) => column.defaultVisible)
  .map((column) => column.id);

function columnMatchesSearch(label: string, description: string, search: string) {
  return `${label} ${description}`.toLowerCase().includes(search);
}

export function ProductsColumnsModal({
  open,
  visibleColumns,
  t,
  onOpenChange,
  onVisibleColumnsChange,
}: {
  open: boolean;
  visibleColumns: ProductTableColumnId[];
  t: ProductsTranslations;
  onOpenChange: (open: boolean) => void;
  onVisibleColumnsChange: (columns: ProductTableColumnId[]) => void;
}) {
  const [localVisibleColumns, setLocalVisibleColumns] = useState<ProductTableColumnId[]>(visibleColumns);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      setLocalVisibleColumns(visibleColumns);
      setSearchQuery('');
    }
  }, [open, visibleColumns]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleConfigurableColumns = useMemo(() => (
    productColumnConfigs.filter((column) => {
      if (!normalizedSearch) {
        return true;
      }

      const copy = t.columnsModal.columns[column.id];
      return columnMatchesSearch(copy.label, copy.description, normalizedSearch);
    })
  ), [normalizedSearch, t]);
  const visibleFixedColumns = useMemo(() => (
    fixedColumnIds.filter((columnId) => {
      if (!normalizedSearch) {
        return true;
      }

      const copy = t.columnsModal.fixedColumns[columnId];
      return columnMatchesSearch(copy.label, copy.description, normalizedSearch);
    })
  ), [normalizedSearch, t]);
  const visibleCount = fixedColumnIds.length + localVisibleColumns.length;
  const totalColumns = fixedColumnIds.length + productColumnConfigs.length;

  const toggleColumn = (columnId: ProductTableColumnId, checked: boolean) => {
    setLocalVisibleColumns((currentColumns) => (
      checked
        ? Array.from(new Set([...currentColumns, columnId]))
        : currentColumns.filter((currentColumnId) => currentColumnId !== columnId)
    ));
  };

  const handleCancel = () => {
    setLocalVisibleColumns(visibleColumns);
    onOpenChange(false);
  };

  const handleSave = () => {
    onVisibleColumnsChange(localVisibleColumns);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : handleCancel())}>
      <DialogContent
        hideCloseButton
        className="!flex h-[min(82vh,720px)] max-h-[calc(100vh-3rem)] max-w-[720px] flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t.columnsModal.title}</DialogTitle>
          <DialogDescription>{t.columnsModal.description}</DialogDescription>
        </DialogHeader>

        <div className="shrink-0 bg-[#FF6B5E] px-6 py-4 text-white">
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 pr-4 text-xl font-semibold leading-tight tracking-tight text-white" aria-hidden="true">
              <Columns3 className="h-5 w-5" />
              {t.columnsModal.title}
            </h2>
            <button
              type="button"
              onClick={handleCancel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label={t.common.close}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/70">
          <div className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2.5">
                <p className="max-w-2xl text-sm leading-6 text-slate-600" aria-hidden="true">
                  {t.columnsModal.description}
                </p>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-semibold text-slate-700">
                  {t.columnsModal.visibleCount(visibleCount, totalColumns)}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none" onClick={() => setLocalVisibleColumns(productColumnConfigs.map((column) => column.id))}>
                  {t.columnsModal.selectAll}
                </Button>
                <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none" onClick={() => setLocalVisibleColumns([])}>
                  {t.columnsModal.deselectAll}
                </Button>
                <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none" onClick={() => setLocalVisibleColumns(defaultProductTableVisibleColumns)}>
                  <RotateCcw className="h-4 w-4" />
                  {t.columnsModal.restoreDefaults}
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <label className="sr-only" htmlFor="products-column-search">{t.columnsModal.search}</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="products-column-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t.columnsModal.searchPlaceholder}
                  className="h-10 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-none"
                />
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-4 pr-2 pb-2">
              {visibleFixedColumns.length > 0 ? (
                <div className="space-y-2">
                  <p className="px-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{t.columnsModal.protectedGroup}</p>
                  {visibleFixedColumns.map((columnId) => {
                    const column = t.columnsModal.fixedColumns[columnId];

                    return (
                      <div key={columnId} className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3">
                        <Checkbox checked disabled />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-600">{column.label}</p>
                          <p className="mt-0.5 text-sm leading-5 text-slate-500">{column.description}</p>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500">{t.columnsModal.fixed}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {visibleConfigurableColumns.length > 0 ? (
                <div className="space-y-2">
                  <p className="px-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{t.columnsModal.configurableGroup}</p>
                  {visibleConfigurableColumns.map((column) => {
                    const copy = t.columnsModal.columns[column.id];

                    return (
                      <label key={column.id} className="flex cursor-pointer items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-[#FF6B5E]/35 hover:bg-[#FF6B5E]/[0.03]">
                        <Checkbox checked={localVisibleColumns.includes(column.id)} onCheckedChange={(checked) => toggleColumn(column.id, checked === true)} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-slate-800">{copy.label}</span>
                          <span className="mt-0.5 block text-sm leading-5 text-slate-500">{copy.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : null}

              {visibleFixedColumns.length === 0 && visibleConfigurableColumns.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm font-medium text-slate-500">
                  {t.columnsModal.noColumns}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-end gap-3 bg-[#FF6B5E] px-6 py-3">
          <Button variant="outline" className="h-10 rounded-xl border-white/30 bg-white/10 px-5 text-sm font-semibold text-white shadow-none hover:bg-white/20 hover:text-white" onClick={handleCancel}>
            {t.common.cancel}
          </Button>
          <Button className="h-10 rounded-xl bg-white px-5 text-sm font-semibold text-[#B63B32] shadow-sm hover:bg-slate-100 hover:text-[#B63B32]" onClick={handleSave}>
            {t.columnsModal.apply}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
