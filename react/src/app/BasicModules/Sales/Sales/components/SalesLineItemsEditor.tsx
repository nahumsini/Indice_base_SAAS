import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import type { SalesCatalogItem } from '../../types';
import { ProductThumbnail } from '../../Productos/components/ProductThumbnail';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleLine, SaleRecordDraft } from '../types/salesTypes';
import { formatSalesCurrency } from '../utils/salesFormatters';

function asNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function recalculateLine(line: SaleLine): SaleLine {
  const gross = Math.max(0, line.quantity) * Math.max(0, line.unitPrice);
  const discount = gross * Math.max(0, line.discountPercent) / 100;
  const subtotal = Math.max(0, gross - discount);
  return {
    ...line,
    subtotal,
    marginAmount: subtotal - (Math.max(0, line.quantity) * Math.max(0, line.unitCost)),
  };
}

export function calculateSaleDraftTotals(lines: SaleLine[]) {
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const discountTotal = lines.reduce((sum, line) => (
    sum + (Math.max(0, line.quantity) * Math.max(0, line.unitPrice) * Math.max(0, line.discountPercent) / 100)
  ), 0);
  const taxTotal = lines.reduce((sum, line) => sum + (line.subtotal * Math.max(0, line.taxPercent) / 100), 0);
  return {
    subtotal,
    discountTotal,
    taxTotal,
    totalAmount: subtotal + taxTotal,
    marginTotal: lines.reduce((sum, line) => sum + line.marginAmount, 0),
  };
}

export function SalesLineItemsEditor({
  form,
  products,
  t,
  onFormChange,
}: {
  form: SaleRecordDraft;
  products: SalesCatalogItem[];
  t: SalesRecordsTranslations;
  onFormChange: (patch: Partial<SaleRecordDraft>) => void;
}) {
  const selectableProducts = products.filter((product) => product.status === 'Active');

  const commitLines = (lines: SaleLine[]) => {
    onFormChange({ saleLines: lines, ...calculateSaleDraftTotals(lines) });
  };

  const addProduct = (productId: string) => {
    const product = selectableProducts.find((item) => item.id === productId);
    if (!product) return;
    const nextLine = recalculateLine({
      id: `DRAFT-LINE-${Date.now()}-${form.saleLines.length + 1}`,
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      quantity: 1,
      unitPrice: product.price,
      unitCost: product.cost,
      discountPercent: 0,
      taxPercent: 0,
      subtotal: product.price,
      marginAmount: product.price - product.cost,
      businessUnitId: form.businessUnitId ?? '',
      businessId: form.businessId ?? '',
      warehouseId: form.warehouseId ?? '',
      availabilityStatus: 'pending_validation',
    });
    commitLines([...form.saleLines, nextLine]);
  };

  const updateLine = (lineId: string, patch: Partial<SaleLine>) => {
    commitLines(form.saleLines.map((line) => (
      line.id === lineId ? recalculateLine({ ...line, ...patch }) : line
    )));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row dark:border-slate-700 dark:bg-slate-800/50">
        <Select onValueChange={addProduct}>
          <SelectTrigger aria-label={t.modal.lineItems.product} className="min-h-11 flex-1 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
            <SelectValue placeholder={t.modal.lineItems.selectProduct} />
          </SelectTrigger>
          <SelectContent>
            {selectableProducts.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name} · {product.sku} · {formatSalesCurrency(product.price, product.currency ?? form.currency)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-300">
          <Plus className="h-4 w-4" /> {t.modal.lineItems.addHelper}
        </div>
      </div>

      {!form.saleLines.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {t.modal.lineItems.empty}
        </div>
      ) : (
        <div className="space-y-3">
          {form.saleLines.map((line) => {
            const product = products.find((item) => item.id === line.productId);
            const lineTax = line.subtotal * line.taxPercent / 100;
            return (
              <article key={line.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start gap-3">
                  {product ? <ProductThumbnail product={product} size="sm" /> : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{line.productName}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{line.sku}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label={t.modal.lineItems.remove} onClick={() => commitLines(form.saleLines.filter((item) => item.id !== line.id))}>
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    {t.modal.lineItems.quantity}
                    <Input className="mt-1" type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: asNumber(event.target.value) })} />
                  </label>
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    {t.modal.lineItems.unitPrice}
                    <Input className="mt-1" type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: asNumber(event.target.value) })} />
                  </label>
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    {t.modal.lineItems.discount}
                    <Input className="mt-1" type="number" min="0" max="100" step="0.01" value={line.discountPercent} onChange={(event) => updateLine(line.id, { discountPercent: asNumber(event.target.value) })} />
                  </label>
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    {t.modal.lineItems.tax}
                    <Input className="mt-1" type="number" min="0" max="100" step="0.01" value={line.taxPercent} onChange={(event) => updateLine(line.id, { taxPercent: asNumber(event.target.value) })} />
                  </label>
                  <div className="flex flex-col justify-end rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{t.modal.lineItems.total}</span>
                    <strong className="text-sm font-medium text-slate-900 dark:text-white">{formatSalesCurrency(line.subtotal + lineTax, form.currency)}</strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
