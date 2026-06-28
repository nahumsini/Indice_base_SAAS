import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router';
import { AlertTriangle, CheckCircle2, FileText, ImageIcon, KeyRound, Loader2, Plus, Send, Trash2, UploadCloud, X } from 'lucide-react';
import { supplierPortalPublicApi } from '../OrdenesCompra/services/purchaseOrdersApi';
import type {
  SupplierInvoice,
  SupplierPortalCatalogProduct,
  SupplierPortalContextResponse,
  SupplierSubmission,
} from '../OrdenesCompra/types/purchaseOrder.types';

type ProposalItem = {
  productId: number | null;
  providerSku: string;
  productName: string;
  productDescription: string;
  imageUrl: string;
  quantity: string;
  unitCost: string;
  taxRate: string;
  leadTimeDays: string;
  minimumOrderQuantity: string;
};

const emptyItem = (): ProposalItem => ({
  productId: null,
  providerSku: '',
  productName: '',
  productDescription: '',
  imageUrl: '',
  quantity: '1',
  unitCost: '0',
  taxRate: '0',
  leadTimeDays: '',
  minimumOrderQuantity: '',
});

const currencies = ['MXN', 'USD', 'CAD', 'COP', 'BRL'];

function parseNumber(value: string | number | null | undefined) {
  const parsed = Number(String(value ?? '').replace(/,/g, '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number, currencyCode: string) {
  return new Intl.NumberFormat('es-MX', {
    currency: currencyCode || 'MXN',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(Number.isFinite(value) ? value : 0);
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return '0 KB';
  }
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.ceil(sizeBytes / 1024)} KB`;
}

export default function SupplierPortal() {
  const { portalCode = '' } = useParams();
  const [pin, setPin] = useState('');
  const [authPin, setAuthPin] = useState('');
  const [context, setContext] = useState<SupplierPortalContextResponse | null>(null);
  const [currencyCode, setCurrencyCode] = useState('MXN');
  const [submittedByName, setSubmittedByName] = useState('');
  const [submittedByEmail, setSubmittedByEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ProposalItem[]>(() => [emptyItem()]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => todayIsoDate());
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceDocumentUrl, setInvoiceDocumentUrl] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoiceSubtotal, setInvoiceSubtotal] = useState('');
  const [invoiceTax, setInvoiceTax] = useState('');
  const [invoiceTotal, setInvoiceTotal] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [uploadedInvoiceDocument, setUploadedInvoiceDocument] = useState<{ fileName: string; objectKey: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [invoiceUploading, setInvoiceUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<SupplierSubmission | null>(null);
  const [invoiceSuccess, setInvoiceSuccess] = useState<SupplierInvoice | null>(null);

  const totals = useMemo(() => {
    return items.reduce((summary, item) => {
      const subtotal = parseNumber(item.quantity) * parseNumber(item.unitCost);
      const tax = subtotal * (parseNumber(item.taxRate) / 100);
      return {
        subtotal: summary.subtotal + subtotal,
        tax: summary.tax + tax,
        total: summary.total + subtotal + tax,
      };
    }, { subtotal: 0, tax: 0, total: 0 });
  }, [items]);

  const canSubmit = Boolean(
    context
    && authPin
    && !saving
    && items.length > 0
    && items.every(item => item.productName.trim() && parseNumber(item.quantity) > 0 && parseNumber(item.unitCost) >= 0),
  );

  const invoiceAmounts = useMemo(() => {
    const subtotal = parseNumber(invoiceSubtotal || totals.subtotal);
    const tax = parseNumber(invoiceTax || totals.tax);
    const total = parseNumber(invoiceTotal || totals.total);
    return { subtotal, tax, total };
  }, [invoiceSubtotal, invoiceTax, invoiceTotal, totals.subtotal, totals.tax, totals.total]);

  const canSubmitInvoice = Boolean(
    context
    && authPin
    && !invoiceSaving
    && !invoiceUploading
    && invoiceNumber.trim()
    && invoiceAmounts.total > 0,
  );

  const authenticate = async () => {
    if (!portalCode || !pin.trim()) return;
    setLoading(true);
    setError('');
    setSuccess(null);
    setInvoiceSuccess(null);
    try {
      const response = await supplierPortalPublicApi.authenticate(portalCode, pin.trim());
      setContext(response);
      setAuthPin(pin.trim());
      setCurrencyCode(response.catalogProducts[0]?.currencyCode || 'MXN');
      setPin('');
    } catch (authError) {
      setError(errorMessage(authError, 'No se pudo validar el acceso del proveedor.'));
    } finally {
      setLoading(false);
    }
  };

  const addCatalogProduct = (product: SupplierPortalCatalogProduct) => {
    setItems(current => ([
      ...current,
      {
        productId: product.productId,
        providerSku: product.providerSku || product.productSku || '',
        productName: product.productName,
        productDescription: '',
        imageUrl: '',
        quantity: String(product.minimumOrderQuantity || 1),
        unitCost: String(product.costAmount || 0),
        taxRate: '0',
        leadTimeDays: product.leadTimeDays == null ? '' : String(product.leadTimeDays),
        minimumOrderQuantity: product.minimumOrderQuantity == null ? '' : String(product.minimumOrderQuantity),
      },
    ]));
    if (product.currencyCode) {
      setCurrencyCode(product.currencyCode);
    }
  };

  const updateItem = <K extends keyof ProposalItem>(index: number, key: K, value: ProposalItem[K]) => {
    setItems(current => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )));
  };

  const submit = async () => {
    if (!canSubmit || !context) return;
    setSaving(true);
    setError('');
    setSuccess(null);
    try {
      const response = await supplierPortalPublicApi.submit(portalCode, {
        pin: authPin,
        currencyCode,
        submittedByName: submittedByName.trim() || null,
        submittedByEmail: submittedByEmail.trim() || null,
        notes: notes.trim() || null,
        items: items.map(item => ({
          productId: item.productId,
          providerSku: item.providerSku.trim() || null,
          productName: item.productName.trim(),
          productDescription: item.productDescription.trim() || null,
          imageUrl: item.imageUrl.trim() || null,
          quantity: parseNumber(item.quantity),
          unitCost: parseNumber(item.unitCost),
          taxRate: parseNumber(item.taxRate),
          leadTimeDays: item.leadTimeDays ? Number(item.leadTimeDays) : null,
          minimumOrderQuantity: item.minimumOrderQuantity ? parseNumber(item.minimumOrderQuantity) : null,
        })),
      });
      setSuccess(response);
      setItems([emptyItem()]);
      setNotes('');
    } catch (submitError) {
      setError(errorMessage(submitError, 'No se pudo enviar la propuesta.'));
    } finally {
      setSaving(false);
    }
  };

  const useProposalTotalForInvoice = () => {
    setInvoiceSubtotal(String(totals.subtotal.toFixed(2)));
    setInvoiceTax(String(totals.tax.toFixed(2)));
    setInvoiceTotal(String(totals.total.toFixed(2)));
  };

  const uploadInvoiceDocumentIfNeeded = async () => {
    if (!invoiceFile) {
      return invoiceDocumentUrl.trim() || null;
    }
    if (uploadedInvoiceDocument?.fileName === invoiceFile.name) {
      return uploadedInvoiceDocument.objectKey;
    }
    setInvoiceUploading(true);
    try {
      const presign = await supplierPortalPublicApi.presignInvoiceDocument(portalCode, {
        pin: authPin,
        fileName: invoiceFile.name,
        contentType: invoiceFile.type || null,
        sizeBytes: invoiceFile.size,
      });
      const uploadUrl = presign.uploadUrl || presign.upload_url;
      const uploadHeaders = presign.uploadHeaders || presign.upload_headers || {};
      const objectKey = presign.objectKey || presign.object_key || '';
      if (!uploadUrl || !objectKey) {
        throw new Error('No se pudo preparar la subida del documento.');
      }
      await supplierPortalPublicApi.uploadDocument(
        uploadUrl,
        invoiceFile,
        presign.contentType || invoiceFile.type || 'application/octet-stream',
        uploadHeaders,
      );
      setUploadedInvoiceDocument({ fileName: invoiceFile.name, objectKey });
      setInvoiceDocumentUrl(objectKey);
      return objectKey;
    } finally {
      setInvoiceUploading(false);
    }
  };

  const submitInvoice = async () => {
    if (!canSubmitInvoice) return;
    setInvoiceSaving(true);
    setError('');
    setInvoiceSuccess(null);
    try {
      const documentReference = await uploadInvoiceDocumentIfNeeded();
      const response = await supplierPortalPublicApi.submitInvoice(portalCode, {
        pin: authPin,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: invoiceDate || null,
        dueDate: invoiceDueDate || null,
        subtotalAmount: invoiceAmounts.subtotal,
        taxAmount: invoiceAmounts.tax,
        totalAmount: invoiceAmounts.total,
        currencyCode,
        notes: invoiceNotes.trim() || null,
        documentUrl: documentReference,
        submittedByName: submittedByName.trim() || null,
      });
      setInvoiceSuccess(response);
      setInvoiceNumber('');
      setInvoiceDocumentUrl('');
      setInvoiceFile(null);
      setUploadedInvoiceDocument(null);
      setInvoiceNotes('');
      setInvoiceSubtotal('');
      setInvoiceTax('');
      setInvoiceTotal('');
    } catch (submitError) {
      setError(errorMessage(submitError, 'No se pudo enviar la factura del proveedor.'));
    } finally {
      setInvoiceSaving(false);
    }
  };

  if (!context) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 text-slate-950 dark:bg-slate-950 dark:text-white">
        <section className="mx-auto mt-16 max-w-lg overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <header className="bg-slate-950 px-6 py-6 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500">
                <KeyRound className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-200">Portal proveedor</p>
                <h1 className="text-2xl font-black">Acceso a propuesta</h1>
              </div>
            </div>
          </header>
          <div className="space-y-4 p-6">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Ingresa el PIN compartido por Indice para cargar productos, cantidades y precios.
            </p>
            {error ? <Message tone="error" text={error} /> : null}
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Código del portal</span>
              <input value={portalCode} disabled className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">PIN</span>
              <input
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void authenticate();
                }}
                className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-2xl font-black tracking-[0.2em] text-slate-950 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <button type="button" disabled={loading || !pin.trim()} onClick={() => void authenticate()} className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Entrar
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-[28px] bg-slate-950 p-5 text-white shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-200">Portal proveedor</p>
              <h1 className="mt-1 text-3xl font-black">{context.providerName}</h1>
              <p className="mt-1 text-sm font-semibold text-white/70">{context.portalCode} · propuesta de compra</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">Total propuesta</p>
              <p className="text-3xl font-black">{formatMoney(totals.total, currencyCode)}</p>
            </div>
          </div>
        </header>

        {error ? <Message tone="error" text={error} /> : null}
        {success ? <Message tone="success" text={`Propuesta ${success.submissionNumber} enviada. Indice la revisara antes de generar una orden de compra.`} /> : null}
        {invoiceSuccess ? <Message tone="success" text={`Factura ${invoiceSuccess.invoiceNumber} enviada para revision de cuentas por pagar.`} /> : null}

        <div className="grid gap-5 lg:grid-cols-[360px_1fr_320px]">
          <aside className="space-y-4">
            <Panel title="Catálogo ligado" subtitle="Productos ya relacionados con tu proveedor.">
              {context.catalogProducts.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No hay productos ligados. Puedes capturarlos manualmente.
                </p>
              ) : context.catalogProducts.map((product) => (
                <button key={product.productId} type="button" onClick={() => addCatalogProduct(product)} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-orange-200 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-orange-500/10">
                  <p className="font-black text-slate-950 dark:text-white">{product.productName}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{product.providerSku || product.productSku || 'Sin SKU'}</p>
                  <p className="mt-3 text-lg font-black text-orange-600">{formatMoney(parseNumber(product.costAmount), product.currencyCode)}</p>
                </button>
              ))}
            </Panel>
          </aside>

          <section className="space-y-4">
            <Panel title="Partidas propuestas" subtitle="Precarga productos, costos, cantidades y evidencia visual.">
              <div className="space-y-4">
                {items.map((item, index) => (
                  <article key={index} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-200">
                          {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full rounded-2xl object-cover" /> : <ImageIcon className="h-5 w-5" />}
                        </span>
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Partida {index + 1}</p>
                          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{item.productId ? `Producto ligado #${item.productId}` : 'Producto manual o nuevo'}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <Input label="Producto" value={item.productName} onChange={(value) => updateItem(index, 'productName', value)} />
                      <Input label="SKU proveedor" value={item.providerSku} onChange={(value) => updateItem(index, 'providerSku', value)} />
                      <Input label="Cantidad" value={item.quantity} onChange={(value) => updateItem(index, 'quantity', value)} />
                      <Input label="Costo unitario" value={item.unitCost} onChange={(value) => updateItem(index, 'unitCost', value)} />
                      <Input label="Impuesto %" value={item.taxRate} onChange={(value) => updateItem(index, 'taxRate', value)} />
                      <Input label="Días de entrega" value={item.leadTimeDays} onChange={(value) => updateItem(index, 'leadTimeDays', value)} />
                      <Input label="Imagen URL" value={item.imageUrl} onChange={(value) => updateItem(index, 'imageUrl', value)} />
                      <Input label="Mínimo de compra" value={item.minimumOrderQuantity} onChange={(value) => updateItem(index, 'minimumOrderQuantity', value)} />
                    </div>
                    <label className="mt-3 block space-y-2">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Descripción</span>
                      <textarea value={item.productDescription} onChange={(event) => updateItem(index, 'productDescription', event.target.value)} className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    </label>
                  </article>
                ))}
              </div>
              <button type="button" onClick={() => setItems(current => [...current, emptyItem()])} className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                <Plus className="h-4 w-4" />
                Agregar partida manual
              </button>
            </Panel>
          </section>

          <aside className="space-y-4">
            <Panel title="Resumen" subtitle="Datos de contacto y total antes de enviar.">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Divisa</span>
                <select value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  {currencies.map(currency => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </label>
              <Input label="Tu nombre" value={submittedByName} onChange={setSubmittedByName} />
              <Input label="Email" value={submittedByEmail} onChange={setSubmittedByEmail} />
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Notas</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
              <div className="space-y-2 rounded-2xl bg-slate-950 p-4 text-white">
                <Summary label="Subtotal" value={formatMoney(totals.subtotal, currencyCode)} />
                <Summary label="Impuesto" value={formatMoney(totals.tax, currencyCode)} />
                <Summary label="Total" value={formatMoney(totals.total, currencyCode)} large />
              </div>
              <button type="button" disabled={!canSubmit} onClick={() => void submit()} className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar propuesta
              </button>
            </Panel>

            <Panel title="Factura / cuenta por cobrar" subtitle="Documento opcional para revision interna.">
              <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-100">
                <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                <span>La factura queda pendiente de validacion antes de pago.</span>
              </div>
              <Input label="Folio factura" value={invoiceNumber} onChange={setInvoiceNumber} />
              <Input label="Fecha factura" type="date" value={invoiceDate} onChange={setInvoiceDate} />
              <Input label="Vence" type="date" value={invoiceDueDate} onChange={setInvoiceDueDate} />
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm dark:bg-slate-900 dark:text-orange-200">
                    {invoiceUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-950 dark:text-white">Archivo de factura</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      PDF, imagen, XML, DOCX o XLSX. Maximo 15 MB.
                    </p>
                  </div>
                </div>
                <label className="mt-3 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                  Seleccionar archivo
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.xml,.docx,.xlsx,application/pdf,image/jpeg,image/png,image/webp,application/xml,text/xml,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setInvoiceFile(file);
                      setUploadedInvoiceDocument(null);
                      if (file) {
                        setInvoiceDocumentUrl('');
                      }
                    }}
                  />
                </label>
                {invoiceFile ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                    <span className="truncate">{invoiceFile.name} · {formatFileSize(invoiceFile.size)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceFile(null);
                        setUploadedInvoiceDocument(null);
                      }}
                      className="rounded-lg p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                {uploadedInvoiceDocument ? (
                  <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-300">Documento subido y listo para registrar.</p>
                ) : null}
              </div>
              <Input label="Documento URL externo" value={invoiceDocumentUrl} onChange={(value) => {
                setInvoiceDocumentUrl(value);
                if (value.trim()) {
                  setInvoiceFile(null);
                  setUploadedInvoiceDocument(null);
                }
              }} />
              <div className="grid gap-2 sm:grid-cols-3">
                <Input label="Subtotal" value={invoiceSubtotal} onChange={setInvoiceSubtotal} />
                <Input label="Impuesto" value={invoiceTax} onChange={setInvoiceTax} />
                <Input label="Total" value={invoiceTotal} onChange={setInvoiceTotal} />
              </div>
              <button type="button" onClick={useProposalTotalForInvoice} className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
                Usar total de propuesta
              </button>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Notas factura</span>
                <textarea value={invoiceNotes} onChange={(event) => setInvoiceNotes(event.target.value)} className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                <Summary label="Total factura" value={formatMoney(invoiceAmounts.total, currencyCode)} large tone="light" />
              </div>
              <button type="button" disabled={!canSubmitInvoice} onClick={() => void submitInvoice()} className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950">
                {invoiceSaving || invoiceUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {invoiceUploading ? 'Subiendo documento' : 'Enviar factura'}
              </button>
            </Panel>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Panel({ children, subtitle, title }: { children: ReactNode; subtitle: string; title: string }) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>
      </header>
      <div className="space-y-3 p-5">{children}</div>
    </section>
  );
}

function Input({ label, onChange, type = 'text', value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
    </label>
  );
}

function Summary({
  label,
  large = false,
  tone = 'dark',
  value,
}: {
  label: string;
  large?: boolean;
  tone?: 'dark' | 'light';
  value: string;
}) {
  const labelClass = tone === 'dark'
    ? 'text-white/55'
    : 'text-slate-500 dark:text-slate-400';
  const valueClass = tone === 'dark'
    ? 'text-white'
    : 'text-slate-950 dark:text-white';
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-xs font-black uppercase tracking-[0.14em] ${labelClass}`}>{label}</span>
      <span className={`${large ? 'text-2xl font-black' : 'text-sm font-bold'} ${valueClass}`}>{value}</span>
    </div>
  );
}

function Message({ text, tone }: { text: string; tone: 'error' | 'success' }) {
  const isError = tone === 'error';
  return (
    <div className={`flex items-start gap-3 rounded-[20px] border px-5 py-4 text-sm font-bold ${
      isError
        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
    }`}>
      {isError ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{text}</span>
    </div>
  );
}
