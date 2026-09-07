import { OperationTicketPreview } from './OperationTicketPreview';
import { receiptTicket, printPosOperationTicket, reservePosTicketWindow } from '../../shared/posOperationTickets';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, FileUp, PackagePlus, Plus, Search, Trash2, UserRoundPlus } from 'lucide-react';
import {
  getBudgetTaxProfiles,
  getDefaultBudgetTaxProfile,
  inferTaxCountryFromCurrency,
  parsePercentInput,
  roundMoney,
  taxRateToPercentInput,
} from '../../../Expenses/Budgets/budgetTaxCatalog';
import {
  posBackendApi,
  type PosInventoryReceiptPaymentAccount,
  type PosInventoryReceiptProduct,
  type PosInventoryReceiptProvider,
  type PosPaidInventoryReceiptResponse,
} from '../services/posBackendApi';
import {
  PosModalFrame,
  PosModalSection,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
  posWorkspacePrimaryActionClassName,
  posWorkspaceSecondaryActionClassName,
} from './PosModalFrame';

type Props = {
  isOpen: boolean;
  cashRegisterId: number;
  shiftId: number;
  warehouseName: string;
  currencyCode: string;
  workspaceMode?: boolean;
  onClose: () => void;
  onCompleted: (message: string) => Promise<void> | void;
};

type ProductInput = {
  productId?: number | null;
  name?: string | null;
  sku?: string | null;
  category?: string | null;
  inventoryUnit?: string | null;
  salePrice?: number | null;
  enableInventory?: boolean;
};

type ReceiptLine = {
  key: string;
  product: ProductInput;
  productName: string;
  sku?: string | null;
  inventoryUnit: string;
  quantity: number;
  unitCost: number;
  taxEnabled: boolean;
  taxIncluded: boolean;
  taxProfileId: string;
  taxName: string;
  taxRatePercent: number;
};

const controlClassName = 'mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500';
const unitLabel = (unit: string) => ({ Piece: 'pza', Kilogram: 'kg', Gram: 'g', Liter: 'l', Meter: 'm' }[unit] ?? unit);
const units = [
  { value: 'Piece', label: 'Pieza' },
  { value: 'Kilogram', label: 'Kilogramo' },
  { value: 'Gram', label: 'Gramo' },
  { value: 'Liter', label: 'Litro' },
  { value: 'Meter', label: 'Metro' },
];

const lineAmounts = (line: ReceiptLine) => {
  const gross = Math.max(0, line.quantity) * Math.max(0, line.unitCost);
  const rate = line.taxEnabled ? Math.max(0, Math.min(100, line.taxRatePercent)) / 100 : 0;
  if (line.taxIncluded && rate > 0) {
    const total = roundMoney(gross);
    const subtotal = roundMoney(total / (1 + rate));
    return { subtotal, tax: roundMoney(total - subtotal), total };
  }
  const subtotal = roundMoney(gross);
  const tax = roundMoney(subtotal * rate);
  return { subtotal, tax, total: roundMoney(subtotal + tax) };
};

export function PaidInventoryReceiptModal({
  isOpen,
  cashRegisterId,
  shiftId,
  warehouseName,
  currencyCode,
  workspaceMode = false,
  onClose,
  onCompleted,
}: Props) {
  const taxCountry = inferTaxCountryFromCurrency(currencyCode);
  const taxProfiles = useMemo(() => getBudgetTaxProfiles(taxCountry), [taxCountry]);
  const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry) ?? taxProfiles[0];

  const [providers, setProviders] = useState<PosInventoryReceiptProvider[]>([]);
  const [providerId, setProviderId] = useState('');
  const [providerSearch, setProviderSearch] = useState('');
  const [showQuickProvider, setShowQuickProvider] = useState(false);
  const [quickProviderName, setQuickProviderName] = useState('');
  const [creatingProvider, setCreatingProvider] = useState(false);

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<PosInventoryReceiptProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<PosInventoryReceiptProduct | null>(null);
  const [enableInventory, setEnableInventory] = useState(false);
  const [recentReceipts, setRecentReceipts] = useState<PosPaidInventoryReceiptResponse[]>([]);
  const [historyReceipt, setHistoryReceipt] = useState<PosPaidInventoryReceiptResponse | null>(null);
  const submitLock = useRef(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [inventoryUnit, setInventoryUnit] = useState('Piece');
  const [salePrice, setSalePrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxIncluded, setTaxIncluded] = useState(false);
  const [taxProfileId, setTaxProfileId] = useState(defaultTaxProfile?.id ?? '');
  const [manualTaxPercent, setManualTaxPercent] = useState('');
  const [lines, setLines] = useState<ReceiptLine[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [accounts, setAccounts] = useState<PosInventoryReceiptPaymentAccount[]>([]);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<PosPaidInventoryReceiptResponse | null>(null);
  const [evidencePendingRetry, setEvidencePendingRetry] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());
  const productRequestSequence = useRef(0);

  const selectedUnit = mode === 'existing' ? (selectedProduct?.inventoryUnit ?? 'Piece') : inventoryUnit;
  const selectedTaxProfile = taxProfiles.find((profile) => profile.id === taxProfileId) ?? defaultTaxProfile;
  const builderTaxPercent = selectedTaxProfile?.manualRate
    ? Number(manualTaxPercent.replace(',', '.')) || 0
    : Number(taxRateToPercentInput(selectedTaxProfile?.rate ?? 0));
  const filteredProviders = useMemo(() => {
    const query = providerSearch.trim().toLocaleLowerCase();
    if (!query) return providers;
    return providers.filter((provider) => String(provider.id) === providerId
      || `${provider.name} ${provider.taxId ?? ''} ${provider.email ?? ''}`.toLocaleLowerCase().includes(query));
  }, [providerId, providerSearch, providers]);
  const displayProducts = useMemo(() => {
    const currencyProducts = products.filter((product) => !product.currencyCode || product.currencyCode.trim().toUpperCase() === currencyCode.trim().toUpperCase());
    if (!selectedProduct || currencyProducts.some((product) => product.id === selectedProduct.id)) return currencyProducts;
    return [selectedProduct, ...currencyProducts];
  }, [currencyCode, products, selectedProduct]);
  const totals = useMemo(() => lines.reduce((result, line) => {
    const amounts = lineAmounts(line);
    return {
      subtotal: result.subtotal + amounts.subtotal,
      tax: result.tax + amounts.tax,
      total: result.total + amounts.total,
    };
  }, { subtotal: 0, tax: 0, total: 0 }), [lines]);
  const money = (value: number) => new Intl.NumberFormat(
    typeof navigator === 'undefined' ? 'es-MX' : navigator.language,
    { style: 'currency', currency: currencyCode },
  ).format(value);

  useEffect(() => {
    if (!isOpen) return;
    idempotencyKey.current = crypto.randomUUID();
    setProviderId('');
    setProviderSearch('');
    setShowQuickProvider(false);
    setQuickProviderName('');
    setMode('existing');
    setProductSearch('');
    setSelectedProduct(null);
    setName('');
    setSku('');
    setCategory('');
    setInventoryUnit('Piece');
    setSalePrice('');
    setQuantity('1');
    setUnitCost('');
    setTaxEnabled(false);
    setTaxIncluded(false);
    setTaxProfileId(defaultTaxProfile?.id ?? '');
    setManualTaxPercent('');
    setLines([]);
    setPaymentMethod('CASH');
    setAccounts([]);
    setPaymentAccountId('');
    setPaymentReference('');
    setNotes('');
    setEvidenceFile(null);
    setSavedReceipt(null);
    setEnableInventory(false);
    setHistoryReceipt(null);
    setRecentReceipts([]);
    void posBackendApi.paidInventoryReceipts(shiftId).then(setRecentReceipts).catch(() => setError('No se pudo cargar el historial de recepciones.'));
    setEvidencePendingRetry(false);
    setError('');
    setLoadingCatalog(true);
    let cancelled = false;
    setProducts([]);
    void posBackendApi.paidInventoryReceiptProviders().then(nextProviders => {
      if (!cancelled) setProviders(nextProviders);
    }).catch((nextError) => {
      if (!cancelled) setError(nextError instanceof Error ? nextError.message : 'No se pudo preparar la recepción.');
    }).finally(() => { if (!cancelled) setLoadingCatalog(false); });
    return () => { cancelled = true; };
  }, [cashRegisterId, currencyCode, shiftId, defaultTaxProfile?.id, isOpen]);

  useEffect(() => {
    if (!isOpen || mode !== 'existing') return;
    const sequence = ++productRequestSequence.current;
    setLoadingProducts(true);
    setCatalogError('');
    const timer = window.setTimeout(() => {
      void posBackendApi.paidInventoryReceiptProducts(cashRegisterId, productSearch, currencyCode)
        .then((nextProducts) => {
          if (sequence === productRequestSequence.current) setProducts(nextProducts);
        })
        .catch((nextError) => {
          if (sequence === productRequestSequence.current) {
            setCatalogError(nextError instanceof Error ? nextError.message : 'No se pudieron buscar los productos.');
          }
        }).finally(() => { if (sequence === productRequestSequence.current) setLoadingProducts(false); });
    }, 250);
    return () => { window.clearTimeout(timer); productRequestSequence.current++; };
  }, [cashRegisterId, currencyCode, isOpen, mode, productSearch, catalogAttempt]);

  useEffect(() => {
    if (!isOpen || paymentMethod !== 'TRANSFER') return;
    setPaymentAccountId('');
    void posBackendApi.paidInventoryReceiptPaymentAccounts(cashRegisterId, shiftId, currencyCode)
      .then(setAccounts)
      .catch((nextError) => setError(
        nextError instanceof Error ? nextError.message : 'No se pudieron cargar las cuentas bancarias.',
      ));
  }, [cashRegisterId, currencyCode, isOpen, paymentMethod, shiftId]);

  if (!isOpen) return null;

  const createQuickProvider = async () => {
    const providerName = quickProviderName.trim();
    if (!providerName) return setError('Escribe el nombre del proveedor.');
    setCreatingProvider(true);
    setError('');
    try {
      const created = await posBackendApi.createPaidInventoryReceiptProvider(providerName);
      setProviders((current) => [...current, created].sort((left, right) => left.name.localeCompare(right.name)));
      setProviderId(String(created.id));
      setProviderSearch('');
      setShowQuickProvider(false);
      setQuickProviderName('');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No se pudo crear el proveedor.');
    } finally {
      setCreatingProvider(false);
    }
  };

  const resetLineBuilder = () => {
    setSelectedProduct(null);
    setProductSearch('');
    setName('');
    setSku('');
    setCategory('');
    setInventoryUnit('Piece');
    setSalePrice('');
    setQuantity('1');
    setUnitCost('');
    setTaxEnabled(false);
    setTaxIncluded(false);
    setTaxProfileId(defaultTaxProfile?.id ?? '');
    setManualTaxPercent('');
  };

  const addLine = () => {
    setError('');
    if (mode === 'existing' && !selectedProduct) return setError('Selecciona un producto existente.');
    if (mode === 'new' && !name.trim()) return setError('Escribe el nombre del producto nuevo.');
    const nextQuantity = Number(quantity);
    if (mode === 'existing' && selectedProduct?.inventoryReady === false && !enableInventory) {
      return setError('Confirma la activación de inventario para recibir este producto existente.');
    }
    const nextUnitCost = Number(unitCost);
    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0 || !Number.isFinite(nextUnitCost) || nextUnitCost <= 0) {
      return setError('La cantidad y el costo unitario deben ser mayores que cero.');
    }
    if (selectedUnit === 'Piece' && !Number.isInteger(nextQuantity)) {
      return setError('Los productos por pieza requieren cantidades enteras.');
    }
    if (taxEnabled && (builderTaxPercent < 0 || builderTaxPercent > 100)) {
      return setError('La tasa de impuesto debe estar entre 0% y 100%.');
    }
    const nextSalePrice = salePrice ? Number(salePrice) : 0;
    if (mode === 'new' && (!Number.isFinite(nextSalePrice) || nextSalePrice < 0)) {
      return setError('El precio de venta no puede ser negativo.');
    }
    const profileName = selectedTaxProfile?.shortName || 'Impuesto manual';
    setLines((current) => [...current, {
      key: crypto.randomUUID(),
      product: mode === 'existing'
        ? { productId: selectedProduct?.id, inventoryUnit: selectedUnit, ...(selectedProduct?.inventoryReady === false ? { enableInventory: true } : {}) }
        : {
            name: name.trim(),
            sku: sku.trim() || null,
            category: category.trim() || 'Otros',
            inventoryUnit,
            salePrice: nextSalePrice,
          },
      productName: mode === 'existing' ? selectedProduct!.name : name.trim(),
      sku: mode === 'existing' ? selectedProduct?.sku : (sku.trim() || null),
      inventoryUnit: selectedUnit,
      quantity: nextQuantity,
      unitCost: nextUnitCost,
      taxEnabled,
      taxIncluded: taxEnabled && taxIncluded,
      taxProfileId: taxEnabled ? (selectedTaxProfile?.id ?? '') : '',
      taxName: taxEnabled ? profileName : 'Sin impuesto',
      taxRatePercent: taxEnabled ? builderTaxPercent : 0,
    }]);
    resetLineBuilder();
  };

  const updateLine = (key: string, patch: Partial<ReceiptLine>) => {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  };

  const validateEvidence = () => {
    if (!evidenceFile) return true;
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (evidenceFile.type && !validTypes.includes(evidenceFile.type)) {
      setError('El comprobante debe ser PDF, JPEG, PNG o WebP.');
      return false;
    }
    if (evidenceFile.size > 15 * 1024 * 1024) {
      setError('El comprobante no puede superar 15 MB.');
      return false;
    }
    return true;
  };

  const uploadEvidence = async (receipt: PosPaidInventoryReceiptResponse) => {
    if (!evidenceFile) return;
    const upload = await posBackendApi.preparePaidInventoryReceiptAttachment(receipt.id, evidenceFile);
    await posBackendApi.uploadPaidInventoryReceiptAttachment(upload, evidenceFile);
    await posBackendApi.registerPaidInventoryReceiptAttachment(receipt.id, upload, evidenceFile);
  };

  const finishSavedReceipt = async (receipt: PosPaidInventoryReceiptResponse, close = false) => {
    try {
      await onCompleted(
        `Recepción ${receipt.receiptNumber} guardada. ${receipt.items.length} ${receipt.items.length === 1 ? 'partida ingresó' : 'partidas ingresaron'} a ${receipt.warehouseName}.`,
      );
      if (close) onClose();
    } catch {
      setError(`La recepción ${receipt.receiptNumber} ya quedó guardada, pero no se pudo actualizar la vista. Puedes reintentar sin duplicar la operación.`);
    }
  };

  const submit = async () => {
    if (submitLock.current || savedReceipt) return;
    setError('');
    if (!providerId) return setError('Selecciona un proveedor.');
    if (!lines.length) return setError('Agrega al menos una partida.');
    if (lines.some((line) => line.quantity <= 0 || line.unitCost <= 0)) {
      return setError('Todas las partidas requieren cantidad y costo unitario mayores que cero.');
    }
    if (lines.some((line) => line.inventoryUnit === 'Piece' && !Number.isInteger(line.quantity))) {
      return setError('Las partidas medidas por pieza requieren cantidades enteras.');
    }
    if (lines.some((line) => line.taxEnabled && (line.taxRatePercent < 0 || line.taxRatePercent > 100))) {
      return setError('Todas las tasas de impuesto deben estar entre 0% y 100%.');
    }
    if (paymentMethod === 'TRANSFER' && !paymentAccountId) {
      return setError('Selecciona la cuenta bancaria de la transferencia.');
    }
    if (!validateEvidence()) return;
    submitLock.current = true;
    setSubmitting(true);
    const printWindow = reservePosTicketWindow();
    try {
      const receipt = await posBackendApi.createPaidInventoryReceipt({
        idempotencyKey: idempotencyKey.current,
        cashRegisterId,
        shiftId,
        providerId: Number(providerId),
        currencyCode,
        paymentMethod,
        paymentAccountId: paymentMethod === 'TRANSFER' ? Number(paymentAccountId) : null,
        paymentReference: paymentReference.trim() || null,
        notes: notes.trim() || null,
        items: lines.map((line) => ({
          product: line.product,
          quantity: line.quantity,
          unitCost: line.unitCost,
          taxRate: line.taxEnabled ? line.taxRatePercent / 100 : 0,
          taxIncluded: line.taxEnabled && line.taxIncluded,
          taxProfileId: line.taxEnabled ? line.taxProfileId || null : null,
          taxName: line.taxEnabled ? line.taxName : null,
        })),
      });
      setSavedReceipt(receipt);
      setRecentReceipts(current => [receipt, ...current.filter(item => item.id !== receipt.id)]);
      try {
        if (printWindow) printPosOperationTicket(receiptTicket(receipt), printWindow);
      } catch {
        printWindow?.close();
        setError('La recepción está guardada. Puedes volver a imprimir el ticket.');
      }
      await finishSavedReceipt(receipt);
      if (evidenceFile) {
        try {
          await uploadEvidence(receipt);
        } catch {
          setEvidencePendingRetry(true);
          setError(`La recepción ${receipt.receiptNumber} ya quedó guardada. El comprobante no se cargó; puedes reintentar sin duplicar la entrada ni el pago.`);
          return;
        }
      }
    } catch (nextError) {
      printWindow?.close();
      setError(nextError instanceof Error ? nextError.message : 'No se pudo guardar la recepción.');
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const retryEvidence = async () => {
    if (!savedReceipt || !validateEvidence()) return;
    setSubmitting(true);
    setError('');
    try {
      await uploadEvidence(savedReceipt);
      setEvidencePendingRetry(false);
      await finishSavedReceipt(savedReceipt);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'El comprobante no pudo cargarse; la recepción sigue guardada.');
    } finally {
      setSubmitting(false);
    }
  };

  const primaryActionClassName = workspaceMode
    ? posWorkspacePrimaryActionClassName
    : posModalPrimaryActionClassName;
  const secondaryActionClassName = workspaceMode
    ? posWorkspaceSecondaryActionClassName
    : posModalSecondaryActionClassName;

  return (
    <PosModalFrame
      modalType="operational-workspace"
      size="xl"
      presentation={workspaceMode ? 'workspace' : 'modal'}
      tone={workspaceMode ? 'graphite' : 'coral'}
      closeLabel="Cerrar recepción"
      eyebrow="Entrada de inventario pagada"
      icon={<PackagePlus className="h-6 w-6" />}
      isCloseDisabled={submitting}
      onClose={onClose}
      title="Recibir mercancía y pagar"
      subtitle={workspaceMode
        ? `Entrada a ${warehouseName}; el pago quedará en este turno.`
        : `Las partidas aumentarán existencias en ${warehouseName}; el pago se registrará en el turno actual.`}
      bodyClassName={workspaceMode ? 'space-y-3' : 'space-y-4'}
      footerClassName={workspaceMode ? undefined : posModalModuleFooterClassName}
      footerLeading={(
        <button type="button" onClick={onClose} disabled={submitting} className={secondaryActionClassName}>
          {savedReceipt ? 'Cerrar' : 'Cancelar'}
        </button>
      )}
      footerSummary={workspaceMode
        ? `${lines.length} ${lines.length === 1 ? 'partida' : 'partidas'} · Total ${money(totals.total)}`
        : `${lines.length} ${lines.length === 1 ? 'partida' : 'partidas'} · Subtotal ${money(totals.subtotal)} · Impuestos ${money(totals.tax)} · Total ${money(totals.total)}`}
      footer={savedReceipt ? (
        evidencePendingRetry ? (
          <button type="button" onClick={() => void retryEvidence()} disabled={submitting || !evidenceFile} className={primaryActionClassName}>
            <FileUp className="h-4 w-4" /> {submitting ? 'Cargando…' : 'Reintentar comprobante'}
          </button>
        ) : (
          <button type="button" onClick={() => void finishSavedReceipt(savedReceipt, true)} disabled={submitting} className={primaryActionClassName}>
            <Check className="h-4 w-4" /> Actualizar y cerrar
          </button>
        )
      ) : (
        <button type="button" onClick={() => void submit()} disabled={submitting || loadingCatalog || !providerId || !lines.length} className={primaryActionClassName}>
          <Check className="h-4 w-4" /> {submitting ? 'Guardando…' : 'Confirmar recepción'}
        </button>
      )}
    >
      {savedReceipt ? <PosModalSection><SectionTitle title={`Recepción ${savedReceipt.receiptNumber} guardada`} subtitle="Imprime el ticket o guárdalo como PDF desde la ventana de impresión." /><OperationTicketPreview ticket={receiptTicket(savedReceipt)} /></PosModalSection> : null}
      {!savedReceipt && recentReceipts.length > 0 ? <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Tickets de recepciones de este turno</summary>
        <div className="my-3 flex flex-wrap gap-2">{recentReceipts.map(receipt => <button type="button" key={receipt.id} onClick={() => setHistoryReceipt(receipt)} className="rounded border px-3 py-2 text-sm">{receipt.receiptNumber} · {receipt.status === 'REVERSED' ? 'Revertida' : 'Confirmada'}</button>)}</div>
        {historyReceipt && <OperationTicketPreview ticket={receiptTicket(historyReceipt)} />}
      </details> : null}
      <PosModalSection className={workspaceMode ? 'p-4' : undefined}>
        <SectionTitle title="1. Proveedor y pago" subtitle="Identifica a quién se pagó y de dónde salió el dinero." />
        <div className={workspaceMode ? 'mt-4 grid gap-4' : 'mt-4 grid gap-4 lg:grid-cols-2'}>
          <div className="space-y-3">
            <Field label="Proveedor">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-5 h-4 w-4 text-slate-400" />
                <input autoFocus value={providerSearch} onChange={(event) => setProviderSearch(event.target.value)} className={`${controlClassName} pl-9`} placeholder="Buscar por nombre, RFC o correo" disabled={Boolean(savedReceipt)} />
              </div>
              <select value={providerId} onChange={(event) => setProviderId(event.target.value)} className={controlClassName} disabled={Boolean(savedReceipt)}>
                <option value="">Selecciona un proveedor…</option>
                {filteredProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.name}{provider.taxId ? ` · ${provider.taxId}` : ''}</option>
                ))}
              </select>
            </Field>
            <button type="button" onClick={() => setShowQuickProvider((current) => !current)} disabled={Boolean(savedReceipt)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#59C3A5] bg-[#59C3A5]/10 px-3 text-sm font-medium text-[#0B6B57] disabled:opacity-50">
              <UserRoundPlus className="h-4 w-4" /> Agregar proveedor rápido
            </button>
            {showQuickProvider ? (
              <div className="flex flex-col gap-2 rounded-lg border border-[#59C3A5]/40 bg-[#59C3A5]/10 p-3 sm:flex-row sm:items-end">
                <Field label="Nombre del proveedor" className="flex-1">
                  <input value={quickProviderName} onChange={(event) => setQuickProviderName(event.target.value)} className={controlClassName} placeholder="Ej. Distribuidora del Centro" />
                </Field>
                <button type="button" onClick={() => void createQuickProvider()} disabled={creatingProvider} className={`${posWorkspaceSecondaryActionClassName} shrink-0`}>
                  {creatingProvider ? 'Creando…' : 'Crear y seleccionar'}
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid content-start gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">Forma de pago</span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <Choice active={paymentMethod === 'CASH'} disabled={Boolean(savedReceipt)} onClick={() => setPaymentMethod('CASH')}>Efectivo</Choice>
                <Choice active={paymentMethod === 'TRANSFER'} disabled={Boolean(savedReceipt)} onClick={() => setPaymentMethod('TRANSFER')}>Transferencia</Choice>
              </div>
            </div>
            {paymentMethod === 'TRANSFER' ? (
              <Field label="Cuenta bancaria" className="sm:col-span-2">
                <select value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)} className={controlClassName} disabled={Boolean(savedReceipt)}>
                  <option value="">Selecciona la cuenta que pagó…</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {money(Number(account.availableBalance))}</option>)}
                </select>
              </Field>
            ) : (
              <div className="sm:col-span-2 rounded-lg border border-[#F4C84A]/50 bg-[#F4C84A]/10 p-3 text-sm text-slate-700 dark:text-slate-200">
                El total se descontará del efectivo esperado de esta caja.
              </div>
            )}
          </div>
        </div>
      </PosModalSection>

      {!savedReceipt ? (
        <PosModalSection className={workspaceMode ? 'p-4' : undefined}>
          <SectionTitle title="2. Agregar partida" subtitle="Busca un producto existente o crea uno sin salir de la recepción." />
          <div className={workspaceMode ? 'mt-4 grid gap-4' : 'mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]'}>
            <div>
              <div className="grid grid-cols-2 gap-2">
                <Choice active={mode === 'existing'} onClick={() => setMode('existing')}>Producto existente</Choice>
                <Choice active={mode === 'new'} onClick={() => setMode('new')}>Producto nuevo</Choice>
              </div>
              {mode === 'existing' ? (
                <div className="mt-3 grid gap-3">
                  <Field label="Búsqueda rápida">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-5 h-4 w-4 text-slate-400" />
                      <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} className={`${controlClassName} pl-9`} placeholder="Nombre, SKU o categoría" />
                    </div>
                  </Field>
                  <Field label="Producto">
                    <select value={selectedProduct?.id ?? ''} onChange={(event) => {
                      const product = displayProducts.find((row) => row.id === Number(event.target.value)) ?? null;
                      setSelectedProduct(product);
                      setEnableInventory(false);
                      if (product && Number(product.unitCost) > 0) setUnitCost(String(product.unitCost));
                    }} className={controlClassName}>
                      <option value="">{loadingProducts ? 'Cargando productos…' : 'Selecciona un producto…'}</option>
                      {displayProducts.map((product) => (
                        <option key={product.id} value={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ''}{product.category ? ` · ${product.category}` : ''}{product.inventoryReady === false ? ' · Activar inventario' : ''}</option>
                      ))}
                    </select>
                  </Field>
                  {catalogError ? <div role="alert" className="text-sm text-red-700"><p>{catalogError}</p><button type="button" onClick={() => setCatalogAttempt(value => value + 1)}>Reintentar carga de productos</button></div> : null}
                  {!loadingProducts && !catalogError && products.length === 0 ? <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No hay productos compatibles con {currencyCode} para esta búsqueda. Se muestran productos y paquetes activos; los servicios y artículos sin control de inventario se configuran en Productos.</p> : null}
                  {selectedProduct?.inventoryReady === false ? <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <input type="checkbox" checked={enableInventory} onChange={event => setEnableInventory(event.target.checked)} />
                    <span>Activar inventario para este producto al confirmar la recepción. Se conservarán su unidad ({unitLabel(selectedUnit)}) y sus existencias anteriores.</span>
                  </label> : null}
                </div>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Nombre" className="sm:col-span-2"><input value={name} onChange={(event) => setName(event.target.value)} className={controlClassName} /></Field>
                  <Field label="SKU opcional"><input value={sku} onChange={(event) => setSku(event.target.value)} className={controlClassName} /></Field>
                  <Field label="Categoría"><input value={category} onChange={(event) => setCategory(event.target.value)} className={controlClassName} placeholder="Ej. Bebidas" /></Field>
                  <Field label="Unidad de inventario"><select value={inventoryUnit} onChange={(event) => setInventoryUnit(event.target.value)} className={controlClassName}>{units.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></Field>
                  <Field label="Precio de venta opcional"><input type="number" min="0" step="0.01" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} className={controlClassName} /></Field>
                </div>
              )}
            </div>

            <div className="grid content-start gap-3 sm:grid-cols-2">
              <Field label={`Cantidad (${unitLabel(selectedUnit)})`}><input type="number" min="0" step={selectedUnit === 'Piece' ? '1' : '0.001'} value={quantity} onChange={(event) => setQuantity(event.target.value)} className={controlClassName} /></Field>
              <Field label={`Costo unitario / ${unitLabel(selectedUnit)}`}><input type="number" min="0" step="0.0001" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} className={controlClassName} /></Field>
              <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <Checkbox checked={taxEnabled} onChange={setTaxEnabled} label="Aplicar impuesto a esta partida" />
                {taxEnabled ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Impuesto"><select value={taxProfileId} onChange={(event) => { setTaxProfileId(event.target.value); setManualTaxPercent(''); }} className={controlClassName}>{taxProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></Field>
                    {selectedTaxProfile?.manualRate ? <Field label="Tasa manual (%)"><input type="number" min="0" max="100" step="0.001" value={manualTaxPercent} onChange={(event) => setManualTaxPercent(event.target.value)} className={controlClassName} /></Field> : null}
                    <div className="flex items-end pb-2 sm:col-span-2"><Checkbox checked={taxIncluded} onChange={setTaxIncluded} label="El costo unitario ya incluye el impuesto" /></div>
                  </div>
                ) : null}
              </div>
              <button type="button" onClick={addLine} className="sm:col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#222831] px-4 text-sm font-medium text-white hover:bg-[#15191f]">
                <Plus className="h-4 w-4" /> Agregar partida
              </button>
            </div>
          </div>
        </PosModalSection>
      ) : null}

      <PosModalSection className={workspaceMode ? 'p-4' : undefined}>
        <SectionTitle title="3. Partidas de la recepción" subtitle="Ajusta cantidad, costo unitario e impuesto. El total es calculado por Índice." />
        {lines.length ? (
          <div className="mt-4 space-y-3">
            {lines.map((line, index) => {
              const amounts = lineAmounts(line);
              const lineProfile = taxProfiles.find((profile) => profile.id === line.taxProfileId);
              return (
                <article key={line.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <div className={workspaceMode
                    ? 'grid gap-3 sm:grid-cols-2'
                    : 'grid gap-3 lg:grid-cols-[minmax(13rem,1.5fr)_8rem_10rem_minmax(12rem,1fr)_9rem_auto] lg:items-end'}>
                    <div className={workspaceMode ? 'min-w-0 self-center sm:col-span-2' : 'min-w-0 self-center'}>
                      <p className="text-xs font-medium text-[#B63B32]">Partida {index + 1}</p>
                      <p className="truncate font-medium text-slate-950 dark:text-white">{line.productName}</p>
                      <p className="truncate text-xs text-slate-500">{line.sku || 'Sin SKU'} · {unitLabel(line.inventoryUnit)}</p>
                    </div>
                    <Field label="Cantidad"><input type="number" min="0" step={line.inventoryUnit === 'Piece' ? '1' : '0.001'} value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: Number(event.target.value) })} className={controlClassName} disabled={Boolean(savedReceipt)} /></Field>
                    <Field label="Costo unitario"><input type="number" min="0" step="0.0001" value={line.unitCost} onChange={(event) => updateLine(line.key, { unitCost: Number(event.target.value) })} className={controlClassName} disabled={Boolean(savedReceipt)} /></Field>
                    <div className={workspaceMode ? 'sm:col-span-2' : undefined}>
                      <Checkbox checked={line.taxEnabled} disabled={Boolean(savedReceipt)} onChange={(checked) => updateLine(line.key, { taxEnabled: checked, taxIncluded: checked ? line.taxIncluded : false })} label="Impuesto" />
                      {line.taxEnabled ? (
                        <select value={line.taxProfileId} onChange={(event) => {
                          const profile = taxProfiles.find((row) => row.id === event.target.value);
                          updateLine(line.key, {
                            taxProfileId: event.target.value,
                            taxName: profile?.shortName ?? 'Impuesto manual',
                            taxRatePercent: profile?.manualRate ? 0 : Number(taxRateToPercentInput(profile?.rate ?? 0)),
                          });
                        }} className={controlClassName} disabled={Boolean(savedReceipt)}>
                          {taxProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.shortName}{profile.region ? ` · ${profile.region}` : ''}</option>)}
                        </select>
                      ) : null}
                      {line.taxEnabled && lineProfile?.manualRate ? <input aria-label="Tasa manual" type="number" min="0" max="100" step="0.001" value={line.taxRatePercent} onChange={(event) => updateLine(line.key, { taxRatePercent: Number(event.target.value) })} className={controlClassName} disabled={Boolean(savedReceipt)} /> : null}
                      {line.taxEnabled ? <div className="mt-2"><Checkbox checked={line.taxIncluded} disabled={Boolean(savedReceipt)} onChange={(checked) => updateLine(line.key, { taxIncluded: checked })} label="Incluido" /></div> : null}
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="font-medium text-slate-950 dark:text-white">{money(amounts.total)}</p>
                      {amounts.tax > 0 ? <p className="text-xs text-slate-500">Impuesto {money(amounts.tax)}</p> : null}
                    </div>
                    {!savedReceipt ? <button type="button" onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))} aria-label={`Eliminar ${line.productName}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button> : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            Aún no hay partidas. Busca o crea un producto y agrégalo a la recepción.
          </div>
        )}
      </PosModalSection>

      <PosModalSection className={workspaceMode ? 'p-4' : undefined}>
        <SectionTitle title="4. Comprobante y notas" subtitle="Adjunta el ticket o factura para conservar la evidencia de la compra." />
        <div className={workspaceMode ? 'mt-4 grid gap-4' : 'mt-4 grid gap-4 lg:grid-cols-2'}>
          <Field label="Comprobante opcional (PDF o imagen)"><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)} className={controlClassName} disabled={submitting} /></Field>
          <Field label="Referencia opcional"><input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} className={controlClassName} placeholder="Folio, transferencia o ticket" disabled={Boolean(savedReceipt)} /></Field>
          <Field label="Notas opcionales" className={workspaceMode ? '' : 'lg:col-span-2'}><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={`${controlClassName} min-h-24 resize-y`} disabled={Boolean(savedReceipt)} /></Field>
        </div>
      </PosModalSection>

      {savedReceipt ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="status">
          La recepción y el pago ya están registrados. Los reintentos no duplicarán partidas, existencias ni movimientos de dinero.
        </div>
      ) : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div> : null}
    </PosModalFrame>
  );
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`block min-w-0 ${className}`}><span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>{children}</label>;
}

function Choice({ active, disabled = false, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`min-h-11 rounded-lg border px-4 text-sm font-medium transition disabled:opacity-50 ${active ? 'border-[#FF6B5E] bg-[#FF6B5E]/15 text-[#222831] dark:text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>{children}</button>;
}

function Checkbox({ checked, disabled = false, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <label className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#FF6B5E] focus:ring-[#FF6B5E]" />{label}</label>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><h3 className="text-base font-medium text-slate-950 dark:text-white">{title}</h3><p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p></div>;
}
