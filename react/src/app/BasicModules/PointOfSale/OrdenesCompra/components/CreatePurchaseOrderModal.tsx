import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, FileText, PackagePlus, Plus, Search, Trash2, Upload } from 'lucide-react';
import type { PosWarehouseSummary } from '../../Sale/services/posBackendApi';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';
import type { Product } from '../../shared/commercial/products';
import { financeCurrencySelectOptions } from '../../../Expenses/constants/financeCurrencyOptions';
import {
  getBudgetTaxProfiles,
  getDefaultBudgetTaxProfile,
  inferTaxCountryFromCurrency,
  taxRateToPercentInput,
} from '../../../Expenses/Budgets/budgetTaxCatalog';
import { ApiClientError } from '../../../../lib/apiClient';
import type {
  ProductSupplier,
  ProviderOption,
  PurchaseOrder,
  PurchaseOrderCreatePayload,
  SupplierInvoicePayload,
} from '../types/purchaseOrder.types';
import { purchaseOrdersApi } from '../services/purchaseOrdersApi';
import { formatMoney, numberFrom } from '../utils/purchaseOrderFormat';

const RECONCILIATION_TOLERANCE = 0.01;

const getPurchaseOrderSaveError = (error: unknown) => {
  if (error instanceof ApiClientError && error.status === 401) {
    return 'Tu sesion expiro despues de reiniciar el sistema. Inicia sesion de nuevo y vuelve a crear la compra.';
  }

  if (error instanceof ApiClientError && error.status === 403) {
    return 'La sesion no autorizo esta accion. Refresca la pagina e inicia sesion de nuevo si vuelve a pasar.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'No se pudo guardar la compra.';
};

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
  onCreateProduct,
  onSubmit,
  onSubmitInvoice,
  products,
  providers,
  saleCurrency,
  saving,
  supplierLinks,
  warehouses,
}: {
  onClose: () => void;
  onCreateProduct: (product: Partial<Product>) => Promise<Product>;
  onSubmit: (payload: PurchaseOrderCreatePayload) => Promise<PurchaseOrder>;
  onSubmitInvoice: (payload: SupplierInvoicePayload) => Promise<unknown>;
  products: Product[];
  providers: ProviderOption[];
  saleCurrency: string;
  saving: boolean;
  supplierLinks: ProductSupplier[];
  warehouses: PosWarehouseSummary[];
}) {
  const productOptions = useMemo(() => products.filter((product) => product.salesProductBackendId), [products]);
  const currencyOptions = useMemo(() => Array.from(new Set([
    saleCurrency || 'MXN',
    ...supplierLinks.map((link) => link.currencyCode),
    ...financeCurrencySelectOptions.map((option) => option.value),
  ].filter(Boolean))).map((currency) => currency.toUpperCase()), [saleCurrency, supplierLinks]);

  const [providerId, setProviderId] = useState(providers[0]?.id ? String(providers[0].id) : '');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ? String(warehouses[0].id) : '');
  const [currencyCode, setCurrencyCode] = useState(saleCurrency || 'MXN');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [registerInvoice, setRegisterInvoice] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [invoiceSubtotal, setInvoiceSubtotal] = useState(0);
  const [invoiceTaxRate, setInvoiceTaxRate] = useState(16);
  const [invoiceTax, setInvoiceTax] = useState(0);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [savingStep, setSavingStep] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(productOptions[0]?.salesProductBackendId ? String(productOptions[0].salesProductBackendId) : '');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [taxRate, setTaxRate] = useState(16);
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);

  const taxCountry = inferTaxCountryFromCurrency(currencyCode);
  const taxProfiles = getBudgetTaxProfiles(taxCountry);
  const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
  const defaultTaxRate = defaultTaxProfile ? Number(taxRateToPercentInput(defaultTaxProfile.rate)) : 0;
  const taxRateOptions = useMemo(() => [
    ...taxProfiles.map((profile) => ({
      label: profile.region ? `${profile.shortName} - ${profile.region}` : profile.shortName,
      value: profile.manualRate ? -1 : Number(taxRateToPercentInput(profile.rate)),
    })),
    { label: 'Manual', value: -1 },
  ], [taxProfiles]);
  const productTaxRateOptions = useMemo(() => taxProfiles
    .filter((profile) => !profile.manualRate)
    .map((profile) => ({
      label: profile.region ? `${profile.shortName} - ${profile.region}` : profile.shortName,
      value: Number(taxRateToPercentInput(profile.rate)),
    })), [taxProfiles]);
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    const matches = query
      ? productOptions.filter((product) => `${product.name} ${product.sku ?? ''} ${product.barcode ?? ''}`.toLowerCase().includes(query))
      : productOptions;
    return matches.slice(0, 8);
  }, [productOptions, productSearch]);

  const selectedProvider = providers.find((provider) => String(provider.id) === providerId);
  const selectedProduct = productOptions.find((product) => String(product.salesProductBackendId) === selectedProductId);
  const selectedSupplierLink = supplierLinks.find((link) => (
    String(link.productId) === selectedProductId && String(link.providerId) === providerId
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

  const invoiceActiveTotal = registerInvoice ? invoiceTotal : totals.total;
  const difference = Number((invoiceActiveTotal - totals.total).toFixed(2));
  const reconciled = !registerInvoice || Math.abs(difference) <= RECONCILIATION_TOLERANCE;
  const canCreate = Boolean(
    providerId
      && warehouseId
      && lines.length > 0
      && (!registerInvoice || (invoiceNumber.trim() && reconciled))
      && !uploadingDocument
      && !saving
  );

  const updateInvoiceSubtotal = (value: string) => {
    const nextSubtotal = Math.max(Number(value) || 0, 0);
    setInvoiceSubtotal(nextSubtotal);
    if (invoiceTaxRate >= 0) {
      const nextTax = Number((nextSubtotal * (invoiceTaxRate / 100)).toFixed(2));
      setInvoiceTax(nextTax);
      setInvoiceTotal(Number((nextSubtotal + nextTax).toFixed(2)));
    } else {
      setInvoiceTotal(Number((nextSubtotal + invoiceTax).toFixed(2)));
    }
  };

  const updateInvoiceTaxRate = (value: string) => {
    const nextRate = Number(value);
    setInvoiceTaxRate(nextRate);
    if (nextRate >= 0) {
      if (invoiceSubtotal > 0 || invoiceTotal === 0) {
        const nextTax = Number((invoiceSubtotal * (nextRate / 100)).toFixed(2));
        setInvoiceTax(nextTax);
        setInvoiceTotal(Number((invoiceSubtotal + nextTax).toFixed(2)));
      } else {
        const divisor = 1 + (nextRate / 100);
        const nextSubtotal = divisor > 0 ? Number((invoiceTotal / divisor).toFixed(2)) : invoiceTotal;
        const nextTax = Number((invoiceTotal - nextSubtotal).toFixed(2));
        setInvoiceSubtotal(nextSubtotal);
        setInvoiceTax(nextTax);
      }
    }
  };

  const updateInvoiceTax = (value: string) => {
    const nextTax = Math.max(Number(value) || 0, 0);
    setInvoiceTax(nextTax);
    setInvoiceTaxRate(-1);
    setInvoiceTotal(Number((invoiceSubtotal + nextTax).toFixed(2)));
  };

  const updateInvoiceTotal = (value: string) => {
    const nextTotal = Math.max(Number(value) || 0, 0);
    setInvoiceTotal(nextTotal);
    if (invoiceTaxRate >= 0) {
      const divisor = 1 + (invoiceTaxRate / 100);
      const nextSubtotal = divisor > 0 ? Number((nextTotal / divisor).toFixed(2)) : nextTotal;
      const nextTax = Number((nextTotal - nextSubtotal).toFixed(2));
      setInvoiceSubtotal(nextSubtotal);
      setInvoiceTax(nextTax);
      return;
    }
    const nextSubtotal = Math.max(Number((nextTotal - invoiceTax).toFixed(2)), 0);
    setInvoiceSubtotal(nextSubtotal);
  };

  const updateInvoiceDocument = (file: File | null) => {
    setDocumentFile(file);
  };

  const syncInvoiceWithItems = () => {
    setInvoiceSubtotal(Number(totals.subtotal.toFixed(2)));
    setInvoiceTax(Number(totals.tax.toFixed(2)));
    setInvoiceTotal(Number(totals.total.toFixed(2)));
    setInvoiceTaxRate(totals.subtotal > 0 ? Number(((totals.tax / totals.subtotal) * 100).toFixed(2)) : 16);
  };

  const selectProduct = (product: Product) => {
    if (!product.salesProductBackendId) return;
    setSelectedProductId(String(product.salesProductBackendId));
    setProductSearch(product.name);
    setTaxRate(defaultTaxRate);
    setUnitCost(0);
  };

  const addLine = (product = selectedProduct) => {
    if (!product?.salesProductBackendId) return;
    const supplierLink = supplierLinks.find((link) => (
      String(link.productId) === String(product.salesProductBackendId) && String(link.providerId) === providerId
    ));
    const nextUnitCost = unitCost || numberFrom(supplierLink?.costAmount) || product.costPrice || 0;
    setLines((current) => [
      ...current,
      {
        id: `${product.salesProductBackendId}-${Date.now()}`,
        productBackendId: product.salesProductBackendId,
        sku: product.sku,
        productName: product.name,
        quantity: Math.max(quantity, 0.0001),
        unitCost: nextUnitCost,
        taxRate: Math.max(taxRate, 0),
      },
    ]);
    setQuantity(1);
    setUnitCost(0);
    setTaxRate(defaultTaxRate);
  };

  const createProductAndSelect = async () => {
    const name = newProductName.trim() || productSearch.trim();
    if (!name) return;
    setCreatingProduct(true);
    try {
      const product = await onCreateProduct({
        name,
        sku: newProductSku.trim() || undefined,
        costPrice: effectiveUnitCost || 0,
        salePrice: effectiveUnitCost || 0,
        taxRate,
        currency: currencyCode,
        useInventory: true,
        status: 'active',
      });
      if (product.salesProductBackendId) {
        selectProduct(product);
        setNewProductName('');
        setNewProductSku('');
      }
    } finally {
      setCreatingProduct(false);
    }
  };

  const submit = async () => {
    if (!canCreate) return;
    setSaveError('');
    setSavingStep('Guardando compra...');
    try {
      const order = await onSubmit({
        providerId: Number(providerId),
        warehouseId: Number(warehouseId),
        currencyCode,
        origin: 'POS_REPLENISHMENT',
        expectedDate: expectedDate || dueDate || null,
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

      if (registerInvoice) {
        let documentReference: string | null = null;
        if (documentFile) {
          setUploadingDocument(true);
          setSavingStep('Subiendo factura...');
          const contentType = documentFile.type || 'application/octet-stream';
          const upload = await purchaseOrdersApi.presignSupplierInvoiceDocument({
            fileName: documentFile.name,
            contentType,
            sizeBytes: documentFile.size,
          });
          const uploadUrl = upload.uploadUrl ?? upload.upload_url;
          const objectKey = upload.objectKey ?? upload.object_key;
          if (!uploadUrl || !objectKey) {
            throw new Error('No se recibio URL para subir el documento.');
          }
          await purchaseOrdersApi.uploadDocument(
            uploadUrl,
            documentFile,
            upload.contentType || contentType,
            upload.uploadHeaders ?? upload.upload_headers ?? {},
          );
          documentReference = objectKey;
          setUploadingDocument(false);
        }
        setSavingStep('Registrando factura...');
        await onSubmitInvoice({
          providerId: Number(providerId),
          purchaseOrderId: order.id,
          invoiceNumber: invoiceNumber.trim(),
          invoiceDate: invoiceDate || null,
          dueDate: dueDate || expectedDate || null,
          subtotalAmount: invoiceSubtotal,
          taxAmount: invoiceTax,
          totalAmount: invoiceTotal,
          currencyCode,
          documentUrl: documentReference,
          submittedByName: null,
          notes: notes || null,
        });
      }

      onClose();
    } catch (error) {
      setSaveError(getPurchaseOrderSaveError(error));
    } finally {
      setUploadingDocument(false);
      setSavingStep('');
    }
  };

  return (
    <PosModalFrame
      modalType="operational-workspace"
      onClose={onClose}
      closeLabel="Cerrar nueva compra POS"
      title="Nueva compra POS"
      subtitle="Concilia factura, presupuesto e inventario antes de crear la compra."
      eyebrow="Reabastecimiento POS"
      icon={<PackagePlus className="h-6 w-6" />}
      tone="coral"
      size="xl"
      bodyClassName="p-0"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={
        <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
          Cancelar
        </button>
      }
      footerSummary={`${lines.length} partidas · ${registerInvoice ? `Diferencia ${formatMoney(difference, currencyCode)}` : `Total ${formatMoney(totals.total, currencyCode)}`}`}
      footer={
        <button type="button" disabled={!canCreate} onClick={() => void submit()} className={posModalPrimaryActionClassName}>
          {savingStep || (registerInvoice ? 'Crear compra y factura' : 'Crear compra')}
        </button>
      }
    >
        <div className="grid min-h-0 bg-slate-50 dark:bg-slate-950 lg:grid-cols-[1fr_340px]">
          <main className="space-y-4 p-6">
            {saveError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {saveError}
              </div>
            ) : null}

            <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <SectionTitle icon={<FileText className="h-5 w-5" />} title="Proveedor, factura y presupuesto" subtitle="Estos datos preparan la referencia financiera para cuentas por pagar y Expenses." />
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Select label="Proveedor" value={providerId} onChange={setProviderId}>
                  {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
                </Select>
                <Select label="Almacen destino" value={warehouseId} onChange={setWarehouseId}>
                  {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                </Select>
                <Select label="Divisa" value={currencyCode} onChange={(value) => {
                  const nextDefaultProfile = getDefaultBudgetTaxProfile(inferTaxCountryFromCurrency(value));
                  const nextDefaultRate = nextDefaultProfile ? Number(taxRateToPercentInput(nextDefaultProfile.rate)) : 0;
                  setCurrencyCode(value);
                  setInvoiceTaxRate(nextDefaultRate);
                  setTaxRate(nextDefaultRate);
                  setLines((current) => current.map((line) => ({ ...line, taxRate: nextDefaultRate })));
                  if (invoiceSubtotal > 0 || invoiceTotal === 0) {
                    const nextTax = Number((invoiceSubtotal * (nextDefaultRate / 100)).toFixed(2));
                    setInvoiceTax(nextTax);
                    setInvoiceTotal(Number((invoiceSubtotal + nextTax).toFixed(2)));
                  } else {
                    const divisor = 1 + (nextDefaultRate / 100);
                    const nextSubtotal = divisor > 0 ? Number((invoiceTotal / divisor).toFixed(2)) : invoiceTotal;
                    const nextTax = Number((invoiceTotal - nextSubtotal).toFixed(2));
                    setInvoiceSubtotal(nextSubtotal);
                    setInvoiceTax(nextTax);
                  }
                }}>
                  {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </Select>
                <Input label="Fecha esperada" type="date" value={expectedDate} onChange={setExpectedDate} />
              </div>

              <label className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 px-4 py-3">
                <div>
                  <span className="block text-sm font-black text-slate-950 dark:text-white">Registrar factura vinculada</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Si hay factura, debe cuadrar contra las partidas antes de crear.</span>
                </div>
                <input type="checkbox" checked={registerInvoice} onChange={(event) => {
                  setRegisterInvoice(event.target.checked);
                  if (event.target.checked && invoiceTotal === 0) syncInvoiceWithItems();
                }} className="h-5 w-5 accent-[#FF6B5E]" />
              </label>

              {registerInvoice ? (
                <>
                  <div className="mt-4 rounded-2xl border border-[#FF6B5E]/25 bg-gradient-to-r from-[#FF6B5E]/10 to-[#FFF3F1] p-4 dark:from-[#FF6B5E]/10 dark:to-[#FF6B5E]/10">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#B63B32]">Conciliacion de factura</p>
                        <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                          Total factura {formatMoney(invoiceTotal, currencyCode)} contra partidas {formatMoney(totals.total, currencyCode)}.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${reconciled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200'}`}>
                          {reconciled ? 'Cuadra' : `Diferencia ${formatMoney(difference, currencyCode)}`}
                        </span>
                        <button type="button" onClick={syncInvoiceWithItems} className="h-10 rounded-xl border border-[#FF6B5E]/30 bg-white px-4 text-sm font-bold text-[#B63B32] shadow-sm hover:bg-[#FF6B5E]/10 dark:bg-slate-950">
                          Empatar partidas
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Input label="Numero de factura" value={invoiceNumber} onChange={setInvoiceNumber} />
                    <Input label="Fecha factura" type="date" value={invoiceDate} onChange={setInvoiceDate} />
                    <Input label="Vencimiento" type="date" value={dueDate} onChange={setDueDate} />
                    <FileInput label="Factura / archivo" fileName={documentFile?.name ?? ''} onChange={updateInvoiceDocument} />
                    <Input label="Subtotal factura" type="number" value={String(invoiceSubtotal)} onChange={updateInvoiceSubtotal} />
                    <Select label={`Impuesto factura (${taxCountry})`} value={String(invoiceTaxRate)} onChange={updateInvoiceTaxRate}>
                      {taxRateOptions.map((option) => <option key={`${option.label}-${option.value}`} value={option.value}>{option.label}</option>)}
                    </Select>
                    <Input label="Importe impuesto" type="number" value={String(invoiceTax)} onChange={updateInvoiceTax} />
                    <Input label="Total factura" type="number" value={String(invoiceTotal)} onChange={updateInvoiceTotal} />
                  </div>
                </>
              ) : null}

              <label className="mt-4 block space-y-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notas</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            </section>

            <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <SectionTitle icon={<PackagePlus className="h-5 w-5" />} title="Inventario de productos" subtitle="Arma las partidas hasta que el total coincida con la factura o presupuesto." />
              <div className="mt-4 grid gap-3 rounded-2xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 p-4 text-center dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/15 md:grid-cols-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Movimiento</p>
                  <p className="mt-1 text-lg font-black text-[#B63B32]">Entrada por compra</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Partidas</p>
                  <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{lines.length}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Total entrada</p>
                  <p className="mt-1 text-2xl font-black text-[#B63B32]">{formatMoney(totals.total, currencyCode)}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_140px_160px_160px_auto]">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Buscar producto</span>
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus-within:border-[#FF6B5E] focus-within:ring-2 focus-within:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Nombre, SKU o codigo" className="min-w-0 flex-1 bg-transparent outline-none" />
                  </div>
                </label>
                <Input label="Cantidad" type="number" value={String(quantity)} onChange={(value) => setQuantity(Number(value))} />
                <Input label="Costo unitario" type="number" value={String(effectiveUnitCost)} onChange={(value) => setUnitCost(Number(value))} />
                <Select label={`Impuesto (${taxCountry})`} value={String(taxRate)} onChange={(value) => setTaxRate(Number(value))}>
                  {productTaxRateOptions.map((option) => <option key={`${option.label}-${option.value}`} value={option.value}>{option.label}</option>)}
                </Select>
                <button type="button" onClick={() => addLine()} disabled={!selectedProduct} className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950">
                  <Plus className="h-4 w-4" />
                  Agregar
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.salesProductBackendId ?? product.id}
                    type="button"
                    onClick={() => selectProduct(product)}
                    className={`rounded-2xl border p-4 text-left transition hover:border-[#FF6B5E] hover:bg-[#FF6B5E]/5 ${String(product.salesProductBackendId) === selectedProductId ? 'border-[#FF6B5E] bg-[#FF6B5E]/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'}`}
                  >
                    <p className="line-clamp-2 font-black text-slate-950 dark:text-white">{product.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{product.sku || product.barcode || 'Sin SKU'}</p>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs font-bold">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{formatMoney(product.costPrice || 0, currencyCode)}</span>
                      <span className="text-[#B63B32]">{product.taxRate ?? defaultTaxRate}%</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-[#FF6B5E]/35 bg-[#FF6B5E]/5 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <Input label="Producto nuevo" value={newProductName} onChange={setNewProductName} />
                  <Input label="SKU / codigo" value={newProductSku} onChange={setNewProductSku} />
                  <button type="button" onClick={() => void createProductAndSelect()} disabled={creatingProduct || !(newProductName.trim() || productSearch.trim())} className="h-11 rounded-xl bg-[#FF6B5E] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                    {creatingProduct ? 'Creando...' : 'Agregar producto al catalogo'}
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                {lines.length === 0 ? (
                  <div className="p-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Agrega productos para controlar inventario, costos y precios reales.
                  </div>
                ) : lines.map((line) => {
                  const lineSubtotal = line.quantity * line.unitCost;
                  const lineTax = lineSubtotal * (line.taxRate / 100);
                  return (
                    <div key={line.id} className="grid gap-3 border-b border-slate-100 bg-white p-3 text-sm last:border-b-0 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_90px_120px_120px_120px_40px]">
                      <div>
                        <p className="font-bold text-slate-950 dark:text-white">{line.productName}</p>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{line.sku || 'Sin SKU'}</p>
                      </div>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{line.quantity}</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{formatMoney(line.unitCost, currencyCode)}</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{formatMoney(lineTax, currencyCode)}</span>
                      <span className="font-bold text-slate-950 dark:text-white">{formatMoney(lineSubtotal + lineTax, currencyCode)}</span>
                      <button type="button" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10" aria-label="Eliminar partida">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </main>

          <aside className="space-y-4 border-l border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <Summary label="Proveedor" value={selectedProvider?.name ?? 'Sin proveedor'} />
            <Summary label="Partidas" value={String(lines.length)} />
            <Summary label="Subtotal partidas" value={formatMoney(totals.subtotal, currencyCode)} />
            <Summary label="Impuesto partidas" value={formatMoney(totals.tax, currencyCode)} />
            <Summary label="Total partidas" value={formatMoney(totals.total, currencyCode)} highlight={!registerInvoice} />
            {registerInvoice ? (
              <>
                <Summary label="Total factura" value={formatMoney(invoiceTotal, currencyCode)} highlight />
                <div className={`rounded-2xl border p-4 ${reconciled ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100'}`}>
                  <div className="flex items-center gap-2">
                    {reconciled ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    <p className="font-black">{reconciled ? 'Conciliado' : 'Falta conciliar'}</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold">Diferencia: {formatMoney(difference, currencyCode)}</p>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                Sin factura: se crea orden y compromiso operativo con el total de partidas.
              </div>
            )}
          </aside>
        </div>
    </PosModalFrame>
  );
}

function SectionTitle({ icon, subtitle, title }: { icon: ReactNode; subtitle: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF6B5E]/10 text-[#B63B32]">{icon}</span>
      <div>
        <h4 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h4>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function Select({ children, label, onChange, value }: { children: ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
        {children}
      </select>
    </label>
  );
}

function Input({ label, onChange, type = 'text', value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
    </label>
  );
}

function FileInput({ fileName, label, onChange }: { fileName: string; label: string; onChange: (file: File | null) => void }) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <div className="flex h-11 items-center overflow-hidden rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-950 focus-within:border-[#FF6B5E] focus-within:ring-2 focus-within:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
        <label className="flex h-full shrink-0 cursor-pointer items-center gap-2 bg-[#FF6B5E]/10 px-3 text-[#B63B32] transition hover:bg-[#FF6B5E]/15">
          <Upload className="h-4 w-4" />
          Subir
          <input
            type="file"
            accept=".pdf,.xml,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            className="sr-only"
            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          />
        </label>
        <span className="min-w-0 flex-1 truncate px-3 text-slate-500 dark:text-slate-400">
          {fileName || 'Sin archivo seleccionado'}
        </span>
        {fileName ? (
          <button type="button" onClick={() => onChange(null)} className="mr-2 rounded-lg px-2 py-1 text-xs font-black text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
            Quitar
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Summary({ highlight = false, label, value }: { highlight?: boolean; label: string; value: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? 'border-[#FF6B5E]/25 bg-[#FF6B5E]/10 dark:border-[#FF6B5E]/30 dark:bg-[#FF6B5E]/10' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'}`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
