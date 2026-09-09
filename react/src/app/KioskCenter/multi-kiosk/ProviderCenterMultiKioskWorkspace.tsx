import { useDeferredValue, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  CircleDollarSign,
  File,
  FileText,
  Landmark,
  LoaderCircle,
  PackageCheck,
  PackagePlus,
  Paperclip,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  UploadCloud,
} from 'lucide-react';
import {
  IndiceModalSummary,
  IndiceModalValidation,
  IndiceModalWizardStepper,
} from '../../components/indice-modal';
import { multiKioskPublicApi, type MultiKioskChildWorkspace } from '../../api/multiKiosks';
import {
  uploadPresignedKioskFile,
  type KioskPresignedUpload,
} from '../multiKioskWorkspaceUploads';

type Row = Record<string, unknown>;
type QuoteLine = { productId?: number; productName: string; providerSku: string; quantity: string; unitCost: string; taxRate: string };
type PurchaseProposalLine = {
  id: string;
  productId?: number;
  productName: string;
  providerSku: string;
  catalogSku: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
  providerProduct: boolean;
};
type ProposalStep = 'reference' | 'items' | 'review';
type ProviderCatalogProduct = {
  id: number;
  name: string;
  sku: string;
  productCode: string;
  providerSku: string;
  providerProduct: boolean;
  costAmount: number;
  currencyCode: string;
};
const transactionCurrencies = ['MXN', 'USD', 'CAD', 'COP', 'BRL'];
const normalizeCatalogText = (value: unknown) => text(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const caps = {
  proposal: 'procurement.provider.proposal.submit@1',
  quote: 'procurement.provider.quote.respond@1',
  procurementProfile: 'procurement.provider.profile-change.submit@1',
  order: 'procurement.provider.order.respond@1',
  invoicePresign: 'procurement.invoice.document.presign@1',
  invoiceRegister: 'procurement.invoice.document.register@1',
  invoice: 'procurement.provider.order-invoice.submit@1',
  payable: 'payables.submission.create@1',
  payablePresign: 'payables.attachment.presign@1',
  payableRegister: 'payables.attachment.register@1',
  profile: 'providers.profile-change.submit@1',
};

type ProviderDocumentMode = 'invoice' | 'payable';
type PresignResponse = {
  objectKey?: string;
  object_key?: string;
  uploadUrl?: string;
  upload_url?: string;
  uploadHeaders?: Record<string, string>;
  upload_headers?: Record<string, string>;
};

const invoiceMaximumDocumentBytes = 15 * 1024 * 1024;
const payableMaximumDocumentBytes = 10 * 1024 * 1024;
const supportedDocumentTypes = new Set([
  'application/pdf', 'application/xml', 'text/xml',
  'image/jpeg', 'image/png', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const inputClass = 'mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Row[] : [];
const text = (value: unknown) => value == null ? '' : String(value);
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const id = (value: unknown) => number(value);
const date = (value: unknown) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(text(value));
  return Number.isNaN(parsed.getTime()) ? text(value) : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(parsed);
};
const money = (value: unknown, currency: unknown = 'MXN') => new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: text(currency) || 'MXN', maximumFractionDigits: 2,
}).format(number(value));
const csrfFor = (token: string) => {
  try { return sessionStorage.getItem(`indice.multi-kiosk.${token}.csrf`) ?? ''; } catch { return ''; }
};

const documentContentType = (file: File) => {
  if (file.type) return file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension === 'pdf' ? 'application/pdf'
    : extension === 'xml' ? 'application/xml'
      : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg'
        : extension === 'png' ? 'image/png'
          : extension === 'webp' ? 'image/webp'
            : extension === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              : extension === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'application/octet-stream';
};

function Panel({ children, icon, subtitle, title }: { children: ReactNode; icon: ReactNode; subtitle?: string; title: string }) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">{icon}</span>
        <div className="min-w-0"><h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>{subtitle ? <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p> : null}</div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label className="block"><span className="text-xs font-medium text-slate-700 dark:text-slate-200">{label}</span>{children}</label>;
}

function TransactionCurrencySelect({ value, onChange }: {
  value?: string;
  onChange?: (value: string) => void;
}) {
  return <select required name="currency_code" value={value} defaultValue={value === undefined ? 'MXN' : undefined} onChange={onChange ? event => onChange(event.target.value) : undefined} className={inputClass}>{transactionCurrencies.map(currency => <option key={currency} value={currency}>{currency}</option>)}</select>;
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-300 px-4 py-7 text-center text-xs leading-5 text-slate-500 dark:border-slate-700">{children}</p>;
}

const providerStatusLabels: Record<string, string> = {
  ACTIVE: 'Activo',
  APPROVED: 'Aprobada',
  CANCELLED: 'Cancelada',
  CONFIRMED: 'Confirmada',
  DRAFT: 'Borrador',
  IN_REVIEW: 'En revisión',
  NEEDS_CLARIFICATION: 'Requiere aclaración',
  OVERDUE: 'Vencida',
  PAID: 'Pagada',
  PARTIALLY_PAID: 'Pago parcial',
  PARTIALLY_RECEIVED: 'Recepción parcial',
  PENDING: 'Pendiente',
  RECEIVED: 'Recibida',
  REJECTED: 'Rechazada',
  SENT: 'Enviada',
  SUBMITTED: 'Por revisar',
  SUPERSEDED: 'Reemplazada',
  UNPAID: 'Sin pagar',
  VOIDED: 'Anulada',
};

function Status({ value }: { value: unknown }) {
  const normalized = text(value).toUpperCase();
  const label = providerStatusLabels[normalized] ?? normalized.replace(/_/g, ' ');
  return <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{label}</span>;
}

function ContactFields({ provider }: { provider: Row }) {
  return <>
    <Field label="Persona que realiza el envío *"><input required name="submitted_by_name" maxLength={180} defaultValue={text(provider.contact_name)} autoComplete="name" className={inputClass} /></Field>
    <Field label="Correo de contacto *"><input required name="submitted_by_email" type="email" maxLength={180} defaultValue={text(provider.email)} autoComplete="email" className={inputClass} /></Field>
  </>;
}

function WorkspaceFrame({ children, onRefresh, showContext = true, title }: { children: ReactNode; onRefresh: () => Promise<void>; showContext?: boolean; title: string }) {
  const [refreshing, setRefreshing] = useState(false);
  return (
    <div className="space-y-4">
      {showContext ? <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
        <div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs leading-5 opacity-80">Solo ves información autorizada para tu empresa proveedora.</p></div>
        <button aria-label="Actualizar" disabled={refreshing} onClick={() => { setRefreshing(true); void onRefresh().finally(() => setRefreshing(false)); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-white text-emerald-700 disabled:opacity-50 dark:border-emerald-800 dark:bg-slate-950" type="button"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /></button>
      </div> : null}
      {children}
    </div>
  );
}

interface ProviderWorkspaceProps {
  kioskId: number;
  onAuthorizationFailure: (error: unknown) => boolean;
  onRefresh: () => Promise<void>;
  token: string;
  workspace: MultiKioskChildWorkspace;
}

async function uploadProviderDocument(
  props: ProviderWorkspaceProps,
  file: File,
  mode: ProviderDocumentMode,
  resourceId?: number,
) {
  const contentType = documentContentType(file);
  const maximumBytes = mode === 'invoice' ? invoiceMaximumDocumentBytes : payableMaximumDocumentBytes;
  if (file.size <= 0 || file.size > maximumBytes || !supportedDocumentTypes.has(contentType)) {
    throw new Error(`El archivo debe ser PDF, imagen, XML, DOCX o XLSX y pesar máximo ${mode === 'invoice' ? 15 : 10} MB.`);
  }
  const presignCapability = mode === 'invoice' ? caps.invoicePresign : caps.payablePresign;
  const registerCapability = mode === 'invoice' ? caps.invoiceRegister : caps.payableRegister;
  const resource = resourceId ? { resource_id: resourceId } : {};
  const presigned = await multiKioskPublicApi.action<PresignResponse>(
    props.token,
    props.kioskId,
    presignCapability,
    { ...resource, fileName: file.name, contentType, sizeBytes: file.size },
    csrfFor(props.token),
  );
  const upload: KioskPresignedUpload = {
    object_key: presigned.object_key ?? presigned.objectKey ?? '',
    upload_url: presigned.upload_url ?? presigned.uploadUrl ?? '',
    upload_headers: presigned.upload_headers ?? presigned.uploadHeaders,
  };
  if (!upload.object_key || !upload.upload_url) {
    throw new Error('No pudimos preparar la carga del documento.');
  }
  await uploadPresignedKioskFile(upload, file, contentType, { timeoutMs: 30_000 });
  const registration = mode === 'invoice'
    ? { ...resource, objectKey: upload.object_key, fileName: file.name, contentType, sizeBytes: file.size }
    : { ...resource, objectKey: upload.object_key, originalFilename: file.name, mimeType: contentType, sizeBytes: file.size };
  const registered = await multiKioskPublicApi.action<PresignResponse>(
    props.token,
    props.kioskId,
    registerCapability,
    registration,
    csrfFor(props.token),
  );
  return registered.object_key ?? registered.objectKey ?? upload.object_key;
}

function useProviderAction({ kioskId, onAuthorizationFailure, onRefresh, token }: ProviderWorkspaceProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const perform = async (operation: () => Promise<unknown>, message: string) => {
    if (busy) return false;
    setBusy(true); setError(''); setSuccess('');
    try {
      await operation();
      setSuccess(message);
      await onRefresh().catch(() => undefined);
      return true;
    } catch (failure) {
      if (!onAuthorizationFailure(failure)) {
        setError(failure instanceof Error && failure.message
          ? failure.message
          : 'No pudimos guardar el cambio. Revisa los datos e inténtalo de nuevo.');
      }
      return false;
    } finally { setBusy(false); }
  };
  const run = (capability: string, payload: Row, message: string) => perform(
    () => multiKioskPublicApi.action(token, kioskId, capability, payload, csrfFor(token)),
    message,
  );
  const notices = <>{error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</p> : null}{success ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">{success}</p> : null}</>;
  return { busy, notices, perform, run };
}

function ProposalsWorkspace(props: ProviderWorkspaceProps) {
  const bootstrap = props.workspace.bootstrap ?? {};
  const provider = bootstrap.provider ?? {};
  const quoteRequests = rows(bootstrap.quote_requests);
  const submissions = rows(bootstrap.submissions);
  const catalogProducts = rows(bootstrap.catalog_products);
  const openRequests = quoteRequests.filter(row => text(row.status) === 'OPEN' && new Date(text(row.response_deadline)).getTime() > Date.now());
  const [quoteId, setQuoteId] = useState('');
  const [spontaneousCurrency, setSpontaneousCurrency] = useState('MXN');
  const [changeCategory, setChangeCategory] = useState('COMMERCIAL');
  const [lines, setLines] = useState<QuoteLine[]>([{ productName: '', providerSku: '', quantity: '1', unitCost: '', taxRate: '0' }]);
  const { busy, notices, run } = useProviderAction(props);
  const selectedRequest = quoteRequests.find(row => id(row.id) === Number(quoteId));
  const currency = text(selectedRequest?.currency_code) || spontaneousCurrency;
  const total = useMemo(() => lines.reduce((sum, line) => sum + number(line.quantity) * number(line.unitCost) * (1 + number(line.taxRate) / 100), 0), [lines]);
  const selectRequest = (value: string) => {
    setQuoteId(value);
    const request = quoteRequests.find(row => id(row.id) === Number(value));
    const requestedLines = rows(request?.items);
    if (requestedLines.length) setLines(requestedLines.map(item => ({
      productId: id(item.product_id) || undefined,
      productName: text(item.product_name), providerSku: text(item.sku), quantity: text(item.quantity) || '1', unitCost: '', taxRate: '0',
    })));
  };
  const updateLine = (index: number, change: Partial<QuoteLine>) => setLines(current => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...change } : line));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const payload: Row = {
      currencyCode: currency,
      submittedByName: text(values.get('submitted_by_name')),
      submittedByEmail: text(values.get('submitted_by_email')),
      notes: text(values.get('notes')),
      items: lines.map(line => ({
        productId: line.productId ?? null, providerSku: line.providerSku || null,
        productName: line.productName.trim(), productDescription: null, imageUrl: null,
        quantity: number(line.quantity), unitCost: number(line.unitCost), taxRate: number(line.taxRate),
        leadTimeDays: null, minimumOrderQuantity: null,
      })),
      ...(quoteId ? { quote_request_id: Number(quoteId) } : {}),
    };
    if (await run(quoteId ? caps.quote : caps.proposal, payload, quoteId ? 'Respuesta enviada. Puedes reemplazarla mientras la solicitud siga abierta.' : 'Propuesta enviada a Compras.')) {
      setQuoteId(''); setLines([{ productName: '', providerSku: '', quantity: '1', unitCost: '', taxRate: '0' }]); form.reset();
    }
  };
  const requestProfileChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const category = text(values.get('category'));
    const changes = category === 'CATALOG'
      ? { catalog_items: [{
          product_id: number(values.get('product_id')),
          provider_sku: text(values.get('provider_sku')),
          cost_amount: number(values.get('cost_amount')),
          currency_code: text(values.get('currency_code')).toUpperCase(),
          lead_time_days: number(values.get('lead_time_days')),
          minimum_order_quantity: number(values.get('minimum_order_quantity')),
        }] }
      : { [text(values.get('field'))]: text(values.get('value')) };
    if (await run(caps.procurementProfile, {
      category,
      changes,
      submitted_by_name: text(values.get('submitted_by_name')),
      submitted_by_email: text(values.get('submitted_by_email')),
    }, category === 'CATALOG'
      ? 'Actualización de catálogo enviada a Compras.'
      : 'Cambio comercial enviado a Compras.')) form.reset();
  };
  return <WorkspaceFrame onRefresh={props.onRefresh} title="Propuestas y cotizaciones">
    <Panel icon={<Send className="h-5 w-5" />} title="Enviar una propuesta" subtitle="Responde una solicitud abierta o comparte una propuesta espontánea. La empresa conserva el historial de cada revisión.">
      <form className="space-y-4" onSubmit={submit}>
        {notices}
        <Field label="Tipo de propuesta"><select value={quoteId} onChange={event => selectRequest(event.target.value)} className={inputClass}><option value="">Propuesta espontánea</option>{openRequests.map(request => <option key={id(request.id)} value={id(request.id)}>{text(request.request_number)} · {text(request.title)}</option>)}</select></Field>
        {!selectedRequest ? <Field label="Moneda de esta propuesta *"><TransactionCurrencySelect value={spontaneousCurrency} onChange={setSpontaneousCurrency} /></Field> : null}
        {selectedRequest ? <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-900"><p className="font-semibold">{text(selectedRequest.title)}</p><p>{text(selectedRequest.description)}</p><p className="mt-1">Fecha límite: {date(selectedRequest.response_deadline)}</p></div> : null}
        <div className="grid gap-3 sm:grid-cols-2"><ContactFields provider={provider} /></div>
        <div className="space-y-3">
          {lines.map((line, index) => <div key={index} className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-6">
            <div className="sm:col-span-3"><Field label="Producto o servicio *"><input required maxLength={240} value={line.productName} onChange={event => updateLine(index, { productName: event.target.value })} className={inputClass} /></Field></div>
            <Field label="SKU"><input maxLength={120} value={line.providerSku} onChange={event => updateLine(index, { providerSku: event.target.value })} className={inputClass} /></Field>
            <Field label="Cantidad *"><input required min="0.0001" step="0.0001" type="number" value={line.quantity} onChange={event => updateLine(index, { quantity: event.target.value })} className={inputClass} /></Field>
            <Field label={`Precio ${currency} *`}><input required min="0" step="0.01" type="number" value={line.unitCost} onChange={event => updateLine(index, { unitCost: event.target.value })} className={inputClass} /></Field>
            <Field label="Impuesto %"><input min="0" step="0.01" type="number" value={line.taxRate} onChange={event => updateLine(index, { taxRate: event.target.value })} className={inputClass} /></Field>
            {lines.length > 1 ? <button aria-label="Quitar partida" type="button" onClick={() => setLines(current => current.filter((_, lineIndex) => lineIndex !== index))} className="self-end justify-self-start rounded-xl p-3 text-red-600 sm:col-start-6"><Trash2 className="h-4 w-4" /></button> : null}
          </div>)}
          <button type="button" onClick={() => setLines(current => [...current, { productName: '', providerSku: '', quantity: '1', unitCost: '', taxRate: '0' }])} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700"><Plus className="h-4 w-4" /> Agregar partida</button>
        </div>
        <Field label="Notas para Compras"><textarea name="notes" maxLength={4000} rows={3} className={`${inputClass} h-auto`} /></Field>
        <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-semibold text-slate-900">Total estimado: {money(total, currency)}</p><button disabled={busy || total < 0 || lines.some(line => !line.productName.trim() || number(line.quantity) <= 0)} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50" type="submit">{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Enviar</button></div>
      </form>
    </Panel>
    <Panel icon={<FileText className="h-5 w-5" />} title="Solicitudes y envíos" subtitle="Las revisiones anteriores permanecen visibles como historial.">
      <div className="space-y-2">{submissions.length ? submissions.map(item => <div key={id(item.id)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p className="text-sm font-medium">{text(item.submission_number)}</p><p className="mt-1 text-xs text-slate-500">Revisión {text(item.revision_number)} · {money(item.total_amount, item.currency_code)} · {date(item.submitted_at)}</p></div><Status value={item.status} /></div>) : <Empty>Aún no hay propuestas enviadas.</Empty>}</div>
    </Panel>
    <Panel icon={<ShieldCheck className="h-5 w-5" />} title="Solicitar un cambio a Compras" subtitle="Los cambios comerciales y de catálogo se aplican únicamente después de que Compras los revise.">
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={requestProfileChange}>
        <Field label="Tipo de cambio *"><select required name="category" value={changeCategory} onChange={event => setChangeCategory(event.target.value)} className={inputClass}><option value="COMMERCIAL">Datos comerciales</option><option value="CATALOG">Producto de mi catálogo</option></select></Field>
        {changeCategory === 'COMMERCIAL' ? <>
          <Field label="Campo *"><select required name="field" className={inputClass}><option value="email">Correo</option><option value="phone">Teléfono</option><option value="contact_name">Contacto principal</option><option value="payment_terms_days">Días de crédito</option></select></Field>
          <Field label="Nuevo valor *"><input required name="value" maxLength={220} className={inputClass} /></Field>
        </> : <>
          <Field label="Producto autorizado *"><select required name="product_id" className={inputClass}><option value="">Selecciona</option>{catalogProducts.map(product => <option key={id(product.product_id)} value={id(product.product_id)}>{text(product.name)} · {text(product.sku)}</option>)}</select></Field>
          <Field label="Tu SKU"><input name="provider_sku" maxLength={120} className={inputClass} /></Field>
          <Field label="Nuevo costo *"><input required name="cost_amount" min="0" step="0.0001" type="number" className={inputClass} /></Field>
          <Field label="Moneda *"><input required name="currency_code" minLength={3} maxLength={3} defaultValue="MXN" className={inputClass} /></Field>
          <Field label="Días de entrega *"><input required name="lead_time_days" min="0" max="3650" step="1" type="number" defaultValue="0" className={inputClass} /></Field>
          <Field label="Compra mínima *"><input required name="minimum_order_quantity" min="0.0001" step="0.0001" type="number" defaultValue="1" className={inputClass} /></Field>
          {!catalogProducts.length ? <p className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Compras todavía no te ha asignado productos. Puedes enviar una propuesta espontánea para iniciar la conversación.</p> : null}
        </>}
        <ContactFields provider={provider} />
        <button disabled={busy || (changeCategory === 'CATALOG' && !catalogProducts.length)} className="sm:col-span-2 min-h-11 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50" type="submit">Enviar para revisión</button>
      </form>
    </Panel>
  </WorkspaceFrame>;
}

function PurchaseProposalWorkspace(props: ProviderWorkspaceProps) {
  const bootstrap = props.workspace.bootstrap ?? {};
  const provider = bootstrap.provider ?? {};
  const quoteRequests = rows(bootstrap.quote_requests);
  const submissions = rows(bootstrap.submissions);
  const openRequests = quoteRequests.filter(row => text(row.status) === 'OPEN'
    && new Date(text(row.response_deadline)).getTime() > Date.now());
  const catalogProducts = useMemo<ProviderCatalogProduct[]>(() => rows(bootstrap.catalog_products).map(product => ({
    id: id(product.product_id),
    name: text(product.name),
    sku: text(product.sku),
    productCode: text(product.product_code),
    providerSku: text(product.provider_sku),
    providerProduct: Boolean(product.provider_product),
    costAmount: number(product.cost_amount),
    currencyCode: text(product.currency_code),
  })).filter(product => product.id > 0 && product.name), [bootstrap.catalog_products]);
  const [activeStep, setActiveStep] = useState<ProposalStep>('reference');
  const [quoteId, setQuoteId] = useState('');
  const [currencyCode, setCurrencyCode] = useState('MXN');
  const [contactName, setContactName] = useState(text(provider.contact_name));
  const [contactEmail, setContactEmail] = useState(text(provider.email));
  const [notes, setNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [lines, setLines] = useState<PurchaseProposalLine[]>([]);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const deferredSearch = useDeferredValue(productSearch);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { busy, notices, run } = useProviderAction(props);
  const selectedRequest = quoteRequests.find(row => id(row.id) === Number(quoteId));
  const effectiveCurrency = text(selectedRequest?.currency_code) || currencyCode;
  const steps = useMemo(() => [
    { id: 'reference' as const, label: 'Datos de la propuesta' },
    { id: 'items' as const, label: 'Partidas' },
    { id: 'review' as const, label: 'Revisar' },
  ], []);
  const activeStepIndex = steps.findIndex(step => step.id === activeStep);
  const totals = useMemo(() => lines.reduce((result, line) => {
    const subtotal = line.quantity * line.unitCost;
    const tax = subtotal * (line.taxRate / 100);
    return { subtotal: result.subtotal + subtotal, tax: result.tax + tax, total: result.total + subtotal + tax };
  }, { subtotal: 0, tax: 0, total: 0 }), [lines]);
  const filteredProducts = useMemo(() => {
    const query = normalizeCatalogText(deferredSearch);
    return catalogProducts
      .map(product => ({
        product,
        score: !query ? 0
          : [product.sku, product.productCode, product.providerSku].some(value => normalizeCatalogText(value) === query) ? 0
            : normalizeCatalogText(product.name).startsWith(query) ? 1
              : normalizeCatalogText(`${product.name} ${product.sku} ${product.productCode} ${product.providerSku}`).includes(query) ? 2 : 3,
      }))
      .filter(entry => entry.score < 3)
      .sort((left, right) => left.score - right.score
        || Number(right.product.providerProduct) - Number(left.product.providerProduct)
        || left.product.name.localeCompare(right.product.name))
      .slice(0, 12)
      .map(entry => entry.product);
  }, [catalogProducts, deferredSearch]);

  const resetDraft = () => {
    setActiveStep('reference');
    setQuoteId('');
    setCurrencyCode('MXN');
    setContactName(text(provider.contact_name));
    setContactEmail(text(provider.email));
    setNotes('');
    setProductSearch('');
    setLines([]);
    setValidationMessages([]);
  };

  const lineForProduct = (
    product: ProviderCatalogProduct,
    quantity = 1,
    transactionCurrency = effectiveCurrency,
  ): PurchaseProposalLine => ({
    id: `catalog-${product.id}`,
    productId: product.id,
    productName: product.name,
    providerSku: product.providerSku,
    catalogSku: product.sku || product.productCode,
    quantity,
    unitCost: product.providerProduct && product.currencyCode === transactionCurrency ? product.costAmount : 0,
    taxRate: 0,
    providerProduct: product.providerProduct,
  });

  const selectRequest = (value: string) => {
    setQuoteId(value);
    setValidationMessages([]);
    const request = quoteRequests.find(row => id(row.id) === Number(value));
    if (!request) {
      setLines([]);
      return;
    }
    const requestCurrency = text(request.currency_code) || 'MXN';
    setCurrencyCode(requestCurrency);
    setLines(rows(request.items).map((item, index) => {
      const productId = id(item.product_id);
      const product = catalogProducts.find(option => option.id === productId);
      return product
        ? lineForProduct(product, number(item.quantity) || 1, requestCurrency)
        : {
            id: `request-${id(item.id) || index}`,
            productId: productId || undefined,
            productName: text(item.product_name),
            providerSku: text(item.sku),
            catalogSku: text(item.sku),
            quantity: number(item.quantity) || 1,
            unitCost: 0,
            taxRate: 0,
            providerProduct: false,
          };
    }));
  };

  const addProduct = (product: ProviderCatalogProduct) => {
    setLines(current => {
      const existing = current.find(line => line.productId === product.id);
      return existing
        ? current.map(line => line.id === existing.id ? { ...line, quantity: line.quantity + 1 } : line)
        : [...current, lineForProduct(product)];
    });
    setProductSearch('');
    setValidationMessages([]);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const updateLine = (lineId: string, field: 'quantity' | 'unitCost' | 'taxRate', value: number) => {
    setLines(current => current.map(line => line.id === lineId
      ? { ...line, [field]: Number.isFinite(value) ? Math.max(value, 0) : 0 }
      : line));
    setValidationMessages([]);
  };

  const validateReference = () => {
    const messages: string[] = [];
    if (!effectiveCurrency) messages.push('Selecciona la moneda de esta propuesta.');
    if (!contactName.trim()) messages.push('Indica quién realiza el envío.');
    if (!/^\S+@\S+\.\S+$/.test(contactEmail.trim())) messages.push('Escribe un correo de contacto válido.');
    setValidationMessages(messages);
    return messages.length === 0;
  };
  const validateItems = () => {
    const messages: string[] = [];
    if (!lines.length) messages.push('Agrega al menos un producto a la propuesta.');
    if (lines.some(line => !line.productName.trim() || line.quantity <= 0 || line.unitCost < 0 || line.taxRate < 0)) {
      messages.push('Revisa cantidades, costos e impuestos de todas las partidas.');
    }
    setValidationMessages(messages);
    return messages.length === 0;
  };
  const goForward = () => {
    if (activeStep === 'reference' && validateReference()) setActiveStep('items');
    else if (activeStep === 'items' && validateItems()) setActiveStep('review');
  };
  const goBack = () => {
    setValidationMessages([]);
    setActiveStep(activeStep === 'review' ? 'items' : 'reference');
  };
  const submitProposal = async () => {
    if (!validateReference() || !validateItems()) return;
    const payload: Row = {
      currencyCode: effectiveCurrency,
      submittedByName: contactName.trim(),
      submittedByEmail: contactEmail.trim(),
      notes: notes.trim() || null,
      items: lines.map(line => ({
        productId: line.productId ?? null,
        providerSku: line.providerSku || null,
        productName: line.productName,
        productDescription: null,
        imageUrl: null,
        quantity: line.quantity,
        unitCost: line.unitCost,
        taxRate: line.taxRate,
        leadTimeDays: null,
        minimumOrderQuantity: null,
      })),
      ...(quoteId ? { quote_request_id: Number(quoteId) } : {}),
    };
    if (await run(quoteId ? caps.quote : caps.proposal, payload,
      quoteId ? 'Cotización enviada a Compras para revisión.' : 'Propuesta de compra enviada para revisión.')) {
      resetDraft();
    }
  };

  return <WorkspaceFrame onRefresh={props.onRefresh} showContext={false} title="Propuestas y cotizaciones">
    <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FF6B5E]/15 text-[#B63B32]"><PackagePlus className="h-5 w-5" /></span>
          <div className="min-w-0"><div className="flex items-center gap-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-[#B63B32]">Compras</p><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">Borrador</span></div><h2 className="truncate text-lg font-semibold text-slate-950 dark:text-white">Nueva propuesta de compra</h2><p className="hidden truncate text-xs text-slate-500 sm:block">Captura las partidas; Compras las revisará antes de convertirlas en orden.</p></div>
        </div>
      </header>
      <div className="space-y-3 bg-slate-50/70 p-3 dark:bg-slate-950 sm:p-4">
        {notices}
        <IndiceModalWizardStepper accent="coral" activeStepId={activeStep} density="compact" progressLabel={`Paso ${activeStepIndex + 1} de ${steps.length}`} steps={steps} />
        {validationMessages.length ? <IndiceModalValidation messages={validationMessages} tone="error" /> : null}

        {activeStep === 'reference' ? <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-4">
          <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32]"><FileText className="h-4 w-4" /></span><div><h3 className="text-base font-semibold text-slate-950 dark:text-white">Datos de la propuesta</h3><p className="mt-0.5 text-xs leading-5 text-slate-500">Ya sabemos qué proveedor eres. Elige una solicitud o inicia una propuesta espontánea.</p></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Tipo de propuesta"><select value={quoteId} onChange={event => selectRequest(event.target.value)} className={inputClass}><option value="">Propuesta espontánea</option>{openRequests.map(request => <option key={id(request.id)} value={id(request.id)}>{text(request.request_number)} · {text(request.title)}</option>)}</select></Field>
            <Field label="Moneda de la operación *">{selectedRequest ? <div className={`${inputClass} flex items-center bg-slate-50 font-medium`}>{effectiveCurrency}</div> : <TransactionCurrencySelect value={currencyCode} onChange={setCurrencyCode} />}</Field>
            <Field label="Persona que realiza el envío *"><input required value={contactName} onChange={event => setContactName(event.target.value)} maxLength={180} autoComplete="name" className={inputClass} /></Field>
            <Field label="Correo de contacto *"><input required value={contactEmail} onChange={event => setContactEmail(event.target.value)} type="email" maxLength={180} autoComplete="email" className={inputClass} /></Field>
            <div className="sm:col-span-2"><Field label="Notas para Compras"><textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={4000} rows={2} className={`${inputClass} h-auto`} /></Field></div>
          </div>
          {selectedRequest ? <div className="mt-4 rounded-2xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/5 p-4 text-sm text-slate-700 dark:text-slate-200"><p className="font-medium text-slate-950 dark:text-white">{text(selectedRequest.title)}</p>{text(selectedRequest.description) ? <p className="mt-1">{text(selectedRequest.description)}</p> : null}<p className="mt-2 text-xs text-slate-500">Fecha límite: {date(selectedRequest.response_deadline)}</p></div> : null}
        </section> : null}

        {activeStep === 'items' ? <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-4">
          <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32]"><Search className="h-4 w-4" /></span><div><h3 className="text-base font-semibold text-slate-950 dark:text-white">Productos de la propuesta</h3><p className="mt-0.5 text-xs leading-5 text-slate-500">Elige productos y captura cantidades, costos e impuestos. Tus productos aparecen primero.</p></div></div>
          {!selectedRequest ? <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section aria-label="Catálogo de productos" className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-950">
              <div className="border-b border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between gap-3"><label className="text-sm font-semibold text-slate-900 dark:text-white" htmlFor="provider-product-search">Catálogo</label><span className="text-xs text-slate-500">{catalogProducts.length} disponibles</span></div>
                <div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input ref={searchInputRef} id="provider-product-search" value={productSearch} onChange={event => setProductSearch(event.target.value)} placeholder="Buscar por nombre, SKU o código" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></div>
              </div>
              <div className="max-h-[360px] divide-y divide-slate-200 overflow-y-auto dark:divide-slate-800">
                {filteredProducts.length ? filteredProducts.map(product => {
                  const selectedLine = lines.find(line => line.productId === product.id);
                  return <div key={product.id} className="flex min-h-14 items-center justify-between gap-3 bg-white px-3 py-2.5 dark:bg-slate-900">
                    <div className="min-w-0"><div className="flex min-w-0 items-center gap-2"><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{product.name}</p>{product.providerProduct ? <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Tu producto</span> : null}</div><p className="truncate text-xs text-slate-500">{product.sku || product.productCode || 'Sin SKU'}</p></div>
                    <button type="button" onClick={() => addProduct(product)} aria-label={`Agregar ${product.name}`} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#FF6B5E]/40 bg-white px-3 text-xs font-semibold text-[#B63B32] transition hover:bg-[#FF6B5E]/10 focus:outline-none focus:ring-2 focus:ring-[#FF6B5E]/30 dark:bg-slate-950"><Plus className="h-3.5 w-3.5" />{selectedLine ? `Agregar otro (${selectedLine.quantity})` : 'Agregar'}</button>
                  </div>;
                }) : <div className="p-5 text-center"><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{catalogProducts.length ? 'No hay coincidencias.' : 'No hay productos disponibles.'}</p><p className="mt-1 text-xs leading-5 text-slate-500">{catalogProducts.length ? 'Prueba con otro nombre, SKU o código.' : 'La empresa debe tener al menos un producto activo en Inventarios.'}</p></div>}
              </div>
            </section>
            <section aria-label="Partidas seleccionadas" className="min-w-0 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="mb-3 flex items-center justify-between gap-3"><div><h4 className="text-sm font-semibold text-slate-900 dark:text-white">Partidas</h4><p className="text-xs text-slate-500">Usa Agregar y completa el costo que ofreces.</p></div><span className="rounded-full bg-[#FF6B5E]/10 px-2 py-1 text-xs font-semibold text-[#B63B32]">{lines.length}</span></div>
              <ProposalLineItems currency={effectiveCurrency} lines={lines} onRemove={lineId => setLines(current => current.filter(line => line.id !== lineId))} onUpdate={updateLine} />
            </section>
          </div> : <div className="mt-4"><div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Estas partidas fueron solicitadas por la empresa. Completa el costo y los impuestos.</div><ProposalLineItems currency={effectiveCurrency} lines={lines} onUpdate={updateLine} /></div>}
        </section> : null}

        {activeStep === 'review' ? <div className="space-y-4">
          <IndiceModalSummary columns={3} variant="accent" icon={<CheckCircle2 className="h-5 w-5" />} title="Revisa antes de enviar" description="Compras recibirá esta propuesta con estado Por revisar." items={[
            { label: 'Proveedor', value: text(provider.name) },
            { label: 'Partidas', value: String(lines.length) },
            { label: 'Moneda', value: effectiveCurrency },
            { label: 'Subtotal', value: money(totals.subtotal, effectiveCurrency) },
            { label: 'Impuestos', value: money(totals.tax, effectiveCurrency) },
            { label: 'Total', value: money(totals.total, effectiveCurrency), emphasized: true },
          ]} />
          <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32]"><PackageCheck className="h-4 w-4" /></span><div><h3 className="text-base font-semibold text-slate-950 dark:text-white">Partidas que recibirá Compras</h3><p className="mt-0.5 text-xs leading-5 text-slate-500">La empresa podrá aprobar y convertir la propuesta sin volver a capturarla.</p></div></div><div className="mt-3"><ProposalLineItems compact currency={effectiveCurrency} lines={lines} /></div></section>
        </div> : null}
      </div>
      <footer className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-semibold text-slate-900 dark:text-white">{lines.length} partidas · {money(totals.total, effectiveCurrency)}</p>{activeStep === 'items' && !lines.length ? <p className="text-xs text-slate-500">Agrega un producto para continuar.</p> : null}</div>
        <div className="flex gap-2">{activeStep !== 'reference' ? <button type="button" disabled={busy} onClick={goBack} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"><ArrowLeft className="h-4 w-4" /> Atrás</button> : null}{activeStep === 'review' ? <button type="button" disabled={busy || !lines.length} onClick={() => void submitProposal()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF6B5E] px-5 text-sm font-semibold text-[#222831] disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar a revisión</button> : <button type="button" disabled={busy || (activeStep === 'items' && !lines.length)} onClick={goForward} className="h-10 rounded-xl bg-[#FF6B5E] px-5 text-sm font-semibold text-[#222831] disabled:cursor-not-allowed disabled:opacity-40">Continuar</button>}</div>
      </footer>
    </section>
    <Panel icon={<FileText className="h-5 w-5" />} title="Propuestas enviadas" subtitle="El estado se actualiza cuando Compras revisa o convierte la propuesta."><div className="space-y-2">{submissions.length ? submissions.map(item => <div key={id(item.id)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p className="text-sm font-medium">{text(item.submission_number)}</p><p className="mt-1 text-xs text-slate-500">Revisión {text(item.revision_number)} · {money(item.total_amount, item.currency_code)} · {date(item.submitted_at)}</p></div><Status value={item.status} /></div>) : <Empty>Aún no hay propuestas enviadas.</Empty>}</div></Panel>
  </WorkspaceFrame>;
}

function ProposalLineItems({ compact = false, currency, lines, onRemove, onUpdate }: {
  compact?: boolean;
  currency: string;
  lines: PurchaseProposalLine[];
  onRemove?: (lineId: string) => void;
  onUpdate?: (lineId: string, field: 'quantity' | 'unitCost' | 'taxRate', value: number) => void;
}) {
  if (!lines.length) return <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-center dark:border-slate-700 dark:bg-slate-950"><div><PackagePlus className="mx-auto h-5 w-5 text-slate-400" /><p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">Tu propuesta está vacía</p><p className="mt-1 text-xs text-slate-500">En el catálogo, pulsa Agregar para incluir un producto.</p></div></div>;
  return <div className="space-y-2">{lines.map(line => {
    const subtotal = line.quantity * line.unitCost;
    const total = subtotal + subtotal * (line.taxRate / 100);
    return <div key={line.id} className={`min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900 ${compact ? 'grid gap-3 sm:grid-cols-[minmax(0,1fr)_70px_120px] sm:items-center' : ''}`}>
      <div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-medium text-slate-950 dark:text-white">{line.productName}</p>{line.providerProduct ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Tu producto</span> : null}</div><p className="truncate text-xs text-slate-500">{line.providerSku || line.catalogSku || 'Sin SKU'}</p></div>{!compact && onRemove ? <button type="button" aria-label="Quitar partida" onClick={() => onRemove(line.id)} className="-mr-1 -mt-1 rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button> : null}</div>
      {compact ? <div><p className="text-[11px] text-slate-400">Cantidad</p><p className="font-medium">{line.quantity}</p></div> : <div className="mt-3 grid grid-cols-3 gap-2"><ProposalNumber label="Cantidad" value={line.quantity} min={0.0001} onChange={value => onUpdate?.(line.id, 'quantity', value)} /><ProposalNumber label="Costo unitario" value={line.unitCost} min={0} onChange={value => onUpdate?.(line.id, 'unitCost', value)} /><ProposalNumber label="Impuesto" value={line.taxRate} min={0} suffix="%" onChange={value => onUpdate?.(line.id, 'taxRate', value)} /></div>}
      <div className={compact ? '' : 'mt-3 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800'}><p className="text-[11px] text-slate-400">Total</p><p className="font-semibold text-slate-950 dark:text-white">{money(total, currency)}</p></div>
    </div>;
  })}</div>;
}

function ProposalNumber({ label, min, onChange, suffix, value }: { label: string; min: number; onChange: (value: number) => void; suffix?: string; value: number }) {
  return <label className="min-w-0"><span className="block text-[11px] text-slate-400">{label}</span><span className="mt-1 flex h-9 items-center rounded-lg border border-slate-200 bg-white px-2 focus-within:border-[#FF6B5E] focus-within:ring-2 focus-within:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950"><input type="number" min={min} step="0.0001" value={value} onChange={event => onChange(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />{suffix ? <span className="ml-1 text-xs text-slate-400">{suffix}</span> : null}</span></label>;
}

function OrdersWorkspace(props: ProviderWorkspaceProps) {
  const bootstrap = props.workspace.bootstrap ?? {};
  const provider = bootstrap.provider ?? {};
  const orders = rows(bootstrap.orders);
  const invoices = rows(bootstrap.invoices);
  const actionable = orders.filter(order => text(order.status) === 'SENT');
  const invoiceable = orders.filter(order => ['CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(text(order.status)));
  const [selectedOrder, setSelectedOrder] = useState(actionable[0] ? text(actionable[0].id) : '');
  const effectiveSelectedOrder = actionable.some(order => text(order.id) === selectedOrder)
    ? selectedOrder
    : actionable[0] ? text(actionable[0].id) : '';
  const [responseType, setResponseType] = useState('CONFIRMED');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceOrderId, setInvoiceOrderId] = useState('');
  const [uploadedInvoice, setUploadedInvoice] = useState<{ name: string; size: number; objectKey: string } | null>(null);
  const { busy, notices, perform, run } = useProviderAction(props);
  const canUploadInvoice = props.workspace.session.capabilities.includes(caps.invoicePresign)
    && props.workspace.session.capabilities.includes(caps.invoiceRegister);
  const invoiceOrder = invoiceable.find(order => id(order.id) === Number(invoiceOrderId));
  const invoiceCurrency = text(invoiceOrder?.currency_code);
  const respond = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    await run(caps.order, {
      purchase_order_id: number(values.get('purchase_order_id')),
      response_type: responseType,
      requested_expected_date: responseType === 'ADJUSTMENT_REQUESTED' ? text(values.get('requested_expected_date')) || null : null,
      reason: responseType === 'ADJUSTMENT_REQUESTED' ? text(values.get('reason')) : '',
      submitted_by_name: text(values.get('submitted_by_name')),
      submitted_by_email: text(values.get('submitted_by_email')),
    }, responseType === 'CONFIRMED' ? 'Orden confirmada.' : 'Solicitud de ajuste enviada sin modificar la orden original.');
  };
  const invoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    const subtotal = number(values.get('subtotal')); const tax = number(values.get('tax'));
    const purchaseOrderId = number(values.get('purchase_order_id'));
    if (await perform(async () => {
      let documentUrl: string | null = null;
      if (invoiceFile) {
        if (!canUploadInvoice) throw new Error('La carga de documentos no está disponible para esta herramienta.');
        documentUrl = uploadedInvoice?.name === invoiceFile.name && uploadedInvoice.size === invoiceFile.size
          ? uploadedInvoice.objectKey
          : await uploadProviderDocument(props, invoiceFile, 'invoice', purchaseOrderId);
        setUploadedInvoice({ name: invoiceFile.name, size: invoiceFile.size, objectKey: documentUrl });
      }
      await multiKioskPublicApi.action(props.token, props.kioskId, caps.invoice, {
        purchase_order_id: purchaseOrderId,
        invoiceNumber: text(values.get('invoice_number')),
        invoiceDate: text(values.get('invoice_date')) || null,
        dueDate: text(values.get('due_date')) || null,
        subtotalAmount: subtotal, taxAmount: tax, totalAmount: subtotal + tax,
        currencyCode: invoiceCurrency, notes: text(values.get('notes')),
        documentUrl, submittedByName: text(values.get('submitted_by_name')),
        submitted_by_email: text(values.get('submitted_by_email')),
      }, csrfFor(props.token));
    }, 'Factura ligada a la orden y enviada para revisión.')) {
      setInvoiceFile(null); setUploadedInvoice(null); setInvoiceOrderId(''); form.reset();
    }
  };
  return <WorkspaceFrame onRefresh={props.onRefresh} title="Órdenes y facturas">
    {notices}
    <Panel icon={<PackageCheck className="h-5 w-5" />} title="Órdenes de compra" subtitle="Confirma la orden tal como fue emitida o solicita un ajuste. Nunca cambias sus términos directamente.">
      <div className="space-y-3">{orders.length ? orders.map(order => <article key={id(order.id)} className="rounded-2xl border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{text(order.folio)}</p><p className="mt-1 text-xs text-slate-500">Entrega: {date(order.expected_date)} · {text(order.warehouse_name)}</p></div><div className="text-right"><Status value={order.status} /><p className="mt-2 text-sm font-semibold">{money(order.total_amount, order.currency_code)}</p></div></div><div className="mt-3 space-y-1 border-t border-slate-100 pt-3">{rows(order.items).map(item => <p key={id(item.id)} className="flex justify-between gap-3 text-xs text-slate-600"><span>{text(item.product_name)} · {text(item.quantity)}</span><span>{money(item.line_total, order.currency_code)}</span></p>)}</div></article>) : <Empty>No hay órdenes autorizadas para este proveedor.</Empty>}</div>
    </Panel>
    {actionable.length ? <Panel icon={<CheckCircle2 className="h-5 w-5" />} title="Responder una orden" subtitle="Una solicitud de ajuste regresa a la empresa para decisión."><form className="grid gap-3 sm:grid-cols-2" onSubmit={respond}>
      <Field label="Orden *"><select required name="purchase_order_id" value={effectiveSelectedOrder} onChange={event => setSelectedOrder(event.target.value)} className={inputClass}>{actionable.map(order => <option key={id(order.id)} value={id(order.id)}>{text(order.folio)}</option>)}</select></Field>
      <Field label="Respuesta *"><select required name="response_type" value={responseType} onChange={event => setResponseType(event.target.value)} className={inputClass}><option value="CONFIRMED">Confirmar orden</option><option value="ADJUSTMENT_REQUESTED">Solicitar ajuste</option></select></Field>
      <ContactFields provider={provider} />
      {responseType === 'ADJUSTMENT_REQUESTED' ? <><Field label="Fecha de entrega propuesta"><input name="requested_expected_date" type="date" className={inputClass} /></Field>
      <Field label="Motivo del ajuste *"><textarea required name="reason" maxLength={4000} rows={3} className={`${inputClass} h-auto`} /></Field></> : <p className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">Al confirmar aceptas cantidades, precios y fecha de entrega tal como aparecen en la orden.</p>}
      <button disabled={busy} className="sm:col-span-2 min-h-11 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50" type="submit">Responder orden</button>
    </form></Panel> : null}
    <Panel icon={<ReceiptText className="h-5 w-5" />} title="Facturar una orden" subtitle="Esta vía es solo para facturas que sí corresponden a una orden confirmada o recibida.">{invoiceable.length ? <form className="grid gap-3 sm:grid-cols-2" onSubmit={invoice}>
      <Field label="Orden *"><select required name="purchase_order_id" value={invoiceOrderId} onChange={event => setInvoiceOrderId(event.target.value)} className={inputClass}><option value="">Selecciona</option>{invoiceable.map(order => <option key={id(order.id)} value={id(order.id)}>{text(order.folio)} · {money(order.total_amount, order.currency_code)}</option>)}</select></Field>
      <Field label="Folio de factura *"><input required name="invoice_number" maxLength={120} className={inputClass} /></Field>
      <Field label="Fecha de factura"><input name="invoice_date" type="date" className={inputClass} /></Field><Field label="Vencimiento"><input name="due_date" type="date" className={inputClass} /></Field>
      <Field label="Subtotal *"><input required name="subtotal" min="0" step="0.01" type="number" className={inputClass} /></Field><Field label="Impuestos *"><input required name="tax" min="0" step="0.01" type="number" defaultValue="0" className={inputClass} /></Field>
      <Field label="Moneda de la factura"><div className={`${inputClass} flex items-center bg-slate-50 font-medium`}>{invoiceCurrency || 'Selecciona una orden'}</div></Field><ContactFields provider={provider} />
      {canUploadInvoice ? <div className="sm:col-span-2"><Field label="Archivo de factura"><input accept=".pdf,.xml,.jpg,.jpeg,.png,.webp,.docx,.xlsx" className={inputClass} onChange={event => { setInvoiceFile(event.target.files?.[0] ?? null); setUploadedInvoice(null); }} type="file" /></Field><p className="mt-1 text-[11px] text-slate-500">PDF, imagen, XML, DOCX o XLSX · máximo 15 MB.</p></div> : null}
      <div className="sm:col-span-2"><Field label="Notas"><textarea name="notes" maxLength={4000} rows={3} className={`${inputClass} h-auto`} /></Field></div>
      <button disabled={busy} className="sm:col-span-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50" type="submit">{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : invoiceFile ? <UploadCloud className="mr-2 h-4 w-4" /> : null} Enviar factura</button>
    </form> : <Empty>Primero confirma o recibe una orden para poder facturarla.</Empty>}</Panel>
    <Panel icon={<FileText className="h-5 w-5" />} title="Facturas enviadas"><div className="space-y-2">{invoices.length ? invoices.map(item => <div key={id(item.id)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p className="text-sm font-medium">{text(item.invoice_number)}</p><p className="mt-1 text-xs text-slate-500">Orden {text(item.purchase_order_folio)} · {money(item.total_amount, item.currency_code)}</p></div><Status value={item.status} /></div>) : <Empty>Aún no hay facturas ligadas a órdenes.</Empty>}</div></Panel>
  </WorkspaceFrame>;
}

function ProviderPayablesWorkspace(props: ProviderWorkspaceProps) {
  const bootstrap = props.workspace.bootstrap ?? {};
  const provider = bootstrap.provider ?? {};
  const payables = rows(bootstrap.payables);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [concept, setConcept] = useState('');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [tax, setTax] = useState('0');
  const [currencyCode, setCurrencyCode] = useState('MXN');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState(text(provider.contact_name));
  const [contactEmail, setContactEmail] = useState(text(provider.email));
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [pendingPayableId, setPendingPayableId] = useState<number | null>(null);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [profileCategory, setProfileCategory] = useState('FISCAL');
  const { busy, notices, perform, run } = useProviderAction(props);
  const canUpload = props.workspace.session.capabilities.includes(caps.payablePresign)
    && props.workspace.session.capabilities.includes(caps.payableRegister);
  const subtotal = number(amount);
  const taxes = number(tax);
  const total = subtotal + taxes;
  const today = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date());

  const reset = () => {
    setConcept('');
    setReference('');
    setAmount('');
    setTax('0');
    setCurrencyCode('MXN');
    setDueDate('');
    setDescription('');
    setContactName(text(provider.contact_name));
    setContactEmail(text(provider.email));
    setEvidenceFile(null);
    setPendingPayableId(null);
    setValidationMessages([]);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const messages: string[] = [];
    if (!concept.trim()) messages.push('Escribe el concepto de la cuenta.');
    if (subtotal <= 0) messages.push('El monto debe ser mayor que cero.');
    if (!dueDate) messages.push('Selecciona la fecha de vencimiento.');
    if (!contactName.trim() || !/^\S+@\S+\.\S+$/.test(contactEmail.trim())) messages.push('Confirma la persona y el correo de contacto.');
    if (messages.length) {
      setValidationMessages(messages);
      return;
    }
    setValidationMessages([]);
    const completed = await perform(async () => {
      let expenseId = pendingPayableId;
      if (!expenseId) {
        const created = await multiKioskPublicApi.action<{ expense_id: number }>(props.token, props.kioskId, caps.payable, {
          providerId: null,
          concept: concept.trim(),
          description: description.trim() || null,
          subtotalAmount: subtotal,
          taxAmount: taxes,
          totalAmount: total,
          currencyCode,
          dueDate,
          externalReference: reference.trim() || null,
          submitted_by_name: contactName.trim(),
          submitted_by_email: contactEmail.trim(),
        }, csrfFor(props.token));
        expenseId = number(created.expense_id);
        if (!expenseId) throw new Error('La cuenta se creó, pero no recibimos su identificador.');
        setPendingPayableId(expenseId);
      }
      if (evidenceFile) {
        if (!canUpload) throw new Error('La carga de comprobantes no está disponible.');
        await uploadProviderDocument(props, evidenceFile, 'payable', expenseId);
      }
    }, 'Cuenta enviada directamente a Gastos para revisión.');
    if (completed) reset();
  };

  const submitProfileChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const category = text(values.get('category'));
    if (await run(caps.profile, {
      category,
      changes: { [text(values.get('field'))]: text(values.get('value')) },
      submitted_by_name: text(values.get('submitted_by_name')),
      submitted_by_email: text(values.get('submitted_by_email')),
    }, 'Cambio enviado a Finanzas para revisión.')) form.reset();
  };

  return <WorkspaceFrame onRefresh={props.onRefresh} title="Cuentas por pagar">
    <section className="overflow-hidden rounded-[24px] border border-[#147514]/35 bg-slate-50 shadow-lg dark:border-emerald-800/60 dark:bg-slate-950">
      <header className="bg-[#147514] px-4 py-4 text-white sm:px-6"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15"><Landmark className="h-6 w-6" /></span><div><h2 className="text-xl font-medium sm:text-2xl">Crear cuenta por pagar</h2><p className="mt-1 text-sm text-white/85">Envía una obligación a Gastos; la empresa la revisará antes de pagarla.</p></div></div></header>
      <form onSubmit={submit}>
        <div className="space-y-5 p-4 sm:p-6">
          {notices}
          {validationMessages.length ? <IndiceModalValidation messages={validationMessages} tone="error" /> : null}
          <fieldset disabled={Boolean(pendingPayableId)} className="contents">
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
            <div className="mb-4"><div className="flex items-center gap-2 text-[#147514]"><Landmark className="h-4 w-4" /><h3 className="text-sm font-medium text-slate-900 dark:text-white">Datos principales</h3></div><p className="mt-1 text-xs text-slate-500">El proveedor ya está identificado por su sesión.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Proveedor"><div className={`${inputClass} flex items-center bg-slate-50 font-medium text-slate-700`}>{text(provider.name)}</div></Field>
              <Field label="Factura o referencia"><input value={reference} onChange={event => setReference(event.target.value)} maxLength={120} placeholder="Ej. FAC-1048" className={inputClass} /></Field>
              <div className="sm:col-span-2"><Field label="Concepto *"><input autoFocus required value={concept} onChange={event => setConcept(event.target.value)} maxLength={220} placeholder="Servicio, insumo o compra pendiente" className={inputClass} /></Field></div>
              <Field label="Fecha de registro"><div className={`${inputClass} flex items-center bg-slate-50 text-slate-700`}>{today}</div></Field>
              <Field label="Fecha de vencimiento *"><input required type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} className={inputClass} /></Field>
              <Field label="Monto antes de impuestos *"><input required min="0.01" step="0.01" type="number" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" className={inputClass} /></Field>
              <Field label="Moneda de la operación *"><TransactionCurrencySelect value={currencyCode} onChange={setCurrencyCode} /></Field>
              <Field label="Impuestos"><input min="0" step="0.01" type="number" value={tax} onChange={event => setTax(event.target.value)} className={inputClass} /></Field>
              <div className="rounded-2xl border border-[#147514]/20 bg-[#147514]/5 px-4 py-3"><p className="text-xs text-slate-500">Total de la cuenta</p><p className="mt-1 text-lg font-medium text-[#147514]">{money(total, currencyCode)}</p></div>
              <p className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">La cuenta aparecerá en Gastos con estado Borrador, pendiente de revisión.</p>
            </div>
          </section>
          </fieldset>

          <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
            <div className="mb-4"><div className="flex items-center gap-2 text-[#147514]"><Paperclip className="h-4 w-4" /><h3 className="text-sm font-medium text-slate-900 dark:text-white">Evidencia y notas</h3></div><p className="mt-1 text-xs text-slate-500">Adjunta la factura o comprobante y deja instrucciones para Finanzas.</p></div>
            {canUpload ? <><input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={event => setEvidenceFile(event.target.files?.[0] ?? null)} /><input ref={fileInputRef} type="file" accept=".pdf,.xml,.jpg,.jpeg,.png,.webp,.docx,.xlsx" className="hidden" onChange={event => setEvidenceFile(event.target.files?.[0] ?? null)} /><div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => cameraInputRef.current?.click()} className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-[#147514]/35 hover:bg-[#147514]/5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#147514]/10 text-[#147514]"><Camera className="h-5 w-5" /></span><span><span className="block text-sm font-medium">Tomar fotografía</span><span className="mt-1 block text-xs text-slate-500">Usa la cámara del dispositivo</span></span></button><button type="button" onClick={() => fileInputRef.current?.click()} className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-[#147514]/35 hover:bg-[#147514]/5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#147514]/10 text-[#147514]"><Upload className="h-5 w-5" /></span><span><span className="block text-sm font-medium">Elegir archivo</span><span className="mt-1 block text-xs text-slate-500">PDF, XML, imagen o documento</span></span></button></div></> : null}
            {evidenceFile ? <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 p-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500"><File className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{evidenceFile.name}</p><p className="text-xs text-slate-500">{Math.max(evidenceFile.size / 1024, 1).toFixed(0)} KB</p></div><button type="button" aria-label="Quitar archivo" onClick={() => setEvidenceFile(null)} className="rounded-xl p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></div> : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Persona que realiza el envío *"><input required value={contactName} onChange={event => setContactName(event.target.value)} maxLength={180} className={inputClass} /></Field><Field label="Correo de contacto *"><input required type="email" value={contactEmail} onChange={event => setContactEmail(event.target.value)} maxLength={180} className={inputClass} /></Field><div className="sm:col-span-2"><Field label="Descripción o instrucciones"><textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={4000} rows={3} className={`${inputClass} h-auto`} /></Field></div></div>
          </section>
        </div>
        {pendingPayableId ? <div className="mx-4 mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:mx-6"><p className="font-medium">La cuenta ya está en Gastos.</p><p className="mt-1">Los datos quedan bloqueados y reintentaremos únicamente el comprobante para evitar duplicados.</p></div> : null}
        <footer className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-[#147514]/35 bg-[#147514] px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6"><p className="text-sm font-medium">{text(provider.name)} · {money(total, currencyCode)} · Vence {dueDate ? date(dueDate) : '—'}</p><div className="flex gap-2"><button type="button" disabled={busy || Boolean(pendingPayableId)} onClick={reset} className="h-11 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-medium disabled:opacity-50">Limpiar</button><button type="submit" disabled={busy || subtotal <= 0 || !concept.trim() || !dueDate} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-[#147514] disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {pendingPayableId ? 'Reintentar comprobante' : 'Enviar a Gastos'}</button></div></footer>
      </form>
    </section>

    <Panel icon={<CircleDollarSign className="h-5 w-5" />} title="Cuentas enviadas" subtitle="Consulta el estado y el saldo de las cuentas registradas por tu empresa."><div className="space-y-2">{payables.length ? payables.map(item => <div key={id(item.id)} className="rounded-xl border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{text(item.folio)} · {text(item.concept)}</p><p className="mt-1 text-xs text-slate-500">Vence {date(item.due_date)}</p></div><Status value={item.payment_status} /></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><span>Total<br /><strong>{money(item.total_amount, item.currency_code)}</strong></span><span>Pagado<br /><strong>{money(item.paid_amount, item.currency_code)}</strong></span><span>Saldo<br /><strong>{money(item.balance_amount, item.currency_code)}</strong></span></div></div>) : <Empty>Aún no hay cuentas por pagar enviadas.</Empty>}</div></Panel>

    <details className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"><summary className="cursor-pointer text-sm font-medium text-slate-900 dark:text-white">Solicitar cambio fiscal o bancario</summary><p className="mt-2 text-xs text-slate-500">Finanzas revisará el cambio antes de aplicarlo.</p><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={submitProfileChange}><Field label="Tipo de dato *"><select required name="category" value={profileCategory} onChange={event => setProfileCategory(event.target.value)} className={inputClass}><option value="FISCAL">Fiscal</option><option value="BANKING">Bancario</option></select></Field><Field label="Campo *"><select key={profileCategory} required name="field" className={inputClass}>{profileCategory === 'FISCAL' ? <><option value="legal_name">Razón social</option><option value="tax_id">RFC / ID fiscal</option><option value="fiscal_address">Domicilio fiscal</option><option value="tax_regime">Régimen fiscal</option></> : <><option value="bank_name">Banco</option><option value="account_holder">Titular</option><option value="account_number">Cuenta</option><option value="clabe">CLABE</option><option value="swift">SWIFT</option><option value="currency_code">Moneda</option></>}</select></Field><Field label="Nuevo valor *"><input required name="value" maxLength={500} className={inputClass} /></Field><ContactFields provider={provider} /><button disabled={busy} className="sm:col-span-2 min-h-11 rounded-xl bg-[#147514] px-4 text-sm font-medium text-white disabled:opacity-50" type="submit">Enviar para revisión</button></form></details>
  </WorkspaceFrame>;
}

function PayablesWorkspace(props: ProviderWorkspaceProps) {
  const bootstrap = props.workspace.bootstrap ?? {};
  const provider = bootstrap.provider ?? {};
  const payables = rows(bootstrap.payables);
  const [profileCategory, setProfileCategory] = useState('FISCAL');
  const [payableFile, setPayableFile] = useState<File | null>(null);
  const [pendingPayableId, setPendingPayableId] = useState<number | null>(null);
  const { busy, notices, perform, run } = useProviderAction(props);
  const canUploadPayable = props.workspace.session.capabilities.includes(caps.payablePresign)
    && props.workspace.session.capabilities.includes(caps.payableRegister);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    const subtotal = number(values.get('subtotal')); const tax = number(values.get('tax'));
    if (await perform(async () => {
      let expenseId = pendingPayableId;
      if (!expenseId) {
        const created = await multiKioskPublicApi.action<{ expense_id: number }>(props.token, props.kioskId, caps.payable, {
          providerId: null, concept: text(values.get('concept')), description: text(values.get('description')),
          subtotalAmount: subtotal, taxAmount: tax, totalAmount: subtotal + tax,
          currencyCode: text(values.get('currency_code')), dueDate: text(values.get('due_date')) || null,
          externalReference: text(values.get('external_reference')) || null,
          submitted_by_name: text(values.get('submitted_by_name')), submitted_by_email: text(values.get('submitted_by_email')),
        }, csrfFor(props.token));
        expenseId = number(created.expense_id);
        if (!expenseId) throw new Error('La cuenta se creó, pero no recibimos su identificador.');
        setPendingPayableId(expenseId);
      }
      if (payableFile) {
        if (!canUploadPayable) throw new Error('La carga de documentos no está disponible para esta herramienta.');
        await uploadProviderDocument(props, payableFile, 'payable', expenseId);
      }
    }, payableFile ? 'Cuenta y documento enviados para revisión.' : 'Cuenta por pagar enviada para revisión.')) {
      setPendingPayableId(null); setPayableFile(null); form.reset();
    }
  };
  const profile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const category = text(values.get('category'));
    const key = text(values.get('field')); const value = text(values.get('value'));
    if (await run(caps.profile, { category, changes: { [key]: value }, submitted_by_name: text(values.get('submitted_by_name')), submitted_by_email: text(values.get('submitted_by_email')) }, 'Cambio enviado al área responsable para revisión.')) form.reset();
  };
  return <WorkspaceFrame onRefresh={props.onRefresh} title="Cuentas por pagar">
    {notices}
    <Panel icon={<ReceiptText className="h-5 w-5" />} title="Registrar una cuenta" subtitle="Usa esta vía únicamente cuando no existe una orden de compra. Si existe, factura desde Órdenes y facturas."><form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
      <fieldset disabled={Boolean(pendingPayableId)} className="contents">
      <Field label="Concepto *"><input required name="concept" maxLength={220} className={inputClass} /></Field><Field label="Referencia externa"><input name="external_reference" maxLength={120} className={inputClass} /></Field>
      <Field label="Subtotal *"><input required name="subtotal" min="0" step="0.01" type="number" className={inputClass} /></Field><Field label="Impuestos *"><input required name="tax" min="0" step="0.01" type="number" defaultValue="0" className={inputClass} /></Field>
      <Field label="Moneda de esta cuenta *"><TransactionCurrencySelect /></Field><Field label="Vencimiento"><input name="due_date" type="date" className={inputClass} /></Field>
      <ContactFields provider={provider} /><div className="sm:col-span-2"><Field label="Descripción"><textarea name="description" maxLength={4000} rows={3} className={`${inputClass} h-auto`} /></Field></div>
      </fieldset>
      {canUploadPayable ? <div className="sm:col-span-2"><Field label="Factura o comprobante"><input accept=".pdf,.xml,.jpg,.jpeg,.png,.webp,.docx,.xlsx" className={inputClass} onChange={event => setPayableFile(event.target.files?.[0] ?? null)} type="file" /></Field><p className="mt-1 text-[11px] text-slate-500">Opcional · PDF, imagen, XML, DOCX o XLSX · máximo 10 MB.</p></div> : null}
      {pendingPayableId ? <p className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">La cuenta ya fue creada con estos datos. Los campos quedan bloqueados y, al enviar, reintentaremos únicamente el documento para evitar duplicados.</p> : null}
      <button disabled={busy} className="sm:col-span-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50" type="submit">{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : payableFile ? <UploadCloud className="mr-2 h-4 w-4" /> : null} Enviar cuenta</button>
    </form></Panel>
    <Panel icon={<CircleDollarSign className="h-5 w-5" />} title="Estado de cuentas"><div className="space-y-2">{payables.length ? payables.map(item => <div key={id(item.id)} className="rounded-xl border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{text(item.folio)} · {text(item.concept)}</p><p className="mt-1 text-xs text-slate-500">Vence {date(item.due_date)}</p></div><Status value={item.payment_status} /></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><span>Total<br /><strong>{money(item.total_amount, item.currency_code)}</strong></span><span>Pagado<br /><strong>{money(item.paid_amount, item.currency_code)}</strong></span><span>Saldo<br /><strong>{money(item.balance_amount, item.currency_code)}</strong></span></div></div>) : <Empty>Aún no hay cuentas por pagar.</Empty>}</div></Panel>
    <Panel icon={<ShieldCheck className="h-5 w-5" />} title="Solicitar cambio fiscal o bancario" subtitle="Finanzas revisa estos datos antes de aplicarlos. La información bancaria queda protegida y no aparece en Seguimiento."><form className="grid gap-3 sm:grid-cols-2" onSubmit={profile}>
      <Field label="Tipo de dato *"><select required name="category" value={profileCategory} onChange={event => setProfileCategory(event.target.value)} className={inputClass}><option value="FISCAL">Fiscal</option><option value="BANKING">Bancario</option></select></Field>
      <Field label="Campo *"><select key={profileCategory} required name="field" className={inputClass}>{profileCategory === 'FISCAL' ? <><option value="legal_name">Razón social</option><option value="tax_id">RFC / ID fiscal</option><option value="fiscal_address">Domicilio fiscal</option><option value="tax_regime">Régimen fiscal</option></> : <><option value="bank_name">Banco</option><option value="account_holder">Titular</option><option value="account_number">Cuenta</option><option value="clabe">CLABE</option><option value="swift">SWIFT</option><option value="currency_code">Moneda</option></>}</select></Field>
      <Field label="Nuevo valor *"><input required name="value" maxLength={500} className={inputClass} /></Field><ContactFields provider={provider} />
      <button disabled={busy} className="sm:col-span-2 min-h-11 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50" type="submit">Enviar para revisión</button>
    </form></Panel>
  </WorkspaceFrame>;
}

function TrackingWorkspace(props: ProviderWorkspaceProps) {
  const bootstrap = props.workspace.bootstrap ?? {};
  const submissions = rows(bootstrap.submissions);
  const orders = rows(bootstrap.orders);
  const invoices = rows(bootstrap.invoices_with_purchase_order);
  const payables = rows(bootstrap.payables_without_purchase_order);
  const purchaseOrderPayments = rows(bootstrap.purchase_order_payment_tracking);
  const purchaseOrderPaymentByInvoice = new Map(purchaseOrderPayments
    .filter(item => id(item.supplier_invoice_id) > 0)
    .map(item => [id(item.supplier_invoice_id), item]));
  const documents: Row[] = [
    ...invoices.map(invoice => ({
      ...invoice,
      payment_status: purchaseOrderPaymentByInvoice.get(id(invoice.id))?.payment_status,
    } as Row)),
    ...payables,
  ];
  const paymentRows: Row[] = [...payables, ...purchaseOrderPayments].flatMap(payable => rows(payable.payments)
    .map(payment => ({ ...payment, folio: payable.document_reference || payable.folio } as Row)));
  return <WorkspaceFrame onRefresh={props.onRefresh} title="Seguimiento y pagos">
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-xs leading-5 text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100"><strong>Información compartible:</strong> fecha, importe, referencia y saldo. Las cuentas bancarias internas, aprobadores y notas financieras permanecen ocultos.</div>
    <div className="grid gap-4 sm:grid-cols-2"><Panel icon={<Send className="h-5 w-5" />} title={`Propuestas · ${submissions.length}`}>{submissions.length ? submissions.slice(0, 8).map(item => <p key={id(item.id)} className="flex justify-between gap-3 border-b border-slate-100 py-2 text-xs"><span>{text(item.submission_number)}</span><Status value={item.status} /></p>) : <Empty>Sin propuestas.</Empty>}</Panel><Panel icon={<PackageCheck className="h-5 w-5" />} title={`Órdenes · ${orders.length}`}>{orders.length ? orders.slice(0, 8).map(item => <p key={id(item.id)} className="flex justify-between gap-3 border-b border-slate-100 py-2 text-xs"><span>{text(item.folio)} · {money(item.total_amount, item.currency_code)}</span><Status value={item.status} /></p>) : <Empty>Sin órdenes.</Empty>}</Panel></div>
    <Panel icon={<ReceiptText className="h-5 w-5" />} title={`Documentos por pagar · ${documents.length}`}><div className="space-y-2">{documents.length ? documents.map((item, index) => <div key={`${text(item.id || item.expense_id)}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-xs"><span>{text(item.invoice_number || item.folio)} · {money(item.total_amount, item.currency_code)}</span><Status value={item.payment_status || item.status} /></div>) : <Empty>Sin documentos.</Empty>}</div></Panel>
    <Panel icon={<CircleDollarSign className="h-5 w-5" />} title="Pagos informados"><div className="space-y-2">{paymentRows.length ? paymentRows.map((payment, index) => <div key={`${text(payment.reference)}-${index}`} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-slate-200 p-3 text-xs"><strong>{text(payment.reference)}</strong><strong>{money(payment.amount, payment.currency_code)}</strong><span className="text-slate-500">{text(payment.folio)} · {date(payment.date)}</span></div>) : <Empty>Aún no hay pagos informados.</Empty>}</div></Panel>
  </WorkspaceFrame>;
}

export function ProviderCenterMultiKioskWorkspace(props: ProviderWorkspaceProps) {
  const kind = text(props.workspace.kiosk.workspace_kind).toUpperCase();
  if (kind === 'PROVIDER_PROPOSALS') return <PurchaseProposalWorkspace {...props} />;
  if (kind === 'PROVIDER_ORDERS_INVOICES') return <OrdersWorkspace {...props} />;
  if (kind === 'PROVIDER_PAYABLES') return <ProviderPayablesWorkspace {...props} />;
  return <TrackingWorkspace {...props} />;
}
