import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { PosWarehouseSummary } from '../../Sale/services/posBackendApi';
import type { Product } from '../../shared/commercial/products';
import type { ProductSupplier, ProviderOption, PurchaseOrderCreatePayload } from '../types/purchaseOrder.types';
import { formatMoney, numberFrom } from '../utils/purchaseOrderFormat';

type DraftLine = {
  id: string;
  productBackendId: number;
  sku?: string;
  productName: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
};

export function CreatePurchaseOrderModal({
  onClose,
  onSubmit,
  products,
  providers,
  saleCurrency,
  saving,
  supplierLinks,
  warehouses,
}: {
  onClose: () => void;
  onSubmit: (payload: PurchaseOrderCreatePayload) => Promise<unknown>;
  products: Product[];
  providers: ProviderOption[];
  saleCurrency: string;
  saving: boolean;
  supplierLinks: ProductSupplier[];
  warehouses: PosWarehouseSummary[];
}) {
  const productOptions = useMemo(() => products.filter((product) => product.salesProductBackendId), [products]);
  const [providerId, setProviderId] = useState(providers[0]?.id ? String(providers[0].id) : '');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ? String(warehouses[0].id) : '');
  const [currencyCode, setCurrencyCode] = useState(saleCurrency || 'MXN');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [productId, setProductId] = useState(productOptions[0]?.salesProductBackendId ? String(productOptions[0].salesProductBackendId) : '');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [taxRate, setTaxRate] = useState(16);
  const [lines, setLines] = useState<DraftLine[]>([]);

  const selectedProduct = productOptions.find((product) => String(product.salesProductBackendId) === productId);
  const selectedSupplierLink = supplierLinks.find((link) => (
    String(link.productId) === productId && String(link.providerId) === providerId
  ));
  const effectiveUnitCost = unitCost || numberFrom(selectedSupplierLink?.costAmount) || selectedProduct?.costPrice || 0;
  const totals = useMemo(() => lines.reduce((acc, line) => {
    const subtotal = line.quantity * line.unitCost;
    const tax = subtotal * ((line.taxRate || 0) / 100);
    return {
      subtotal: acc.subtotal + subtotal,
      tax: acc.tax + tax,
      total: acc.total + subtotal + tax,
    };
  }, { subtotal: 0, tax: 0, total: 0 }), [lines]);

  const addLine = () => {
    if (!selectedProduct?.salesProductBackendId) return;
    setLines((current) => [
      ...current,
      {
        id: `${selectedProduct.salesProductBackendId}-${Date.now()}`,
        productBackendId: selectedProduct.salesProductBackendId,
        sku: selectedProduct.sku,
        productName: selectedProduct.name,
        quantity: Math.max(quantity, 0.0001),
        unitCost: effectiveUnitCost,
        taxRate: Math.max(taxRate, 0),
      },
    ]);
    setQuantity(1);
    setUnitCost(0);
    setTaxRate(selectedProduct.taxRate || 16);
  };

  const submit = async () => {
    if (!providerId || !warehouseId || lines.length === 0) return;
    try {
      await onSubmit({
        providerId: Number(providerId),
        warehouseId: Number(warehouseId),
        currencyCode,
        expectedDate: expectedDate || null,
        notes: notes || null,
        items: lines.map((line) => ({
          productId: line.productBackendId,
          sku: line.sku ?? null,
          productName: line.productName,
          quantity: line.quantity,
          unitCost: line.unitCost,
          taxRate: line.taxRate,
        })),
      });
      onClose();
    } catch {
      // The parent workspace displays the backend error without losing the draft.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl dark:bg-slate-900">
        <header className="bg-orange-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold">Nueva orden de compra</h3>
              <p className="mt-1 text-sm font-medium text-white/85">Selecciona proveedor, almacen y productos a reabastecer.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-white/80 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="grid flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 lg:grid-cols-[1fr_300px]">
          <main className="space-y-4 p-6">
            <section className="rounded-[20px] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <h4 className="text-lg font-bold text-slate-950 dark:text-white">Datos de compra</h4>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Select label="Proveedor" value={providerId} onChange={setProviderId}>
                  {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
                </Select>
                <Select label="Almacen destino" value={warehouseId} onChange={setWarehouseId}>
                  {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                </Select>
                <Input label="Fecha esperada" type="date" value={expectedDate} onChange={setExpectedDate} />
                <Input label="Divisa" value={currencyCode} onChange={(value) => setCurrencyCode(value.toUpperCase().slice(0, 3))} />
              </div>
              <label className="mt-4 block space-y-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notas</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            </section>

            <section className="rounded-[20px] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <h4 className="text-lg font-bold text-slate-950 dark:text-white">Agregar partidas</h4>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_repeat(3,1fr)_auto]">
                <Select label="Producto" value={productId} onChange={(value) => {
                  const product = productOptions.find((item) => String(item.salesProductBackendId) === value);
                  setProductId(value);
                  setTaxRate(product?.taxRate ?? 16);
                }}>
                  {productOptions.map((product) => (
                    <option key={product.salesProductBackendId} value={product.salesProductBackendId}>{product.name}</option>
                  ))}
                </Select>
                <Input label="Cantidad" type="number" value={String(quantity)} onChange={(value) => setQuantity(Number(value))} />
                <Input label="Costo" type="number" value={String(effectiveUnitCost)} onChange={(value) => setUnitCost(Number(value))} />
                <Input label="Impuesto %" type="number" value={String(taxRate)} onChange={(value) => setTaxRate(Number(value))} />
                <button type="button" onClick={addLine} className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white dark:bg-white dark:text-slate-950">
                  <Plus className="h-4 w-4" />
                  Agregar
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {lines.map((line) => (
                  <div key={line.id} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950 md:grid-cols-[1fr_90px_120px_120px_40px]">
                    <span className="font-bold text-slate-950 dark:text-white">{line.productName}</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{line.quantity}</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{formatMoney(line.unitCost, currencyCode)}</span>
                    <span className="font-bold text-slate-950 dark:text-white">{formatMoney(line.quantity * line.unitCost * (1 + line.taxRate / 100), currencyCode)}</span>
                    <button type="button" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <aside className="space-y-4 border-l border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <Summary label="Partidas" value={String(lines.length)} />
            <Summary label="Subtotal" value={formatMoney(totals.subtotal, currencyCode)} />
            <Summary label="Impuesto" value={formatMoney(totals.tax, currencyCode)} />
            <Summary label="Total" value={formatMoney(totals.total, currencyCode)} highlight />
          </aside>
        </div>

        <footer className="flex flex-wrap justify-end gap-3 bg-orange-500 px-6 py-4">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-white/30 px-5 text-sm font-bold text-white hover:bg-white/10">Cancelar</button>
          <button type="button" disabled={saving || !providerId || !warehouseId || lines.length === 0} onClick={() => void submit()} className="h-11 rounded-xl bg-white px-5 text-sm font-bold text-orange-700 disabled:cursor-not-allowed disabled:opacity-60">Crear orden</button>
        </footer>
      </div>
    </div>
  );
}

function Select({ children, label, onChange, value }: { children: ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white">
        {children}
      </select>
    </label>
  );
}

function Input({ label, onChange, type = 'text', value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
    </label>
  );
}

function Summary({ highlight = false, label, value }: { highlight?: boolean; label: string; value: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? 'border-orange-200 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/10' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'}`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
