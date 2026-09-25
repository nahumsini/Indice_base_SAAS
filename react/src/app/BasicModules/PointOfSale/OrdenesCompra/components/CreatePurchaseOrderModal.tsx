import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardPaste,
  FileText,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
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
import {
  IndiceConfirmationDialog,
  IndiceModalSummary,
  IndiceModalValidation,
  IndiceModalWizardStepper,
} from '../../../../components/indice-modal';
import { ApiClientError } from '../../../../lib/apiClient';
import type {
  ProductSupplier,
  ProviderOption,
  PurchaseOrder,
  PurchaseOrderCreatePayload,
  SupplierInvoicePayload,
} from '../types/purchaseOrder.types';
import { purchaseOrdersApi } from '../services/purchaseOrdersApi';
import { usePurchaseOrderTranslations } from '../hooks/usePurchaseOrderTranslations';
import type { PurchaseOrderTranslations } from '../translations/types';
import { formatMoney, numberFrom } from '../utils/purchaseOrderFormat';

const RECONCILIATION_TOLERANCE = 0.01;

type PurchaseStep = 'reference' | 'items' | 'review';

type DraftLine = {
  id: string;
  productBackendId: number;
  sku?: string;
  productName: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
};

type DraftLineNumericField = 'quantity' | 'unitCost' | 'taxRate';

const normalizeCatalogText = (value: string | null | undefined) => (value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const parseBulkNumber = (value: string | undefined, fallback: number) => {
  if (!value?.trim()) return fallback;
  const parsed = Number(value.replace(/\s/g, '').replace(/[$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getPurchaseOrderSaveError = (error: unknown, copy: PurchaseOrderTranslations['create']) => {
  if (error instanceof ApiClientError && error.status === 401) return copy.sessionExpired;
  if (error instanceof ApiClientError && error.status === 403) return copy.forbidden;
  if (error instanceof Error && error.message) return error.message;
  return copy.saveError;
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
  const { copy, locale } = usePurchaseOrderTranslations();
  const productOptions = useMemo(() => products.filter((product) => product.salesProductBackendId), [products]);
  const currencyOptions = useMemo(() => Array.from(new Set([
    saleCurrency || 'MXN',
    ...supplierLinks.map((link) => link.currencyCode),
    ...financeCurrencySelectOptions.map((option) => option.value),
  ].filter(Boolean))).map((currency) => currency.toUpperCase()), [saleCurrency, supplierLinks]);

  const [activeStep, setActiveStep] = useState<PurchaseStep>('reference');
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
  const [taxRate, setTaxRate] = useState(16);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkFeedback, setBulkFeedback] = useState<{ added: number; missing: string[] } | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [showProductCreator, setShowProductCreator] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [createdOrder, setCreatedOrder] = useState<PurchaseOrder | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const deferredProductSearch = useDeferredValue(productSearch);

  useEffect(() => {
    if (!providers.some((provider) => String(provider.id) === providerId)) {
      setProviderId(providers[0]?.id ? String(providers[0].id) : '');
    }
  }, [providerId, providers]);

  useEffect(() => {
    if (!warehouses.some((warehouse) => String(warehouse.id) === warehouseId)) {
      setWarehouseId(warehouses[0]?.id ? String(warehouses[0].id) : '');
    }
  }, [warehouseId, warehouses]);

  const taxCountry = inferTaxCountryFromCurrency(currencyCode);
  const taxProfiles = getBudgetTaxProfiles(taxCountry);
  const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
  const defaultTaxRate = defaultTaxProfile ? Number(taxRateToPercentInput(defaultTaxProfile.rate)) : 0;
  const taxRateOptions = useMemo(() => [
    ...taxProfiles.map((profile) => ({
      label: profile.region ? `${profile.shortName} - ${profile.region}` : profile.shortName,
      value: profile.manualRate ? -1 : Number(taxRateToPercentInput(profile.rate)),
    })),
    { label: copy.create.manual, value: -1 },
  ], [copy.create.manual, taxProfiles]);
  const productTaxRateOptions = useMemo(() => taxProfiles
    .filter((profile) => !profile.manualRate)
    .map((profile) => ({
      label: profile.region ? `${profile.shortName} - ${profile.region}` : profile.shortName,
      value: Number(taxRateToPercentInput(profile.rate)),
    })), [taxProfiles]);
  const productSearchIndex = useMemo(() => productOptions.map((product) => ({
    product,
    name: normalizeCatalogText(product.name),
    sku: normalizeCatalogText(product.sku),
    barcode: normalizeCatalogText(product.barcode),
    haystack: normalizeCatalogText(`${product.name} ${product.sku ?? ''} ${product.barcode ?? ''}`),
  })), [productOptions]);
  const selectedProviderProductIds = useMemo(() => new Set(
    supplierLinks
      .filter((link) => String(link.providerId) === providerId && link.active)
      .map((link) => Number(link.productId)),
  ), [providerId, supplierLinks]);
  const filteredProducts = useMemo(() => {
    const query = normalizeCatalogText(deferredProductSearch);
    return productSearchIndex
      .map((entry) => ({
        ...entry,
        providerProduct: selectedProviderProductIds.has(Number(entry.product.salesProductBackendId)),
        score: !query
          ? 0
          : entry.sku === query || entry.barcode === query
            ? 0
            : entry.sku.startsWith(query) || entry.barcode.startsWith(query) || entry.name.startsWith(query)
              ? 1
              : entry.haystack.includes(query) ? 2 : 3,
      }))
      .filter((entry) => entry.score < 3)
      .sort((left, right) => (
        left.score - right.score
        || Number(right.providerProduct) - Number(left.providerProduct)
        || left.name.localeCompare(right.name)
      ))
      .slice(0, 12)
      .map((entry) => entry.product);
  }, [deferredProductSearch, productSearchIndex, selectedProviderProductIds]);
  const productLookup = useMemo(() => {
    const lookup = new Map<string, Product>();
    productOptions.forEach((product) => {
      [product.sku, product.barcode, product.name].forEach((identifier) => {
        const key = normalizeCatalogText(identifier);
        if (key && !lookup.has(key)) lookup.set(key, product);
      });
    });
    return lookup;
  }, [productOptions]);

  const selectedProvider = providers.find((provider) => String(provider.id) === providerId);
  const selectedWarehouse = warehouses.find((warehouse) => String(warehouse.id) === warehouseId);
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
  const busy = saving || uploadingDocument || creatingProduct || Boolean(savingStep);
  const hasDraft = Boolean(
    lines.length
    || expectedDate
    || notes.trim()
    || registerInvoice
    || invoiceNumber.trim()
    || documentFile
    || productSearch.trim()
    || newProductName.trim()
    || newProductSku.trim()
  );
  const steps = useMemo(() => [
    { id: 'reference' as const, label: copy.create.referenceTitle },
    { id: 'items' as const, label: copy.create.items },
    { id: 'review' as const, label: copy.submissionTable.review },
  ], [copy.create.items, copy.create.referenceTitle, copy.submissionTable.review]);
  const activeStepIndex = steps.findIndex((step) => step.id === activeStep);

  const clearFeedback = () => {
    setValidationMessages([]);
    setSaveError('');
  };

  const requestClose = () => {
    if (busy) return;
    if (hasDraft) {
      setShowDiscardConfirmation(true);
      return;
    }
    onClose();
  };

  const validateReference = () => {
    const messages: string[] = [];
    if (!providerId || !warehouseId) messages.push(copy.create.completeReference);
    setValidationMessages(messages);
    return messages.length === 0;
  };

  const validateItems = () => {
    const messages: string[] = [];
    if (!lines.length) messages.push(copy.create.emptyLines);
    if (lines.some((line) => line.quantity <= 0 || line.unitCost < 0 || line.taxRate < 0)) {
      messages.push(copy.create.invalidLines);
    }
    setValidationMessages(messages);
    return messages.length === 0;
  };

  const validateReview = () => {
    const messages: string[] = [];
    if (!providerId || !warehouseId) messages.push(copy.create.completeReference);
    if (!lines.length) messages.push(copy.create.emptyLines);
    if (lines.some((line) => line.quantity <= 0 || line.unitCost < 0 || line.taxRate < 0)) {
      messages.push(copy.create.invalidLines);
    }
    if (registerInvoice && !invoiceNumber.trim()) messages.push(copy.create.invoiceNumberRequired);
    if (registerInvoice && !reconciled) messages.push(copy.create.unreconciled);
    setValidationMessages(messages);
    return messages.length === 0;
  };

  const goForward = () => {
    clearFeedback();
    if (activeStep === 'reference') {
      if (validateReference()) setActiveStep('items');
      return;
    }
    if (activeStep === 'items' && validateItems()) setActiveStep('review');
  };

  const goBack = () => {
    clearFeedback();
    setActiveStep(activeStep === 'review' ? 'items' : 'reference');
  };

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
    if (nextRate < 0) return;
    if (invoiceSubtotal > 0 || invoiceTotal === 0) {
      const nextTax = Number((invoiceSubtotal * (nextRate / 100)).toFixed(2));
      setInvoiceTax(nextTax);
      setInvoiceTotal(Number((invoiceSubtotal + nextTax).toFixed(2)));
      return;
    }
    const divisor = 1 + (nextRate / 100);
    const nextSubtotal = divisor > 0 ? Number((invoiceTotal / divisor).toFixed(2)) : invoiceTotal;
    setInvoiceSubtotal(nextSubtotal);
    setInvoiceTax(Number((invoiceTotal - nextSubtotal).toFixed(2)));
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
      setInvoiceSubtotal(nextSubtotal);
      setInvoiceTax(Number((nextTotal - nextSubtotal).toFixed(2)));
      return;
    }
    setInvoiceSubtotal(Math.max(Number((nextTotal - invoiceTax).toFixed(2)), 0));
  };

  const syncInvoiceWithItems = () => {
    setInvoiceSubtotal(Number(totals.subtotal.toFixed(2)));
    setInvoiceTax(Number(totals.tax.toFixed(2)));
    setInvoiceTotal(Number(totals.total.toFixed(2)));
    setInvoiceTaxRate(totals.subtotal > 0 ? Number(((totals.tax / totals.subtotal) * 100).toFixed(2)) : defaultTaxRate);
    setValidationMessages([]);
  };

  const changeCurrency = (value: string) => {
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
      return;
    }
    const divisor = 1 + (nextDefaultRate / 100);
    const nextSubtotal = divisor > 0 ? Number((invoiceTotal / divisor).toFixed(2)) : invoiceTotal;
    setInvoiceSubtotal(nextSubtotal);
    setInvoiceTax(Number((invoiceTotal - nextSubtotal).toFixed(2)));
  };

  const getProductUnitCost = (product: Product) => {
    if (!product.salesProductBackendId) return 0;
    const supplierLink = supplierLinks.find((link) => (
      String(link.productId) === String(product.salesProductBackendId) && String(link.providerId) === providerId
    ));
    return numberFrom(supplierLink?.costAmount) || product.costPrice || 0;
  };

  const upsertProductLine = (product: Product) => {
    const productBackendId = product.salesProductBackendId;
    if (!productBackendId) return;
    setLines((current) => {
      const existingIndex = current.findIndex((line) => line.productBackendId === productBackendId);
      if (existingIndex >= 0) {
        return current.map((line, index) => index === existingIndex
          ? { ...line, quantity: line.quantity + 1 }
          : line);
      }
      return [
        ...current,
        {
          id: `product-${productBackendId}`,
          productBackendId,
          sku: product.sku,
          productName: product.name,
          quantity: 1,
          unitCost: getProductUnitCost(product),
          taxRate: Math.max(taxRate, 0),
        },
      ];
    });
    setProductSearch('');
    setSearchOpen(false);
    setActiveSearchIndex(0);
    setValidationMessages([]);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const updateLine = (lineId: string, field: DraftLineNumericField, value: number) => {
    const nextValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
    setLines((current) => current.map((line) => line.id === lineId ? { ...line, [field]: nextValue } : line));
    setValidationMessages([]);
  };

  const applyBulkLines = () => {
    const missing: string[] = [];
    const additions = new Map<number, DraftLine>();
    bulkInput.split(/\r?\n/).forEach((rawRow) => {
      const row = rawRow.trim();
      if (!row) return;
      const delimiter = row.includes('\t') ? '\t' : row.includes(';') ? ';' : ',';
      const [rawIdentifier, rawQuantity, rawCost, rawTax] = row.split(delimiter).map((cell) => cell.trim());
      const identifier = normalizeCatalogText(rawIdentifier);
      if (!identifier || ['sku', 'codigo', 'código', 'barcode', 'producto', 'product'].includes(identifier)) return;
      const product = productLookup.get(identifier);
      const productBackendId = product?.salesProductBackendId;
      if (!product || !productBackendId) {
        if (rawIdentifier && missing.length < 12) missing.push(rawIdentifier);
        return;
      }
      const quantity = Math.max(parseBulkNumber(rawQuantity, 1), 0);
      const existingAddition = additions.get(productBackendId);
      if (existingAddition) {
        existingAddition.quantity += quantity;
        if (rawCost?.trim()) existingAddition.unitCost = Math.max(parseBulkNumber(rawCost, existingAddition.unitCost), 0);
        if (rawTax?.trim()) existingAddition.taxRate = Math.max(parseBulkNumber(rawTax, existingAddition.taxRate), 0);
        return;
      }
      additions.set(productBackendId, {
        id: `product-${productBackendId}`,
        productBackendId,
        sku: product.sku,
        productName: product.name,
        quantity,
        unitCost: Math.max(parseBulkNumber(rawCost, getProductUnitCost(product)), 0),
        taxRate: Math.max(parseBulkNumber(rawTax, taxRate), 0),
      });
    });

    setLines((current) => {
      const next = [...current];
      additions.forEach((addition) => {
        const existingIndex = next.findIndex((line) => line.productBackendId === addition.productBackendId);
        if (existingIndex >= 0) {
          const existing = next[existingIndex];
          next[existingIndex] = {
            ...existing,
            quantity: existing.quantity + addition.quantity,
            unitCost: addition.unitCost,
            taxRate: addition.taxRate,
          };
        } else {
          next.push(addition);
        }
      });
      return next;
    });
    setBulkFeedback({ added: additions.size, missing });
    if (additions.size) setBulkInput('');
    setValidationMessages([]);
  };

  const createProductAndSelect = async () => {
    const name = newProductName.trim() || productSearch.trim();
    if (!name) return;
    setCreatingProduct(true);
    setSaveError('');
    try {
      const product = await onCreateProduct({
        name,
        sku: newProductSku.trim() || undefined,
        costPrice: 0,
        salePrice: 0,
        taxRate,
        currency: currencyCode,
        useInventory: true,
        status: 'active',
      });
      if (product.salesProductBackendId) {
        upsertProductLine(product);
        setNewProductName('');
        setNewProductSku('');
        setShowProductCreator(false);
      }
    } catch (error) {
      setSaveError(getPurchaseOrderSaveError(error, copy.create));
    } finally {
      setCreatingProduct(false);
    }
  };

  const submit = async () => {
    clearFeedback();
    if (!validateReview()) {
      if (!providerId || !warehouseId) setActiveStep('reference');
      else if (!lines.length) setActiveStep('items');
      return;
    }
    try {
      let order = createdOrder;
      if (!order) {
        setSavingStep(copy.create.savingOrder);
        order = await onSubmit({
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
        setCreatedOrder(order);
      }

      if (registerInvoice) {
        let documentReference: string | null = null;
        if (documentFile) {
          setUploadingDocument(true);
          setSavingStep(copy.create.uploadingInvoice);
          const contentType = documentFile.type || 'application/octet-stream';
          const upload = await purchaseOrdersApi.presignSupplierInvoiceDocument({
            fileName: documentFile.name,
            contentType,
            sizeBytes: documentFile.size,
          });
          const uploadUrl = upload.uploadUrl ?? upload.upload_url;
          const objectKey = upload.objectKey ?? upload.object_key;
          if (!uploadUrl || !objectKey) throw new Error(copy.create.uploadUrlError);
          await purchaseOrdersApi.uploadDocument(
            uploadUrl,
            documentFile,
            upload.contentType || contentType,
            upload.uploadHeaders ?? upload.upload_headers ?? {},
          );
          documentReference = objectKey;
          setUploadingDocument(false);
        }
        setSavingStep(copy.create.registeringInvoice);
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
      setActiveStep('review');
      setSaveError(getPurchaseOrderSaveError(error, copy.create));
    } finally {
      setUploadingDocument(false);
      setSavingStep('');
    }
  };

  const footerSummary = `${copy.create.footerLines(lines.length)} · ${registerInvoice
    ? copy.create.footerDifference(formatMoney(difference, currencyCode, locale))
    : copy.create.footerTotal(formatMoney(totals.total, currencyCode, locale))}`;

  return (
    <>
      <PosModalFrame
        modalType="wizard"
        onClose={requestClose}
        closeLabel={copy.create.closeLabel}
        title={copy.create.title}
        subtitle={copy.create.subtitle}
        eyebrow={copy.create.eyebrow}
        icon={<PackagePlus className="h-6 w-6" />}
        tone="coral"
        isCloseDisabled={busy}
        bodyClassName="space-y-4"
        footerClassName={posModalModuleFooterClassName}
        footerLeading={(
          <button type="button" onClick={requestClose} disabled={busy} className={posModalSecondaryActionClassName}>
            {copy.create.cancel}
          </button>
        )}
        footerSummary={footerSummary}
        footer={(
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            {activeStep !== 'reference' ? (
              <button type="button" onClick={goBack} disabled={busy} className={posModalSecondaryActionClassName}>
                <ArrowLeft className="h-4 w-4" />
                {copy.create.back}
              </button>
            ) : null}
            {activeStep === 'review' ? (
              <button type="button" disabled={busy} onClick={() => void submit()} className={posModalPrimaryActionClassName}>
                {savingStep || (registerInvoice ? copy.create.createWithInvoice : copy.create.create)}
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={goForward} className={posModalPrimaryActionClassName}>
                {copy.create.continue}
              </button>
            )}
          </div>
        )}
      >
        <IndiceModalWizardStepper
          accent="coral"
          activeStepId={activeStep}
          progressLabel={copy.create.title}
          steps={steps}
          onStepSelect={(stepId) => {
            const targetIndex = steps.findIndex((step) => step.id === stepId);
            if (targetIndex < activeStepIndex) {
              clearFeedback();
              setActiveStep(stepId);
            }
          }}
        />

        {saveError ? <IndiceModalValidation messages={[saveError]} title={copy.create.saveError} /> : null}
        <IndiceModalValidation messages={validationMessages} />

        {activeStep === 'reference' ? (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-4 sm:p-5 dark:border-slate-800">
              <SectionTitle icon={<FileText className="h-5 w-5" />} title={copy.create.referenceTitle} subtitle={copy.create.referenceSubtitle} />
            </div>
            <div className="space-y-5 p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label={copy.create.provider} value={providerId} onChange={(value) => { setProviderId(value); clearFeedback(); }}>
                  <option value="">{copy.create.noProvider}</option>
                  {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
                </Select>
                <Select label={copy.create.destinationWarehouse} value={warehouseId} onChange={(value) => { setWarehouseId(value); clearFeedback(); }}>
                  <option value="">—</option>
                  {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                </Select>
                <Select label={copy.create.currency} value={currencyCode} onChange={changeCurrency}>
                  {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </Select>
                <Input label={copy.create.expectedDate} type="date" value={expectedDate} onChange={setExpectedDate} />
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 px-4 py-3">
                <div>
                  <span className="block text-sm font-medium text-slate-950 dark:text-white">{copy.create.linkInvoice}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.create.linkInvoiceHint}</span>
                </div>
                <input
                  type="checkbox"
                  checked={registerInvoice}
                  onChange={(event) => {
                    setRegisterInvoice(event.target.checked);
                    if (event.target.checked && invoiceTotal === 0) syncInvoiceWithItems();
                  }}
                  className="h-5 w-5 shrink-0 accent-[#FF6B5E]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.create.notes}</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            </div>
          </section>
        ) : null}

        {activeStep === 'items' ? (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-4 sm:p-5 dark:border-slate-800">
              <SectionTitle icon={<Search className="h-5 w-5" />} title={copy.create.inventoryTitle} subtitle={copy.create.inventorySubtitle} />
            </div>
            <div className="space-y-5 p-4 sm:p-5">
              <div className="space-y-3">
                <label className="relative block space-y-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.create.searchProduct}</span>
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 focus-within:border-[#FF6B5E] focus-within:ring-2 focus-within:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      value={productSearch}
                      onFocus={() => setSearchOpen(true)}
                      onBlur={() => window.setTimeout(() => setSearchOpen(false), 100)}
                      onChange={(event) => {
                        setProductSearch(event.target.value);
                        setSearchOpen(true);
                        setActiveSearchIndex(0);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') {
                          event.preventDefault();
                          setActiveSearchIndex((current) => Math.min(current + 1, filteredProducts.length - 1));
                        } else if (event.key === 'ArrowUp') {
                          event.preventDefault();
                          setActiveSearchIndex((current) => Math.max(current - 1, 0));
                        } else if (event.key === 'Enter' && filteredProducts[activeSearchIndex]) {
                          event.preventDefault();
                          upsertProductLine(filteredProducts[activeSearchIndex]);
                        } else if (event.key === 'Escape') {
                          setSearchOpen(false);
                        }
                      }}
                      placeholder={copy.create.searchPlaceholder}
                      autoComplete="off"
                      role="combobox"
                      aria-expanded={searchOpen}
                      aria-controls="purchase-product-results"
                      className="min-w-0 flex-1 bg-transparent outline-none"
                    />
                  </div>
                  {searchOpen ? (
                    <div id="purchase-product-results" role="listbox" className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                      {filteredProducts.length ? filteredProducts.map((product, index) => (
                        <button
                          key={product.salesProductBackendId ?? product.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => upsertProductLine(product)}
                          role="option"
                          aria-selected={index === activeSearchIndex}
                          className={`flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left transition ${index === activeSearchIndex ? 'bg-[#FF6B5E]/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-slate-950 dark:text-white">{product.name}</span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                              <span className="truncate">{product.sku || product.barcode || copy.common.noSku}</span>
                              <span>·</span>
                              <span>{copy.create.stockAvailable(product.currentStock)}</span>
                              {selectedProviderProductIds.has(Number(product.salesProductBackendId)) ? (
                                <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{copy.create.supplierProduct}</span>
                              ) : null}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-300">{formatMoney(getProductUnitCost(product), currencyCode, locale)}</span>
                        </button>
                      )) : (
                        <p className="px-3 py-6 text-center text-sm text-slate-500">{copy.create.noProducts}</p>
                      )}
                    </div>
                  ) : null}
                </label>
                <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
                  <span>{copy.create.quickCaptureHint}</span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setShowBulkEntry((current) => !current); setBulkFeedback(null); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:border-[#FF6B5E] hover:text-[#B63B32] dark:border-slate-700 dark:text-slate-200">
                      <ClipboardPaste className="h-4 w-4" />
                      {copy.create.bulkEntry}
                    </button>
                    <button type="button" onClick={() => setShowProductCreator((current) => !current)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:border-[#FF6B5E] hover:text-[#B63B32] dark:border-slate-700 dark:text-slate-200">
                      <Plus className="h-4 w-4" />
                      {copy.create.createProduct}
                    </button>
                  </div>
                </div>
              </div>

              {showBulkEntry ? (
                <div className="rounded-2xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/5 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#B63B32] shadow-sm dark:bg-slate-900"><ClipboardPaste className="h-4 w-4" /></span>
                    <div>
                      <p className="text-sm font-medium text-slate-950 dark:text-white">{copy.create.bulkEntry}</p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.create.bulkEntryHint}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <textarea
                      value={bulkInput}
                      onChange={(event) => { setBulkInput(event.target.value); setBulkFeedback(null); }}
                      rows={5}
                      placeholder={copy.create.bulkPlaceholder}
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-950 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                    <button type="button" onClick={applyBulkLines} disabled={!bulkInput.trim()} className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-xl bg-slate-950 px-5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
                      <Plus className="h-4 w-4" />{copy.create.applyBulk}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{copy.create.bulkFormat}</p>
                  {bulkFeedback ? (
                    <p className={`mt-2 text-xs font-medium ${bulkFeedback.missing.length ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                      {copy.create.bulkAdded(bulkFeedback.added)}{bulkFeedback.missing.length ? ` · ${copy.create.bulkMissing(bulkFeedback.missing.join(', '))}` : ''}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {showProductCreator ? (
                <div className="rounded-2xl border border-dashed border-[#FF6B5E]/35 bg-[#FF6B5E]/5 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input label={copy.create.newProductName} value={newProductName} onChange={setNewProductName} />
                    <Input label={copy.create.skuOptional} value={newProductSku} onChange={setNewProductSku} />
                    <button type="button" onClick={() => void createProductAndSelect()} disabled={creatingProduct || !(newProductName.trim() || productSearch.trim())} className="h-11 rounded-xl bg-[#FF6B5E] px-5 text-sm font-medium text-[#222831] disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2">
                      {creatingProduct ? copy.create.creatingProduct : copy.create.createProduct}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-end">
                <div>
                  <p className="text-sm font-medium text-slate-950 dark:text-white">{copy.create.selectedLines}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.create.editLinesHint}</p>
                </div>
                <Select label={`${copy.create.defaultTaxRate} (${taxCountry})`} value={String(taxRate)} onChange={(value) => setTaxRate(Number(value))}>
                  {productTaxRateOptions.map((option) => <option key={`${option.label}-${option.value}`} value={option.value}>{option.label}</option>)}
                </Select>
              </div>

              <LineItemsSection
                copy={copy}
                currencyCode={currencyCode}
                lines={lines}
                locale={locale}
                onUpdate={updateLine}
                onRemove={(lineId) => setLines((current) => current.filter((line) => line.id !== lineId))}
              />
            </div>
          </section>
        ) : null}

        {activeStep === 'review' ? (
          <div className="space-y-4">
            <IndiceModalSummary
              columns={3}
              variant="accent"
              icon={<CheckCircle2 className="h-5 w-5" />}
              title={copy.create.reconciliation}
              description={registerInvoice ? copy.create.linkInvoiceHint : copy.create.noInvoiceSummary}
              items={[
                { label: copy.create.provider, value: selectedProvider?.name ?? copy.create.noProvider },
                { label: copy.create.destinationWarehouse, value: selectedWarehouse?.name ?? '—' },
                { label: copy.create.items, value: String(lines.length) },
                { label: copy.create.itemSubtotal, value: formatMoney(totals.subtotal, currencyCode, locale) },
                { label: copy.create.itemTax, value: formatMoney(totals.tax, currencyCode, locale) },
                { label: copy.create.itemTotal, value: formatMoney(totals.total, currencyCode, locale), emphasized: true },
              ]}
            />

            {registerInvoice ? (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 p-4 sm:p-5 dark:border-slate-800">
                  <SectionTitle icon={<FileText className="h-5 w-5" />} title={copy.create.linkInvoice} subtitle={copy.create.linkInvoiceHint} />
                </div>
                <div className="space-y-4 p-4 sm:p-5">
                  <div className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${reconciled ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100'}`}>
                    <div className="flex items-start gap-3">
                      {reconciled ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />}
                      <div>
                        <p className="font-medium">{reconciled ? copy.create.reconciled : copy.create.unreconciled}</p>
                        <p className="mt-1 text-sm">{copy.create.reconciliationSummary(formatMoney(invoiceTotal, currencyCode, locale), formatMoney(totals.total, currencyCode, locale))}</p>
                      </div>
                    </div>
                    <button type="button" onClick={syncInvoiceWithItems} className="h-10 shrink-0 rounded-xl border border-current/20 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm hover:bg-white/80 dark:bg-slate-950 dark:text-white">
                      {copy.create.syncToItems}
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label={copy.create.invoiceNumber} value={invoiceNumber} onChange={(value) => { setInvoiceNumber(value); setValidationMessages([]); }} />
                    <Input label={copy.create.invoiceDate} type="date" value={invoiceDate} onChange={setInvoiceDate} />
                    <Input label={copy.create.dueDate} type="date" value={dueDate} onChange={setDueDate} />
                    <FileInput label={copy.create.document} fileName={documentFile?.name ?? ''} onChange={setDocumentFile} uploadLabel={copy.create.upload} emptyLabel={copy.create.noFile} removeLabel={copy.create.removeFile} />
                    <Input label={copy.create.subtotal} type="number" value={String(invoiceSubtotal)} onChange={updateInvoiceSubtotal} />
                    <Select label={`${copy.create.tax} (${taxCountry})`} value={String(invoiceTaxRate)} onChange={updateInvoiceTaxRate}>
                      {taxRateOptions.map((option) => <option key={`${option.label}-${option.value}`} value={option.value}>{option.label}</option>)}
                    </Select>
                    <Input label={copy.create.taxAmount} type="number" value={String(invoiceTax)} onChange={updateInvoiceTax} />
                    <Input label={copy.create.invoiceTotal} type="number" value={String(invoiceTotal)} onChange={updateInvoiceTotal} />
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
              <SectionTitle icon={<PackagePlus className="h-5 w-5" />} title={copy.create.items} subtitle={copy.create.purchaseEntry} />
              <div className="mt-4">
                <LineItemsSection
                  compact
                  copy={copy}
                  currencyCode={currencyCode}
                  lines={lines}
                  locale={locale}
                  onRemove={(lineId) => setLines((current) => current.filter((line) => line.id !== lineId))}
                />
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
          </div>
        ) : null}
      </PosModalFrame>

      <IndiceConfirmationDialog
        open={showDiscardConfirmation}
        title={copy.create.discardTitle}
        description={copy.create.discardDescription}
        cancelLabel={copy.create.keepEditing}
        confirmLabel={copy.create.discard}
        destructive
        tone="coral"
        onCancel={() => setShowDiscardConfirmation(false)}
        onConfirm={onClose}
      />
    </>
  );
}

function LineItemsSection({
  compact = false,
  copy,
  currencyCode,
  lines,
  locale,
  onRemove,
  onUpdate,
}: {
  compact?: boolean;
  copy: PurchaseOrderTranslations;
  currencyCode: string;
  lines: DraftLine[];
  locale: string;
  onRemove: (lineId: string) => void;
  onUpdate?: (lineId: string, field: DraftLineNumericField, value: number) => void;
}) {
  if (!lines.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {copy.create.emptyLines}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
      {lines.map((line) => {
        const lineSubtotal = line.quantity * line.unitCost;
        const lineTax = lineSubtotal * (line.taxRate / 100);
        return (
          <div
            key={line.id}
            className={`grid min-w-0 gap-3 border-b border-slate-100 bg-white p-3 text-sm last:border-b-0 dark:border-slate-800 dark:bg-slate-900 ${compact ? 'sm:grid-cols-[minmax(0,1fr)_70px_110px_40px]' : 'sm:grid-cols-[minmax(140px,1fr)_90px_120px_100px_120px_40px]'}`}
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-950 dark:text-white">{line.productName}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{line.sku || copy.common.noSku}</p>
            </div>
            {compact ? (
              <div>
                <p className="text-[11px] text-slate-400">{copy.create.lineQuantity}</p>
                <p className="font-medium text-slate-700 dark:text-slate-200">{line.quantity}</p>
              </div>
            ) : (
              <NumericLineInput label={copy.create.lineQuantity} value={line.quantity} min={0.01} step="any" onChange={(value) => onUpdate?.(line.id, 'quantity', value)} />
            )}
            {!compact ? <NumericLineInput label={copy.create.lineUnitCost} value={line.unitCost} min={0} step="0.01" onChange={(value) => onUpdate?.(line.id, 'unitCost', value)} /> : null}
            {!compact ? <NumericLineInput label={copy.create.lineTax} value={line.taxRate} min={0} step="0.01" suffix="%" onChange={(value) => onUpdate?.(line.id, 'taxRate', value)} /> : null}
            <div>
              <p className="text-[11px] text-slate-400">{copy.create.lineTotal}</p>
              <p className="font-medium text-slate-950 dark:text-white">{formatMoney(lineSubtotal + lineTax, currencyCode, locale)}</p>
            </div>
            <button type="button" onClick={() => onRemove(line.id)} className="self-center rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10" aria-label={copy.create.removeLine}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function NumericLineInput({
  label,
  min,
  onChange,
  step,
  suffix,
  value,
}: {
  label: string;
  min: number;
  onChange: (value: number) => void;
  step: string;
  suffix?: string;
  value: number;
}) {
  return (
    <label className="min-w-0">
      <span className="block text-[11px] text-slate-400">{label}</span>
      <span className="mt-1 flex h-9 items-center rounded-lg border border-slate-200 bg-white px-2 focus-within:border-[#FF6B5E] focus-within:ring-2 focus-within:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950">
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none dark:text-white"
        />
        {suffix ? <span className="ml-1 text-xs text-slate-400">{suffix}</span> : null}
      </span>
    </label>
  );
}

function SectionTitle({ icon, subtitle, title }: { icon: ReactNode; subtitle: string; title: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FF6B5E]/10 text-[#B63B32]">{icon}</span>
      <div className="min-w-0">
        <h4 className="text-base font-medium text-slate-950 dark:text-white sm:text-lg">{title}</h4>
        <p className="mt-0.5 text-sm leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
    </div>
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
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
        {children}
      </select>
    </label>
  );
}

function Input({ label, onChange, type = 'text', value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <input type={type} value={value} min={type === 'number' ? 0 : undefined} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
    </label>
  );
}

function FileInput({
  emptyLabel,
  fileName,
  label,
  onChange,
  removeLabel,
  uploadLabel,
}: {
  emptyLabel: string;
  fileName: string;
  label: string;
  onChange: (file: File | null) => void;
  removeLabel: string;
  uploadLabel: string;
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <div className="flex h-11 items-center overflow-hidden rounded-xl border border-slate-200 bg-white text-sm text-slate-950 focus-within:border-[#FF6B5E] focus-within:ring-2 focus-within:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
        <label className="flex h-full shrink-0 cursor-pointer items-center gap-2 bg-[#FF6B5E]/10 px-3 font-medium text-[#B63B32] transition hover:bg-[#FF6B5E]/15">
          <Upload className="h-4 w-4" />
          {uploadLabel}
          <input
            type="file"
            accept=".pdf,.xml,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            className="sr-only"
            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          />
        </label>
        <span className="min-w-0 flex-1 truncate px-3 text-slate-500 dark:text-slate-400">{fileName || emptyLabel}</span>
        {fileName ? (
          <button type="button" onClick={() => onChange(null)} className="mr-2 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
            {removeLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
