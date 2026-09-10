import { useDeferredValue, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  File,
  FileText,
  Landmark,
  LoaderCircle,
  Minus,
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
import {
  getBudgetTaxProfiles,
  getDefaultBudgetTaxProfile,
  inferTaxCountryFromCurrency,
  roundMoney,
  taxRateToPercentInput,
} from '../../BasicModules/Expenses/Budgets/budgetTaxCatalog';
import { multiKioskPublicApi, type MultiKioskChildWorkspace } from '../../api/multiKiosks';
import {
  uploadPresignedKioskFile,
  type KioskPresignedUpload,
} from '../multiKioskWorkspaceUploads';
import { KioskModalFrame } from '../../components/kiosk-engine/KioskModalFrame';
import { cn } from '../../components/ui/utils';

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
  taxApplied: boolean;
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

const inputClass = 'mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-[#177D66] focus:ring-4 focus:ring-[#177D66]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Row[] : [];
const text = (value: unknown) => value == null ? '' : String(value);
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const id = (value: unknown) => number(value);
const documentLocale = () => typeof document === 'undefined' ? 'es-MX' : document.documentElement.lang || 'es-MX';
const date = (value: unknown) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(text(value));
  return Number.isNaN(parsed.getTime()) ? text(value) : new Intl.DateTimeFormat(documentLocale(), { dateStyle: 'medium' }).format(parsed);
};
const money = (value: unknown, currency: unknown = 'MXN') => new Intl.NumberFormat(documentLocale(), {
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

type ProviderTone = 'aqua' | 'coral' | 'green';
const providerToneStyles: Record<ProviderTone, { icon: string; primary: string; soft: string }> = {
  aqua: { icon: 'bg-[#59C3A5]/15 text-[#177D66] dark:text-emerald-300', primary: 'bg-[#177D66] text-white', soft: 'border-[#59C3A5]/40 bg-[#59C3A5]/10 text-[#177D66] dark:text-emerald-200' },
  coral: { icon: 'bg-[#FF6B5E]/12 text-[#B63B32] dark:text-rose-300', primary: 'bg-[#FF6B5E] text-[#222831]', soft: 'border-rose-200 bg-rose-50 text-[#B63B32] dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-300' },
  green: { icon: 'bg-[#147514]/10 text-[#147514] dark:text-emerald-300', primary: 'bg-[#147514] text-white', soft: 'border-emerald-200 bg-emerald-50 text-[#147514] dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-200' },
};

function Panel({ children, icon, subtitle, title, tone = 'aqua' }: { children: ReactNode; icon: ReactNode; subtitle?: string; title: string; tone?: ProviderTone }) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
      <div className="flex items-start gap-3">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', providerToneStyles[tone].icon)}>{icon}</span>
        <div className="min-w-0"><h2 className="text-base font-medium text-slate-950 dark:text-white">{title}</h2>{subtitle ? <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p> : null}</div>
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
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-8 text-center text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900/40">{children}</div>;
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
  const tone = ['APPROVED', 'CONFIRMED', 'PAID', 'RECEIVED'].includes(normalized)
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-200'
    : ['REJECTED', 'CANCELLED', 'VOIDED', 'OVERDUE'].includes(normalized)
      ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200'
      : ['NEEDS_CLARIFICATION', 'PARTIALLY_PAID', 'PARTIALLY_RECEIVED'].includes(normalized)
        ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-200'
        : ['SENT', 'SUBMITTED', 'IN_REVIEW'].includes(normalized)
          ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/35 dark:text-blue-200'
          : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
  return <span className={cn('inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-medium', tone)}>{label}</span>;
}

function ContactFields({ provider }: { provider: Row }) {
  return <>
    <Field label="Persona que realiza el envío *"><input required name="submitted_by_name" maxLength={180} defaultValue={text(provider.contact_name)} autoComplete="name" className={inputClass} /></Field>
    <Field label="Correo de contacto *"><input required name="submitted_by_email" type="email" maxLength={180} defaultValue={text(provider.email)} autoComplete="email" className={inputClass} /></Field>
  </>;
}

function WorkspaceFrame({ children, title, unsaved = false }: { children: ReactNode; onRefresh: () => Promise<void>; showContext?: boolean; title: string; unsaved?: boolean }) {
  return (
    <main aria-label={title} className="space-y-4" data-provider-unsaved={unsaved ? 'true' : undefined}>
      {children}
    </main>
  );
}

function ProviderAppHeader({ action, description, icon, onRefresh, title, tone }: {
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  onRefresh: () => Promise<void>;
  title: string;
  tone: ProviderTone;
}) {
  const [refreshing, setRefreshing] = useState(false);
  return (
    <header className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', providerToneStyles[tone].icon)}>{icon}</span>
        <div className="min-w-0">
          <h2 className="text-xl font-medium tracking-tight text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-600 dark:text-slate-300">{description}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        <button
          aria-label="Actualizar información"
          disabled={refreshing}
          onClick={() => { setRefreshing(true); void onRefresh().finally(() => setRefreshing(false)); }}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 outline-none transition hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-[#177D66]/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
          type="button"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        </button>
      </div>
    </header>
  );
}

function ProviderWorkspaceTabs<T extends string>({ active, onChange, tabs, tone }: {
  active: T;
  onChange: (value: T) => void;
  tabs: readonly { id: T; label: string; count?: number }[];
  tone: ProviderTone;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-950" role="tablist">
      <div className="flex min-w-max gap-1 sm:min-w-0">
        {tabs.map(tab => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.id)}
              className={cn(
                'inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium outline-none transition focus-visible:ring-4',
                selected ? providerToneStyles[tone].soft : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900',
              )}
            >
              {tab.label}
              {typeof tab.count === 'number' ? <span className="rounded-full bg-white/75 px-2 py-0.5 text-xs tabular-nums text-slate-600 dark:bg-slate-900 dark:text-slate-300">{tab.count}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProviderAttachmentPicker({ canUpload, file, maximumMegabytes, onChange, tone }: {
  canUpload: boolean;
  file: File | null;
  maximumMegabytes: number;
  onChange: (file: File | null) => void;
  tone: 'coral' | 'green';
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const styles = providerToneStyles[tone];
  if (!canUpload) return <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">La carga de documentos no está disponible en esta sesión.</p>;
  return (
    <div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={event => onChange(event.target.files?.[0] ?? null)} />
      <input ref={fileRef} type="file" accept=".pdf,.xml,.jpg,.jpeg,.png,.webp,.docx,.xlsx" className="hidden" onChange={event => onChange(event.target.files?.[0] ?? null)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => cameraRef.current?.click()} className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left outline-none transition hover:border-slate-300 focus-visible:ring-4 focus-visible:ring-slate-300/30 dark:border-slate-700 dark:bg-slate-950">
          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', styles.icon)}><Camera className="h-5 w-5" /></span>
          <span><span className="block text-sm font-medium text-slate-950 dark:text-white">Tomar fotografía</span><span className="mt-1 block text-xs text-slate-500">Usa la cámara del dispositivo</span></span>
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left outline-none transition hover:border-slate-300 focus-visible:ring-4 focus-visible:ring-slate-300/30 dark:border-slate-700 dark:bg-slate-950">
          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', styles.icon)}><Upload className="h-5 w-5" /></span>
          <span><span className="block text-sm font-medium text-slate-950 dark:text-white">Elegir archivo</span><span className="mt-1 block text-xs text-slate-500">PDF, XML, imagen o documento</span></span>
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">Tamaño máximo: {maximumMegabytes} MB.</p>
      {file ? <div className="mt-3 flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', styles.icon)}><File className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{file.name}</p><p className="text-xs text-slate-500">{Math.max(file.size / 1024, 1).toFixed(0)} KB</p></div>
        <button type="button" aria-label="Quitar archivo" onClick={() => onChange(null)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-red-600 outline-none transition hover:bg-red-50 focus-visible:ring-4 focus-visible:ring-red-500/15"><Trash2 className="h-4 w-4" /></button>
      </div> : null}
    </div>
  );
}

class ProviderUiError extends Error {}

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
    throw new ProviderUiError(`El archivo debe ser PDF, imagen, XML, DOCX o XLSX y pesar máximo ${mode === 'invoice' ? 15 : 10} MB.`);
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
    throw new ProviderUiError('No pudimos preparar la carga del documento. Inténtalo nuevamente.');
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
        setError(failure instanceof ProviderUiError
          ? failure.message
          : 'No pudimos completar la operación. Revisa los datos e inténtalo nuevamente.');
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
  return <WorkspaceFrame onRefresh={props.onRefresh} title="Productos y propuestas">
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
  const [view, setView] = useState<'requests' | 'create' | 'sent'>(openRequests.length ? 'requests' : 'create');
  const [activeStep, setActiveStep] = useState<ProposalStep>('reference');
  const [quoteId, setQuoteId] = useState('');
  const [currencyCode, setCurrencyCode] = useState('MXN');
  const [taxProfileId, setTaxProfileId] = useState(() => getDefaultBudgetTaxProfile('MX')?.id ?? '');
  const [manualTaxPercent, setManualTaxPercent] = useState('');
  const [applyTaxByDefault, setApplyTaxByDefault] = useState(false);
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
  const taxCountry = inferTaxCountryFromCurrency(effectiveCurrency);
  const taxProfiles = useMemo(() => getBudgetTaxProfiles(taxCountry), [taxCountry]);
  const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry) ?? taxProfiles[0];
  const selectedTaxProfile = taxProfiles.find(profile => profile.id === taxProfileId) ?? defaultTaxProfile;
  const selectedTaxPercent = selectedTaxProfile?.manualRate
    ? Math.max(0, number(manualTaxPercent))
    : Number(taxRateToPercentInput(selectedTaxProfile?.rate ?? 0));
  const selectedTaxLabel = selectedTaxProfile?.manualRate
    ? `${selectedTaxProfile.shortName} ${selectedTaxPercent}%`
    : selectedTaxProfile?.shortName ?? 'Sin impuesto';
  const steps = useMemo(() => [
    { id: 'reference' as const, label: 'Datos de la propuesta' },
    { id: 'items' as const, label: 'Partidas' },
    { id: 'review' as const, label: 'Revisar' },
  ], []);
  const activeStepIndex = steps.findIndex(step => step.id === activeStep);
  const totals = useMemo(() => lines.reduce((result, line) => {
    const subtotal = line.quantity * line.unitCost;
    const tax = line.taxApplied ? subtotal * (selectedTaxPercent / 100) : 0;
    return { subtotal: result.subtotal + subtotal, tax: result.tax + tax, total: result.total + subtotal + tax };
  }, { subtotal: 0, tax: 0, total: 0 }), [lines, selectedTaxPercent]);
  const taxedLineCount = lines.filter(line => line.taxApplied).length;
  const allLinesTaxed = lines.length > 0 && taxedLineCount === lines.length;
  const someLinesTaxed = taxedLineCount > 0 && !allLinesTaxed;
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
    setTaxProfileId(getDefaultBudgetTaxProfile('MX')?.id ?? '');
    setManualTaxPercent('');
    setApplyTaxByDefault(false);
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
    taxApplied = applyTaxByDefault,
  ): PurchaseProposalLine => ({
    id: `catalog-${product.id}`,
    productId: product.id,
    productName: product.name,
    providerSku: product.providerSku,
    catalogSku: product.sku || product.productCode,
    quantity,
    unitCost: product.providerProduct && product.currencyCode === transactionCurrency ? product.costAmount : 0,
    taxApplied,
    providerProduct: product.providerProduct,
  });

  const selectTaxForCurrency = (value: string) => {
    const profile = getDefaultBudgetTaxProfile(inferTaxCountryFromCurrency(value));
    setTaxProfileId(profile?.id ?? '');
    setManualTaxPercent('');
  };

  const changeCurrency = (value: string) => {
    setCurrencyCode(value);
    selectTaxForCurrency(value);
    setValidationMessages([]);
  };

  const selectRequest = (value: string) => {
    setQuoteId(value);
    setValidationMessages([]);
    const request = quoteRequests.find(row => id(row.id) === Number(value));
    if (!request) {
      setLines([]);
      setApplyTaxByDefault(false);
      selectTaxForCurrency(currencyCode);
      return;
    }
    const requestCurrency = text(request.currency_code) || 'MXN';
    setCurrencyCode(requestCurrency);
    setApplyTaxByDefault(false);
    selectTaxForCurrency(requestCurrency);
    setLines(rows(request.items).map((item, index) => {
      const productId = id(item.product_id);
      const product = catalogProducts.find(option => option.id === productId);
      return product
        ? lineForProduct(product, number(item.quantity) || 1, requestCurrency, false)
        : {
            id: `request-${id(item.id) || index}`,
            productId: productId || undefined,
            productName: text(item.product_name),
            providerSku: text(item.sku),
            catalogSku: text(item.sku),
            quantity: number(item.quantity) || 1,
            unitCost: 0,
            taxApplied: false,
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

  const addUnlistedProduct = () => {
    setLines(current => [...current, {
      id: `new-${Date.now()}-${current.length}`,
      productName: '',
      providerSku: '',
      catalogSku: '',
      quantity: 1,
      unitCost: 0,
      taxApplied: applyTaxByDefault,
      providerProduct: true,
    }]);
    setValidationMessages([]);
  };

  const updateLine = (lineId: string, field: 'quantity' | 'unitCost', value: number) => {
    setLines(current => current.map(line => line.id === lineId
      ? { ...line, [field]: Number.isFinite(value) ? Math.max(value, 0) : 0 }
      : line));
    setValidationMessages([]);
  };

  const toggleAllTaxes = () => {
    const enabled = !allLinesTaxed;
    setApplyTaxByDefault(enabled);
    setLines(current => current.map(line => ({ ...line, taxApplied: enabled })));
    setValidationMessages([]);
  };

  const toggleLineTax = (lineId: string) => {
    const nextLines = lines.map(line => line.id === lineId
      ? { ...line, taxApplied: !line.taxApplied }
      : line);
    setLines(nextLines);
    if (nextLines.every(line => line.taxApplied)) setApplyTaxByDefault(true);
    else if (nextLines.every(line => !line.taxApplied)) setApplyTaxByDefault(false);
    setValidationMessages([]);
  };

  const updateLineText = (lineId: string, field: 'productName' | 'providerSku', value: string) => {
    setLines(current => current.map(line => line.id === lineId ? { ...line, [field]: value } : line));
    setValidationMessages([]);
  };

  const validateReference = () => {
    const messages: string[] = [];
    if (!effectiveCurrency) messages.push('Selecciona la moneda de esta propuesta.');
    if (!selectedTaxProfile) messages.push('Selecciona el impuesto de la operación.');
    if (selectedTaxProfile?.manualRate
        && (!manualTaxPercent.trim() || !Number.isFinite(Number(manualTaxPercent))
          || Number(manualTaxPercent) < 0 || Number(manualTaxPercent) > 100)) {
      messages.push('La tasa especial debe estar entre 0% y 100%.');
    }
    if (!contactName.trim()) messages.push('Indica quién realiza el envío.');
    if (!/^\S+@\S+\.\S+$/.test(contactEmail.trim())) messages.push('Escribe un correo de contacto válido.');
    setValidationMessages(messages);
    return messages.length === 0;
  };
  const validateItems = () => {
    const messages: string[] = [];
    if (!lines.length) messages.push('Agrega al menos un producto a la propuesta.');
    if (lines.some(line => !line.productName.trim() || line.quantity <= 0 || line.unitCost < 0)) {
      messages.push('Revisa cantidades y costos de todas las partidas.');
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
        taxRate: line.taxApplied ? selectedTaxPercent : 0,
        leadTimeDays: null,
        minimumOrderQuantity: null,
      })),
      ...(quoteId ? { quote_request_id: Number(quoteId) } : {}),
    };
    if (await run(quoteId ? caps.quote : caps.proposal, payload,
      quoteId ? 'Cotización enviada a Compras para revisión.' : 'Propuesta de compra enviada para revisión.')) {
      resetDraft();
      setView('sent');
    }
  };

  return <WorkspaceFrame
    onRefresh={props.onRefresh}
    showContext={false}
    title="Productos y propuestas"
    unsaved={lines.length > 0 || Boolean(quoteId) || Boolean(notes.trim()) || currencyCode !== 'MXN' || applyTaxByDefault}
  >
    <ProviderAppHeader
      action={<button type="button" onClick={() => setView('create')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831] outline-none transition hover:bg-[#f85d51] focus-visible:ring-4 focus-visible:ring-rose-500/20"><Plus className="h-4 w-4" />Nueva propuesta</button>}
      description="Responde solicitudes de compra o comparte una propuesta espontánea con la empresa."
      icon={<PackagePlus className="h-5 w-5" />}
      onRefresh={props.onRefresh}
      title="Productos y propuestas"
      tone="coral"
    />
    <ProviderWorkspaceTabs
      active={view}
      onChange={value => setView(value as typeof view)}
      tone="coral"
      tabs={[
        { id: 'requests', label: 'Solicitudes', count: openRequests.length },
        { id: 'create', label: 'Nueva propuesta' },
        { id: 'sent', label: 'Enviadas', count: submissions.length },
      ]}
    />

    {view === 'requests' ? <Panel tone="coral" icon={<ClipboardList className="h-5 w-5" />} title="Solicitudes por responder" subtitle="La empresa especificó los productos que necesita. Revisa la fecha límite antes de responder.">
      <div className="space-y-3">
        {openRequests.length ? openRequests.map(request => <article key={id(request.id)} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-base font-medium text-slate-950 dark:text-white">{text(request.title) || text(request.request_number)}</p>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{text(request.description) || 'Completa cantidades y costos para responder esta solicitud.'}</p>
            <p className="mt-2 text-xs text-slate-500">{text(request.request_number)} · Fecha límite {date(request.response_deadline)}</p>
          </div>
          <button type="button" onClick={() => { selectRequest(String(id(request.id))); setView('create'); }} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-[#B63B32] outline-none transition hover:border-[#FF6B5E] focus-visible:ring-4 focus-visible:ring-rose-500/20 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-300">Responder<ArrowRight className="h-4 w-4" /></button>
        </article>) : <Empty>No hay solicitudes pendientes. Puedes crear una propuesta espontánea cuando tengas productos para ofrecer.</Empty>}
      </div>
    </Panel> : null}

    {view === 'create' ? <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FF6B5E]/15 text-[#B63B32]"><PackagePlus className="h-5 w-5" /></span>
          <div className="min-w-0"><div className="flex items-center gap-2"><p className="text-xs font-medium text-[#B63B32]">Compras</p><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">Borrador</span></div><h2 className="truncate text-lg font-medium text-slate-950 dark:text-white">Nueva propuesta de compra</h2><p className="hidden truncate text-sm text-slate-500 sm:block">Captura las partidas; Compras las revisará antes de convertirlas en orden.</p></div>
        </div>
      </header>
      <div className="space-y-3 bg-slate-50/70 p-3 dark:bg-slate-950 sm:p-4">
        {notices}
        <IndiceModalWizardStepper accent="coral" activeStepId={activeStep} density="compact" progressLabel={`Paso ${activeStepIndex + 1} de ${steps.length}`} steps={steps} />
        {validationMessages.length ? <IndiceModalValidation messages={validationMessages} tone="error" /> : null}

        {activeStep === 'reference' ? <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-4">
          <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32]"><FileText className="h-4 w-4" /></span><div><h3 className="text-base font-medium text-slate-950 dark:text-white">Datos de la propuesta</h3><p className="mt-0.5 text-sm leading-5 text-slate-500">Ya sabemos qué proveedor eres. Elige una solicitud o inicia una propuesta espontánea.</p></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Tipo de propuesta"><select value={quoteId} onChange={event => selectRequest(event.target.value)} className={inputClass}><option value="">Propuesta espontánea</option>{openRequests.map(request => <option key={id(request.id)} value={id(request.id)}>{text(request.request_number)} · {text(request.title)}</option>)}</select></Field>
            <Field label="Moneda de la operación *">{selectedRequest ? <div className={`${inputClass} flex items-center bg-slate-50 font-medium`}>{effectiveCurrency}</div> : <TransactionCurrencySelect value={currencyCode} onChange={changeCurrency} />}</Field>
            <Field label="Impuesto de la operación *"><select value={selectedTaxProfile?.id ?? ''} onChange={event => { setTaxProfileId(event.target.value); setManualTaxPercent(''); setValidationMessages([]); }} className={inputClass}>{taxProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></Field>
            {selectedTaxProfile?.manualRate ? <Field label="Tasa especial % *"><input type="number" min="0" max="100" step="0.001" value={manualTaxPercent} onChange={event => { setManualTaxPercent(event.target.value); setValidationMessages([]); }} className={inputClass} placeholder="Ej. 8.25" /></Field> : null}
            <Field label="Persona que realiza el envío *"><input required value={contactName} onChange={event => setContactName(event.target.value)} maxLength={180} autoComplete="name" className={inputClass} /></Field>
            <Field label="Correo de contacto *"><input required value={contactEmail} onChange={event => setContactEmail(event.target.value)} type="email" maxLength={180} autoComplete="email" className={inputClass} /></Field>
            <div className="sm:col-span-2"><Field label="Notas para Compras"><textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={4000} rows={2} className={`${inputClass} h-auto`} /></Field></div>
          </div>
          {selectedRequest ? <div className="mt-4 rounded-2xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/5 p-4 text-sm text-slate-700 dark:text-slate-200"><p className="font-medium text-slate-950 dark:text-white">{text(selectedRequest.title)}</p>{text(selectedRequest.description) ? <p className="mt-1">{text(selectedRequest.description)}</p> : null}<p className="mt-2 text-xs text-slate-500">Fecha límite: {date(selectedRequest.response_deadline)}</p></div> : null}
        </section> : null}

        {activeStep === 'items' ? <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-4">
          <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32]"><Search className="h-4 w-4" /></span><div><h3 className="text-base font-medium text-slate-950 dark:text-white">Productos de la propuesta</h3><p className="mt-0.5 text-sm leading-5 text-slate-500">Elige productos y captura cantidad y costo. El impuesto se activa con una palomita. Tus productos aparecen primero.</p></div></div>
          <button type="button" role="checkbox" aria-checked={someLinesTaxed ? 'mixed' : allLinesTaxed} onClick={toggleAllTaxes} className="mt-4 flex w-full items-center gap-3 rounded-xl border border-[#FF6B5E]/30 bg-[#FF6B5E]/5 px-3 py-3 text-left transition hover:bg-[#FF6B5E]/10 focus:outline-none focus:ring-2 focus:ring-[#FF6B5E]/25">
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${allLinesTaxed || someLinesTaxed ? 'border-[#B63B32] bg-[#FF6B5E] text-[#222831]' : 'border-slate-300 bg-white text-transparent dark:border-slate-600 dark:bg-slate-900'}`}>{someLinesTaxed ? <Minus className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}</span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-950 dark:text-white">Aplicar {selectedTaxLabel} a todas las partidas</span><span className="mt-0.5 block text-xs text-slate-500">{lines.length ? `${taxedLineCount} de ${lines.length} con impuesto · puedes quitarlo en productos especiales` : 'Las partidas que agregues usarán esta selección'}</span></span>
          </button>
          {!selectedRequest ? <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section aria-label="Catálogo de productos" className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-950">
              <div className="border-b border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between gap-3"><label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="provider-product-search">Catálogo</label><span className="text-xs text-slate-500">{catalogProducts.length} disponibles</span></div>
                <div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input ref={searchInputRef} id="provider-product-search" value={productSearch} onChange={event => setProductSearch(event.target.value)} placeholder="Buscar por nombre, SKU o código" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></div>
              </div>
              <div className="max-h-[360px] divide-y divide-slate-200 overflow-y-auto dark:divide-slate-800">
                {filteredProducts.length ? filteredProducts.map(product => {
                  const selectedLine = lines.find(line => line.productId === product.id);
                  return <div key={product.id} className="flex min-h-14 items-center justify-between gap-3 bg-white px-3 py-2.5 dark:bg-slate-900">
                    <div className="min-w-0"><div className="flex min-w-0 items-center gap-2"><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{product.name}</p>{product.providerProduct ? <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Tu producto</span> : null}</div><p className="truncate text-xs text-slate-500">{product.sku || product.productCode || 'Sin SKU'}</p></div>
                    <button type="button" onClick={() => addProduct(product)} aria-label={`Agregar ${product.name}`} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-[#FF6B5E]/40 bg-white px-3 text-xs font-medium text-[#B63B32] transition hover:bg-[#FF6B5E]/10 focus:outline-none focus:ring-2 focus:ring-[#FF6B5E]/30 dark:bg-slate-950"><Plus className="h-3.5 w-3.5" />{selectedLine ? `Agregar otro (${selectedLine.quantity})` : 'Agregar'}</button>
                  </div>;
                }) : <div className="p-5 text-center"><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{catalogProducts.length ? 'No hay coincidencias.' : 'No hay productos disponibles.'}</p><p className="mt-1 text-xs leading-5 text-slate-500">{catalogProducts.length ? 'Prueba con otro nombre, SKU o código.' : 'La empresa debe tener al menos un producto activo en Inventarios.'}</p></div>}
              </div>
              <div className="border-t border-slate-200 p-3 dark:border-slate-700"><button type="button" onClick={addUnlistedProduct} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#FF6B5E]/40 bg-white px-3 text-sm font-medium text-[#B63B32] hover:bg-[#FF6B5E]/10 dark:bg-slate-900"><PackagePlus className="h-4 w-4" />Proponer un producto nuevo</button><p className="mt-2 text-center text-xs leading-5 text-slate-500">Inventarios revisará el nombre, costo y precio de venta antes de crearlo.</p></div>
            </section>
            <section aria-label="Partidas seleccionadas" className="min-w-0 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="mb-3 flex items-center justify-between gap-3"><div><h4 className="text-sm font-medium text-slate-900 dark:text-white">Partidas</h4><p className="text-xs text-slate-500">Usa Agregar y completa el costo que ofreces.</p></div><span className="rounded-full bg-[#FF6B5E]/10 px-2 py-1 text-xs font-medium text-[#B63B32]">{lines.length}</span></div>
              <ProposalLineItems currency={effectiveCurrency} lines={lines} taxLabel={selectedTaxLabel} taxRate={selectedTaxPercent} onRemove={lineId => setLines(current => current.filter(line => line.id !== lineId))} onToggleTax={toggleLineTax} onUpdate={updateLine} onUpdateText={updateLineText} />
            </section>
          </div> : <div className="mt-4"><div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Estas partidas fueron solicitadas por la empresa. Completa el costo y marca las que llevan {selectedTaxLabel}.</div><ProposalLineItems currency={effectiveCurrency} lines={lines} taxLabel={selectedTaxLabel} taxRate={selectedTaxPercent} onToggleTax={toggleLineTax} onUpdate={updateLine} /></div>}
        </section> : null}

        {activeStep === 'review' ? <div className="space-y-4">
          <IndiceModalSummary columns={3} variant="accent" icon={<CheckCircle2 className="h-5 w-5" />} title="Revisa antes de enviar" description="Compras recibirá esta propuesta con estado Por revisar." items={[
            { label: 'Proveedor', value: text(provider.name) },
            { label: 'Partidas', value: String(lines.length) },
            { label: 'Moneda', value: effectiveCurrency },
            { label: 'Impuesto base', value: selectedTaxLabel },
            { label: 'Subtotal', value: money(totals.subtotal, effectiveCurrency) },
            { label: 'Impuestos', value: money(totals.tax, effectiveCurrency) },
            { label: 'Total', value: money(totals.total, effectiveCurrency), emphasized: true },
          ]} />
          <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32]"><PackageCheck className="h-4 w-4" /></span><div><h3 className="text-base font-medium text-slate-950 dark:text-white">Partidas que recibirá Compras</h3><p className="mt-0.5 text-sm leading-5 text-slate-500">La empresa podrá aprobar y convertir la propuesta sin volver a capturarla.</p></div></div><div className="mt-3"><ProposalLineItems compact currency={effectiveCurrency} lines={lines} taxLabel={selectedTaxLabel} taxRate={selectedTaxPercent} /></div></section>
        </div> : null}
      </div>
      <footer className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-medium text-slate-900 dark:text-white">{lines.length} partidas · {money(totals.total, effectiveCurrency)}</p>{activeStep === 'items' && !lines.length ? <p className="text-xs text-slate-500">Agrega un producto para continuar.</p> : null}</div>
        <div className="flex gap-2">{activeStep !== 'reference' ? <button type="button" disabled={busy} onClick={goBack} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"><ArrowLeft className="h-4 w-4" /> Atrás</button> : null}{activeStep === 'review' ? <button type="button" disabled={busy || !lines.length} onClick={() => void submitProposal()} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#FF6B5E] px-5 text-sm font-medium text-[#222831] disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar a revisión</button> : <button type="button" disabled={busy || (activeStep === 'items' && !lines.length)} onClick={goForward} className="min-h-12 rounded-xl bg-[#FF6B5E] px-5 text-sm font-medium text-[#222831] disabled:cursor-not-allowed disabled:opacity-40">Continuar</button>}</div>
      </footer>
    </section> : null}
    {view === 'sent' ? <Panel tone="coral" icon={<FileText className="h-5 w-5" />} title="Propuestas enviadas" subtitle="El estado se actualiza cuando Compras revisa o convierte la propuesta."><div className="space-y-2">{submissions.length ? submissions.map(item => <div key={id(item.id)} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-slate-950 dark:text-white">{text(item.submission_number)}</p><p className="mt-1 text-xs text-slate-500">Revisión {text(item.revision_number)} · {money(item.total_amount, item.currency_code)} · {date(item.submitted_at)}</p></div><Status value={item.status} /></div>) : <Empty>Aún no hay propuestas enviadas.</Empty>}</div></Panel> : null}
  </WorkspaceFrame>;
}

function ProposalLineItems({ compact = false, currency, lines, taxLabel, taxRate, onRemove, onToggleTax, onUpdate, onUpdateText }: {
  compact?: boolean;
  currency: string;
  lines: PurchaseProposalLine[];
  taxLabel: string;
  taxRate: number;
  onRemove?: (lineId: string) => void;
  onToggleTax?: (lineId: string) => void;
  onUpdate?: (lineId: string, field: 'quantity' | 'unitCost', value: number) => void;
  onUpdateText?: (lineId: string, field: 'productName' | 'providerSku', value: string) => void;
}) {
  if (!lines.length) return <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-center dark:border-slate-700 dark:bg-slate-950"><div><PackagePlus className="mx-auto h-5 w-5 text-slate-400" /><p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">Tu propuesta está vacía</p><p className="mt-1 text-xs text-slate-500">En el catálogo, pulsa Agregar para incluir un producto.</p></div></div>;
  return <div className="space-y-2">{lines.map(line => {
    const subtotal = line.quantity * line.unitCost;
    const total = subtotal + (line.taxApplied ? subtotal * (taxRate / 100) : 0);
    return <div key={line.id} className={`min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900 ${compact ? 'grid gap-3 sm:grid-cols-[minmax(0,1fr)_70px_120px] sm:items-center' : ''}`}>
      <div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0 flex-1">{!compact && !line.productId ? <div className="grid gap-2 sm:grid-cols-2"><Field label="Nombre del producto *"><input value={line.productName} maxLength={240} onChange={event => onUpdateText?.(line.id, 'productName', event.target.value)} className={inputClass} placeholder="Producto propuesto" /></Field><Field label="Tu SKU"><input value={line.providerSku} maxLength={120} onChange={event => onUpdateText?.(line.id, 'providerSku', event.target.value)} className={inputClass} /></Field></div> : <><div className="flex flex-wrap items-center gap-2"><p className="truncate font-medium text-slate-950 dark:text-white">{line.productName}</p>{line.providerProduct ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Tu producto</span> : null}{compact ? <span className={`rounded-full px-2 py-1 text-xs font-medium ${line.taxApplied ? 'bg-rose-50 text-[#B63B32] dark:bg-rose-950/30 dark:text-rose-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{line.taxApplied ? taxLabel : 'Sin impuesto'}</span> : null}</div><p className="truncate text-xs text-slate-500">{line.providerSku || line.catalogSku || 'Sin SKU'}</p></>}</div>{!compact && onRemove ? <button type="button" aria-label="Quitar partida" onClick={() => onRemove(line.id)} className="-mr-1 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-red-600 hover:bg-red-50 focus-visible:ring-4 focus-visible:ring-red-500/15"><Trash2 className="h-4 w-4" /></button> : null}</div>
      {compact ? <div><p className="text-xs text-slate-400">Cantidad</p><p className="font-medium">{line.quantity}</p></div> : <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"><ProposalNumber label="Cantidad" value={line.quantity} min={0.0001} onChange={value => onUpdate?.(line.id, 'quantity', value)} /><ProposalNumber label="Costo unitario" value={line.unitCost} min={0} onChange={value => onUpdate?.(line.id, 'unitCost', value)} /><button type="button" role="checkbox" aria-checked={line.taxApplied} aria-label={`${line.taxApplied ? 'Quitar' : 'Aplicar'} ${taxLabel} a ${line.productName}`} onClick={() => onToggleTax?.(line.id)} className={`col-span-2 flex min-h-12 items-center gap-2 rounded-lg border px-3 text-left transition sm:col-span-1 ${line.taxApplied ? 'border-rose-300 bg-rose-50 text-[#B63B32] dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}><span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${line.taxApplied ? 'border-[#B63B32] bg-[#FF6B5E] text-[#222831]' : 'border-slate-300 text-transparent dark:border-slate-600'}`}><Check className="h-3.5 w-3.5" /></span><span><span className="block text-xs text-slate-500">Impuesto</span><span className="block text-xs font-medium">{line.taxApplied ? taxLabel : 'No aplica'}</span></span></button></div>}
      <div className={compact ? '' : 'mt-3 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800'}><p className="text-xs text-slate-400">Total</p><p className="font-medium text-slate-950 dark:text-white">{money(total, currency)}</p></div>
    </div>;
  })}</div>;
}

function ProposalNumber({ label, min, onChange, suffix, value }: { label: string; min: number; onChange: (value: number) => void; suffix?: string; value: number }) {
  return <label className="min-w-0"><span className="block text-xs text-slate-500">{label}</span><span className="mt-1 flex min-h-12 items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-[#FF6B5E] focus-within:ring-2 focus-within:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950"><input type="number" min={min} step="0.0001" value={value} onChange={event => onChange(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />{suffix ? <span className="ml-1 text-xs text-slate-400">{suffix}</span> : null}</span></label>;
}

function OrdersWorkspace(props: ProviderWorkspaceProps) {
  const bootstrap = props.workspace.bootstrap ?? {};
  const provider = bootstrap.provider ?? {};
  const orders = rows(bootstrap.orders);
  const invoices = rows(bootstrap.invoices);
  const actionable = orders.filter(order => text(order.status) === 'SENT');
  const invoiceable = orders.filter(order => ['CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(text(order.status)));
  const [view, setView] = useState<'pending' | 'orders' | 'invoices'>(actionable.length ? 'pending' : 'orders');
  const [selectedOrder, setSelectedOrder] = useState(actionable[0] ? text(actionable[0].id) : '');
  const effectiveSelectedOrder = actionable.some(order => text(order.id) === selectedOrder)
    ? selectedOrder
    : actionable[0] ? text(actionable[0].id) : '';
  const [responseType, setResponseType] = useState('CONFIRMED');
  const [responseOpen, setResponseOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceOrderId, setInvoiceOrderId] = useState('');
  const [uploadedInvoice, setUploadedInvoice] = useState<{ name: string; size: number; objectKey: string } | null>(null);
  const { busy, notices, perform, run } = useProviderAction(props);
  const canUploadInvoice = props.workspace.session.capabilities.includes(caps.invoicePresign)
    && props.workspace.session.capabilities.includes(caps.invoiceRegister);
  const invoiceOrder = invoiceable.find(order => id(order.id) === Number(invoiceOrderId));
  const invoiceCurrency = text(invoiceOrder?.currency_code);

  const openResponse = (order: Row, type: 'CONFIRMED' | 'ADJUSTMENT_REQUESTED') => {
    setSelectedOrder(text(order.id));
    setResponseType(type);
    setResponseOpen(true);
  };
  const openInvoice = (order?: Row) => {
    setInvoiceOrderId(order ? text(order.id) : '');
    setInvoiceFile(null);
    setUploadedInvoice(null);
    setInvoiceOpen(true);
  };
  const closeInvoice = () => {
    if (busy) return;
    setInvoiceOpen(false);
    setInvoiceOrderId('');
    setInvoiceFile(null);
    setUploadedInvoice(null);
  };
  const respond = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    if (await run(caps.order, {
      purchase_order_id: number(values.get('purchase_order_id')),
      response_type: responseType,
      requested_expected_date: responseType === 'ADJUSTMENT_REQUESTED' ? text(values.get('requested_expected_date')) || null : null,
      reason: responseType === 'ADJUSTMENT_REQUESTED' ? text(values.get('reason')) : '',
      submitted_by_name: text(values.get('submitted_by_name')),
      submitted_by_email: text(values.get('submitted_by_email')),
    }, responseType === 'CONFIRMED' ? 'Orden confirmada.' : 'Solicitud de ajuste enviada sin modificar la orden original.')) {
      setResponseOpen(false);
      setView('orders');
    }
  };
  const invoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    const subtotal = number(values.get('subtotal')); const tax = number(values.get('tax'));
    const purchaseOrderId = number(values.get('purchase_order_id'));
    if (await perform(async () => {
      let documentUrl: string | null = null;
      if (invoiceFile) {
        if (!canUploadInvoice) throw new ProviderUiError('La carga de documentos no está disponible para esta herramienta.');
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
      setInvoiceOpen(false);
      setView('invoices');
    }
  };

  const orderCard = (order: Row) => {
    const canRespond = text(order.status) === 'SENT';
    const canInvoice = ['CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(text(order.status));
    return <article key={id(order.id)} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><p className="text-base font-medium text-slate-950 dark:text-white">{text(order.folio)}</p><Status value={order.status} /></div>
          <p className="mt-1 text-sm text-slate-500">Entrega {date(order.expected_date)} · {text(order.warehouse_name) || 'Almacén por confirmar'}</p>
        </div>
        <p className="text-lg font-medium text-slate-950 dark:text-white">{money(order.total_amount, order.currency_code)}</p>
      </div>
      <div className="mt-4 divide-y divide-slate-100 border-y border-slate-100 dark:divide-slate-800 dark:border-slate-800">
        {rows(order.items).map(item => <p key={id(item.id)} className="flex justify-between gap-3 py-2.5 text-sm text-slate-600 dark:text-slate-300"><span>{text(item.product_name)} · {text(item.quantity)}</span><span className="shrink-0">{money(item.line_total, order.currency_code)}</span></p>)}
      </div>
      {canRespond || canInvoice ? <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        {canRespond ? <><button type="button" onClick={() => openResponse(order, 'ADJUSTMENT_REQUESTED')} className="min-h-12 rounded-xl border border-rose-200 px-4 text-sm font-medium text-[#B63B32] outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20 dark:border-rose-900 dark:text-rose-300">Solicitar ajuste</button><button type="button" onClick={() => openResponse(order, 'CONFIRMED')} className="min-h-12 rounded-xl bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831] outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20">Confirmar orden</button></> : null}
        {canInvoice ? <button type="button" onClick={() => openInvoice(order)} className="min-h-12 rounded-xl bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831] outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20">Enviar factura</button> : null}
      </div> : null}
    </article>;
  };

  return <WorkspaceFrame onRefresh={props.onRefresh} title="Órdenes y facturas">
    <ProviderAppHeader
      action={invoiceable.length ? <button type="button" onClick={() => openInvoice()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831]"><ReceiptText className="h-4 w-4" />Enviar factura</button> : undefined}
      description="Confirma órdenes, solicita ajustes y factura solamente las compras que ya están listas."
      icon={<PackageCheck className="h-5 w-5" />}
      onRefresh={props.onRefresh}
      title="Órdenes y facturas"
      tone="coral"
    />
    {!responseOpen && !invoiceOpen ? notices : null}
    <ProviderWorkspaceTabs active={view} onChange={value => setView(value as typeof view)} tone="coral" tabs={[
      { id: 'pending', label: 'Por responder', count: actionable.length },
      { id: 'orders', label: 'Órdenes', count: orders.length },
      { id: 'invoices', label: 'Facturas', count: invoices.length },
    ]} />
    {view === 'pending' ? <Panel tone="coral" icon={<CheckCircle2 className="h-5 w-5" />} title="Órdenes que necesitan respuesta" subtitle="Confirma los términos o solicita un ajuste sin modificar la orden original."><div className="space-y-3">{actionable.length ? actionable.map(orderCard) : <Empty>No tienes órdenes pendientes de respuesta.</Empty>}</div></Panel> : null}
    {view === 'orders' ? <Panel tone="coral" icon={<PackageCheck className="h-5 w-5" />} title="Todas las órdenes" subtitle="Consulta cantidades, entrega, recepción y estado de cada compra."><div className="space-y-3">{orders.length ? orders.map(orderCard) : <Empty>No hay órdenes autorizadas para este proveedor.</Empty>}</div></Panel> : null}
    {view === 'invoices' ? <Panel tone="coral" icon={<FileText className="h-5 w-5" />} title="Facturas enviadas" subtitle="Cada factura permanece ligada a su orden de compra."><div className="space-y-2">{invoices.length ? invoices.map(item => <div key={id(item.id)} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-slate-950 dark:text-white">{text(item.invoice_number)}</p><p className="mt-1 text-xs text-slate-500">Orden {text(item.purchase_order_folio)} · {money(item.total_amount, item.currency_code)}</p></div><Status value={item.status} /></div>) : <Empty>Aún no hay facturas ligadas a órdenes. Primero confirma o recibe una orden para poder facturarla.</Empty>}</div></Panel> : null}

    <KioskModalFrame
      open={responseOpen}
      contentClassName="[&>button.absolute]:!h-12 [&>button.absolute]:!w-12"
      onOpenChange={setResponseOpen}
      busy={busy}
      size={responseType === 'CONFIRMED' ? 'compact' : 'form'}
      surface="public"
      tone="coral"
      icon={responseType === 'CONFIRMED' ? <CheckCircle2 className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
      title={responseType === 'CONFIRMED' ? 'Confirmar orden' : 'Solicitar ajuste'}
      description={responseType === 'CONFIRMED' ? 'Acepta cantidades, precios y fecha de entrega de la orden seleccionada.' : 'Explica qué debe revisar Compras sin modificar la orden original.'}
      footer={<><button type="button" disabled={busy} onClick={() => setResponseOpen(false)} className="min-h-12 rounded-xl border border-white/35 bg-white/10 px-4 text-sm font-medium">Cancelar</button><button type="submit" form="provider-order-response-form" disabled={busy} className="min-h-12 rounded-xl bg-white px-4 text-sm font-medium text-[#B63B32] disabled:opacity-50">{busy ? 'Enviando…' : responseType === 'CONFIRMED' ? 'Confirmar orden' : 'Enviar solicitud'}</button></>}
    >
      <form id="provider-order-response-form" className="grid gap-4" onSubmit={respond}>
        {notices}
        <Field label="Orden"><select required name="purchase_order_id" value={effectiveSelectedOrder} onChange={event => setSelectedOrder(event.target.value)} className={inputClass}>{actionable.map(order => <option key={id(order.id)} value={id(order.id)}>{text(order.folio)}</option>)}</select></Field>
        <input type="hidden" name="response_type" value={responseType} />
        {responseType === 'ADJUSTMENT_REQUESTED' ? <><Field label="Fecha de entrega propuesta"><input name="requested_expected_date" type="date" className={inputClass} /></Field><Field label="Motivo del ajuste *"><textarea required name="reason" maxLength={4000} rows={4} className={`${inputClass} h-auto`} /></Field></> : <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">Al confirmar aceptas cantidades, precios y fecha de entrega tal como aparecen en la orden.</p>}
        <ContactFields provider={provider} />
      </form>
    </KioskModalFrame>

    <KioskModalFrame
      open={invoiceOpen}
      contentClassName="[&>button.absolute]:!h-12 [&>button.absolute]:!w-12"
      onOpenChange={open => { if (!open) closeInvoice(); else setInvoiceOpen(true); }}
      busy={busy}
      size="form"
      surface="public"
      tone="coral"
      icon={<ReceiptText className="h-5 w-5" />}
      title="Enviar factura"
      description="La factura quedará ligada a la orden elegida y pasará a revisión."
      footerSummary={invoiceOrder ? `${text(invoiceOrder.folio)} · ${invoiceCurrency}` : 'Selecciona una orden'}
      footer={<><button type="button" disabled={busy} onClick={closeInvoice} className="min-h-12 rounded-xl border border-white/35 bg-white/10 px-4 text-sm font-medium">Cancelar</button><button type="submit" form="provider-invoice-form" disabled={busy || !invoiceOrderId} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#B63B32] disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}Enviar factura</button></>}
    >
      {invoiceable.length ? <form id="provider-invoice-form" className="grid gap-4" onSubmit={invoice}>
        {notices}
        <Field label="Orden *"><select required name="purchase_order_id" value={invoiceOrderId} onChange={event => setInvoiceOrderId(event.target.value)} className={inputClass}><option value="">Selecciona una orden</option>{invoiceable.map(order => <option key={id(order.id)} value={id(order.id)}>{text(order.folio)} · {money(order.total_amount, order.currency_code)}</option>)}</select></Field>
        <Field label="Folio de factura *"><input required name="invoice_number" maxLength={120} className={inputClass} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Fecha de factura"><input name="invoice_date" type="date" className={inputClass} /></Field><Field label="Vencimiento"><input name="due_date" type="date" className={inputClass} /></Field><Field label="Subtotal *"><input required name="subtotal" min="0" step="0.01" type="number" className={inputClass} /></Field><Field label="Impuestos *"><input required name="tax" min="0" step="0.01" type="number" defaultValue="0" className={inputClass} /></Field></div>
        <Field label="Moneda de la factura"><div className={`${inputClass} flex items-center bg-slate-50 font-medium dark:bg-slate-900`}>{invoiceCurrency || 'Selecciona una orden'}</div></Field>
        <ProviderAttachmentPicker canUpload={canUploadInvoice} file={invoiceFile} maximumMegabytes={15} onChange={file => { setInvoiceFile(file); setUploadedInvoice(null); }} tone="coral" />
        <div className="grid gap-4"><ContactFields provider={provider} /></div>
        <Field label="Notas"><textarea name="notes" maxLength={4000} rows={3} className={`${inputClass} h-auto`} /></Field>
      </form> : <Empty>Primero confirma o recibe una orden para poder facturarla.</Empty>}
    </KioskModalFrame>
  </WorkspaceFrame>;
}

function LegacyProviderPayablesWorkspace(props: ProviderWorkspaceProps) {
  const bootstrap = props.workspace.bootstrap ?? {};
  const provider = bootstrap.provider ?? {};
  const payables = rows(bootstrap.payables);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [concept, setConcept] = useState('');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [currencyCode, setCurrencyCode] = useState('MXN');
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [payableTaxProfileId, setPayableTaxProfileId] = useState(() => getDefaultBudgetTaxProfile('MX')?.id ?? '');
  const [payableManualTaxPercent, setPayableManualTaxPercent] = useState('');
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
  const payableTaxCountry = inferTaxCountryFromCurrency(currencyCode);
  const payableTaxProfiles = useMemo(() => getBudgetTaxProfiles(payableTaxCountry), [payableTaxCountry]);
  const payableDefaultTaxProfile = getDefaultBudgetTaxProfile(payableTaxCountry) ?? payableTaxProfiles[0];
  const payableTaxProfile = payableTaxProfiles.find(profile => profile.id === payableTaxProfileId)
    ?? payableDefaultTaxProfile;
  const payableTaxPercent = payableTaxProfile?.manualRate
    ? Math.max(0, number(payableManualTaxPercent))
    : Number(taxRateToPercentInput(payableTaxProfile?.rate ?? 0));
  const payableTaxLabel = payableTaxProfile?.manualRate
    ? `${payableTaxProfile.shortName} ${payableTaxPercent}%`
    : payableTaxProfile?.shortName ?? 'Sin impuesto';
  const taxes = taxEnabled ? roundMoney(subtotal * (payableTaxPercent / 100)) : 0;
  const total = roundMoney(subtotal + taxes);
  const today = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date());

  const reset = () => {
    setConcept('');
    setReference('');
    setAmount('');
    setCurrencyCode('MXN');
    setTaxEnabled(false);
    setPayableTaxProfileId(getDefaultBudgetTaxProfile('MX')?.id ?? '');
    setPayableManualTaxPercent('');
    setDueDate('');
    setDescription('');
    setContactName(text(provider.contact_name));
    setContactEmail(text(provider.email));
    setEvidenceFile(null);
    setPendingPayableId(null);
    setValidationMessages([]);
  };

  const changePayableCurrency = (value: string) => {
    const profile = getDefaultBudgetTaxProfile(inferTaxCountryFromCurrency(value));
    setCurrencyCode(value);
    setPayableTaxProfileId(profile?.id ?? '');
    setPayableManualTaxPercent('');
    setValidationMessages([]);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const messages: string[] = [];
    if (!concept.trim()) messages.push('Escribe el concepto de la cuenta.');
    if (subtotal <= 0) messages.push('El monto debe ser mayor que cero.');
    if (taxEnabled && payableTaxProfile?.manualRate
        && (!payableManualTaxPercent.trim() || !Number.isFinite(Number(payableManualTaxPercent))
          || Number(payableManualTaxPercent) < 0 || Number(payableManualTaxPercent) > 100)) {
      messages.push('La tasa especial debe estar entre 0% y 100%.');
    }
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
              <Field label="Moneda de la operación *"><TransactionCurrencySelect value={currencyCode} onChange={changePayableCurrency} /></Field>
              <Field label="Impuesto de la operación"><select value={payableTaxProfile?.id ?? ''} onChange={event => { setPayableTaxProfileId(event.target.value); setPayableManualTaxPercent(''); setValidationMessages([]); }} className={inputClass}>{payableTaxProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></Field>
              <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${taxEnabled ? 'border-[#147514]/40 bg-[#147514]/10 text-[#147514]' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'}`}><input type="checkbox" checked={taxEnabled} onChange={event => { setTaxEnabled(event.target.checked); setValidationMessages([]); }} className="h-5 w-5 rounded border-slate-300 text-[#147514] focus:ring-[#147514]" /><span><span className="block text-sm font-semibold">Aplicar {payableTaxLabel}</span><span className="mt-0.5 block text-xs opacity-75">Se calcula sobre el monto antes de impuestos</span></span></label>
              {payableTaxProfile?.manualRate ? <Field label="Tasa especial %"><input type="number" min="0" max="100" step="0.001" value={payableManualTaxPercent} onChange={event => { setPayableManualTaxPercent(event.target.value); setValidationMessages([]); }} className={inputClass} placeholder="Ej. 8.25" /></Field> : <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"><p className="text-xs text-slate-500">Impuesto calculado</p><p className="mt-1 text-base font-medium text-slate-900 dark:text-white">{money(taxes, currencyCode)}</p></div>}
              {payableTaxProfile?.manualRate ? <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"><p className="text-xs text-slate-500">Impuesto calculado</p><p className="mt-1 text-base font-medium text-slate-900 dark:text-white">{money(taxes, currencyCode)}</p></div> : null}
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

function ProviderPayablesWorkspace(props: ProviderWorkspaceProps) {
  const bootstrap = props.workspace.bootstrap ?? {};
  const provider = bootstrap.provider ?? {};
  const payables = rows(bootstrap.payables);
  const [createOpen, setCreateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [concept, setConcept] = useState('');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [currencyCode, setCurrencyCode] = useState('MXN');
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [payableTaxProfileId, setPayableTaxProfileId] = useState(() => getDefaultBudgetTaxProfile('MX')?.id ?? '');
  const [payableManualTaxPercent, setPayableManualTaxPercent] = useState('');
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
  const payableTaxCountry = inferTaxCountryFromCurrency(currencyCode);
  const payableTaxProfiles = useMemo(() => getBudgetTaxProfiles(payableTaxCountry), [payableTaxCountry]);
  const payableDefaultTaxProfile = getDefaultBudgetTaxProfile(payableTaxCountry) ?? payableTaxProfiles[0];
  const payableTaxProfile = payableTaxProfiles.find(profile => profile.id === payableTaxProfileId)
    ?? payableDefaultTaxProfile;
  const payableTaxPercent = payableTaxProfile?.manualRate
    ? Math.max(0, number(payableManualTaxPercent))
    : Number(taxRateToPercentInput(payableTaxProfile?.rate ?? 0));
  const payableTaxLabel = payableTaxProfile?.manualRate
    ? `${payableTaxProfile.shortName} ${payableTaxPercent}%`
    : payableTaxProfile?.shortName ?? 'Sin impuesto';
  const taxes = taxEnabled ? roundMoney(subtotal * (payableTaxPercent / 100)) : 0;
  const total = roundMoney(subtotal + taxes);
  const today = new Intl.DateTimeFormat(documentLocale(), { dateStyle: 'medium' }).format(new Date());
  const normalizedSearch = normalizeCatalogText(search);
  const visiblePayables = !normalizedSearch ? payables : payables.filter(item => normalizeCatalogText([
    item.folio,
    item.concept,
    item.external_reference,
    item.payment_status,
  ].map(text).join(' ')).includes(normalizedSearch));

  const reset = () => {
    setConcept('');
    setReference('');
    setAmount('');
    setCurrencyCode('MXN');
    setTaxEnabled(false);
    setPayableTaxProfileId(getDefaultBudgetTaxProfile('MX')?.id ?? '');
    setPayableManualTaxPercent('');
    setDueDate('');
    setDescription('');
    setContactName(text(provider.contact_name));
    setContactEmail(text(provider.email));
    setEvidenceFile(null);
    setPendingPayableId(null);
    setValidationMessages([]);
  };
  const closeCreate = () => {
    if (busy) return;
    if (!pendingPayableId) reset();
    setCreateOpen(false);
  };
  const changePayableCurrency = (value: string) => {
    const profile = getDefaultBudgetTaxProfile(inferTaxCountryFromCurrency(value));
    setCurrencyCode(value);
    setPayableTaxProfileId(profile?.id ?? '');
    setPayableManualTaxPercent('');
    setValidationMessages([]);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const messages: string[] = [];
    if (!concept.trim()) messages.push('Escribe el concepto de la cuenta.');
    if (subtotal <= 0) messages.push('El monto debe ser mayor que cero.');
    if (taxEnabled && payableTaxProfile?.manualRate
        && (!payableManualTaxPercent.trim() || !Number.isFinite(Number(payableManualTaxPercent))
          || Number(payableManualTaxPercent) < 0 || Number(payableManualTaxPercent) > 100)) {
      messages.push('La tasa especial debe estar entre 0% y 100%.');
    }
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
        if (!expenseId) throw new ProviderUiError('La cuenta fue creada, pero no pudimos confirmar su registro. Actualiza el historial antes de intentar de nuevo.');
        setPendingPayableId(expenseId);
      }
      if (evidenceFile) {
        if (!canUpload) throw new ProviderUiError('La carga de comprobantes no está disponible.');
        await uploadProviderDocument(props, evidenceFile, 'payable', expenseId);
      }
    }, 'Cuenta enviada directamente a Gastos para revisión.');
    if (completed) {
      reset();
      setCreateOpen(false);
    }
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
    }, 'Cambio enviado a Finanzas para revisión.')) {
      form.reset();
      setProfileOpen(false);
    }
  };

  return <WorkspaceFrame onRefresh={props.onRefresh} title="Cuentas por pagar">
    <ProviderAppHeader
      action={<div className="flex flex-1 gap-2 sm:flex-none"><button type="button" onClick={() => setProfileOpen(true)} className="min-h-12 flex-1 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-medium text-[#147514] sm:flex-none dark:border-emerald-900 dark:bg-slate-950 dark:text-emerald-300">Mi empresa</button><button type="button" onClick={() => setCreateOpen(true)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#147514] px-4 text-sm font-medium text-white sm:flex-none"><Plus className="h-4 w-4" />Nueva cuenta</button></div>}
      description="Envía servicios o compras sin orden directamente a Gastos y consulta su saldo."
      icon={<ReceiptText className="h-5 w-5" />}
      onRefresh={props.onRefresh}
      title="Cuentas por pagar"
      tone="green"
    />
    {!createOpen && !profileOpen ? notices : null}
    <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="text-lg font-medium text-slate-950 dark:text-white">Cuentas enviadas</h3><p className="mt-1 text-sm text-slate-500">Revisa el estado, lo pagado y el saldo de cada cuenta.</p></div>
        <label className="relative block w-full sm:max-w-xs"><span className="sr-only">Buscar cuenta</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Folio, concepto o referencia" className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#147514] focus:ring-4 focus:ring-[#147514]/10 dark:border-slate-700 dark:bg-slate-950" /></label>
      </div>
      <div className="mt-4 space-y-3">{visiblePayables.length ? visiblePayables.map(item => <article key={id(item.id)} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-base font-medium text-slate-950 dark:text-white">{text(item.folio)}</p><Status value={item.payment_status} /></div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{text(item.concept)}</p><p className="mt-1 text-xs text-slate-500">Vence {date(item.due_date)}</p></div><p className="text-lg font-medium text-slate-950 dark:text-white">{money(item.total_amount, item.currency_code)}</p></div>
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-xs dark:bg-slate-900"><span className="text-slate-500">Total<strong className="mt-1 block text-sm font-medium text-slate-950 dark:text-white">{money(item.total_amount, item.currency_code)}</strong></span><span className="text-slate-500">Pagado<strong className="mt-1 block text-sm font-medium text-emerald-700 dark:text-emerald-300">{money(item.paid_amount, item.currency_code)}</strong></span><span className="text-slate-500">Saldo<strong className="mt-1 block text-sm font-medium text-slate-950 dark:text-white">{money(item.balance_amount, item.currency_code)}</strong></span></div>
      </article>) : <Empty>{payables.length ? 'No encontramos cuentas con esa búsqueda.' : 'Aún no hay cuentas por pagar enviadas. Usa Nueva cuenta cuando hayas prestado un servicio sin orden de compra.'}</Empty>}</div>
    </section>

    <KioskModalFrame
      open={createOpen}
      contentClassName="[&>button.absolute]:!h-12 [&>button.absolute]:!w-12"
      onOpenChange={open => { if (!open) closeCreate(); else setCreateOpen(true); }}
      busy={busy}
      size="form"
      surface="public"
      tone="green"
      icon={<Landmark className="h-5 w-5" />}
      title="Crear cuenta por pagar"
      description="Úsala cuando no existe una orden de compra. Gastos revisará la cuenta antes de pagarla."
      footerSummary={`${money(total, currencyCode)} · ${dueDate ? `Vence ${date(dueDate)}` : 'Sin vencimiento'}`}
      footer={<><button type="button" disabled={busy} onClick={closeCreate} className="min-h-12 rounded-xl border border-white/35 bg-white/10 px-4 text-sm font-medium">Cancelar</button><button type="submit" form="provider-payable-form" disabled={busy || subtotal <= 0 || !concept.trim() || !dueDate} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#147514] disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{pendingPayableId ? 'Reintentar comprobante' : 'Enviar a Gastos'}</button></>}
    >
      <form id="provider-payable-form" className="space-y-5" onSubmit={submit}>
        {notices}
        {validationMessages.length ? <IndiceModalValidation messages={validationMessages} tone="error" /> : null}
        <fieldset disabled={Boolean(pendingPayableId)} className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div><h3 className="text-base font-medium text-slate-950 dark:text-white">Datos principales</h3><p className="mt-1 text-sm text-slate-500">El proveedor ya está identificado por su sesión.</p></div>
            <div className="mt-4 grid gap-4">
              <Field label="Proveedor"><div className={`${inputClass} flex items-center bg-slate-50 font-medium dark:bg-slate-950`}>{text(provider.name)}</div></Field>
              <Field label="Factura o referencia"><input value={reference} onChange={event => setReference(event.target.value)} maxLength={120} placeholder="Ej. FAC-1048" className={inputClass} /></Field>
              <Field label="Concepto *"><input autoFocus required value={concept} onChange={event => setConcept(event.target.value)} maxLength={220} placeholder="Servicio, insumo o compra pendiente" className={inputClass} /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Fecha de registro"><div className={`${inputClass} flex items-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-300`}>{today}</div></Field><Field label="Fecha de vencimiento *"><input required type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} className={inputClass} /></Field><Field label="Monto antes de impuestos *"><input required min="0.01" step="0.01" type="number" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" className={inputClass} /></Field><Field label="Moneda de la operación *"><TransactionCurrencySelect value={currencyCode} onChange={changePayableCurrency} /></Field></div>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-base font-medium text-slate-950 dark:text-white">Impuesto y total</h3>
            <div className="mt-4 space-y-4"><Field label="Impuesto de la operación"><select value={payableTaxProfile?.id ?? ''} onChange={event => { setPayableTaxProfileId(event.target.value); setPayableManualTaxPercent(''); setValidationMessages([]); }} className={inputClass}>{payableTaxProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></Field><label className={cn('flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition', taxEnabled ? providerToneStyles.green.soft : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200')}><input type="checkbox" checked={taxEnabled} onChange={event => { setTaxEnabled(event.target.checked); setValidationMessages([]); }} className="h-5 w-5 rounded border-slate-300 text-[#147514] focus:ring-[#147514]" /><span><span className="block text-sm font-medium">Aplicar {payableTaxLabel}</span><span className="mt-0.5 block text-xs opacity-75">Se calcula sobre el monto antes de impuestos</span></span></label>{payableTaxProfile?.manualRate ? <Field label="Tasa especial %"><input type="number" min="0" max="100" step="0.001" value={payableManualTaxPercent} onChange={event => { setPayableManualTaxPercent(event.target.value); setValidationMessages([]); }} className={inputClass} placeholder="Ej. 8.25" /></Field> : null}<div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs text-slate-500">Impuesto</p><p className="mt-1 text-base font-medium">{money(taxes, currencyCode)}</p></div><div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/25"><p className="text-xs text-slate-500">Total</p><p className="mt-1 text-lg font-medium text-[#147514] dark:text-emerald-300">{money(total, currencyCode)}</p></div></div></div>
          </section>
        </fieldset>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><h3 className="text-base font-medium text-slate-950 dark:text-white">Evidencia y contacto</h3><div className="mt-4"><ProviderAttachmentPicker canUpload={canUpload} file={evidenceFile} maximumMegabytes={10} onChange={setEvidenceFile} tone="green" /></div><div className="mt-4 grid gap-4"><Field label="Persona que realiza el envío *"><input required value={contactName} onChange={event => setContactName(event.target.value)} maxLength={180} className={inputClass} /></Field><Field label="Correo de contacto *"><input required type="email" value={contactEmail} onChange={event => setContactEmail(event.target.value)} maxLength={180} className={inputClass} /></Field><Field label="Descripción o instrucciones"><textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={4000} rows={3} className={`${inputClass} h-auto`} /></Field></div></section>
        {pendingPayableId ? <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">La cuenta ya está en Gastos. Los datos quedan bloqueados y reintentaremos únicamente el documento para evitar duplicados.</p> : null}
      </form>
    </KioskModalFrame>

    <KioskModalFrame
      open={profileOpen}
      contentClassName="[&>button.absolute]:!h-12 [&>button.absolute]:!w-12"
      onOpenChange={setProfileOpen}
      busy={busy}
      size="form"
      surface="public"
      tone="aqua"
      icon={<ShieldCheck className="h-5 w-5" />}
      title="Mi empresa"
      description="Solicita un cambio fiscal o bancario. Finanzas lo revisará antes de aplicarlo."
      footer={<><button type="button" disabled={busy} onClick={() => setProfileOpen(false)} className="min-h-12 rounded-xl border border-white/35 bg-white/10 px-4 text-sm font-medium">Cancelar</button><button type="submit" form="provider-profile-form" disabled={busy} className="min-h-12 rounded-xl bg-white px-4 text-sm font-medium text-[#177D66] disabled:opacity-50">Enviar para revisión</button></>}
    >
      <form id="provider-profile-form" className="grid gap-4" onSubmit={submitProfileChange}>
        {notices}
        <Field label="Tipo de dato *"><select required name="category" value={profileCategory} onChange={event => setProfileCategory(event.target.value)} className={inputClass}><option value="FISCAL">Fiscal</option><option value="BANKING">Bancario</option></select></Field>
        <Field label="Campo *"><select key={profileCategory} required name="field" className={inputClass}>{profileCategory === 'FISCAL' ? <><option value="legal_name">Razón social</option><option value="tax_id">RFC / ID fiscal</option><option value="fiscal_address">Domicilio fiscal</option><option value="tax_regime">Régimen fiscal</option></> : <><option value="bank_name">Banco</option><option value="account_holder">Titular</option><option value="account_number">Cuenta</option><option value="clabe">CLABE</option><option value="swift">SWIFT</option><option value="currency_code">Moneda</option></>}</select></Field>
        <Field label="Nuevo valor *"><input required name="value" maxLength={500} className={inputClass} /></Field>
        <ContactFields provider={provider} />
      </form>
    </KioskModalFrame>
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
  const [view, setView] = useState<'all' | 'products' | 'services' | 'evidence'>('all');
  const [search, setSearch] = useState('');
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
  const paymentEvidenceRows: Row[] = [...payables, ...purchaseOrderPayments].flatMap(payable => rows(payable.payment_evidence)
    .map(evidence => ({ ...evidence, folio: payable.document_reference || payable.folio, currency_code: payable.currency_code } as Row)));
  const normalizedSearch = normalizeCatalogText(search);
  const matches = (item: Row) => !normalizedSearch || normalizeCatalogText([
    item.folio,
    item.submission_number,
    item.invoice_number,
    item.document_reference,
    item.concept,
    item.status,
    item.payment_status,
  ].map(text).join(' ')).includes(normalizedSearch);
  const visibleOrders = orders.filter(matches);
  const visiblePayables = payables.filter(matches);
  const orderIds = new Set(orders.map(order => id(order.id)));
  const unlinkedSubmissions = submissions.filter(submission => {
    const orderId = id(submission.purchase_order_id || submission.converted_purchase_order_id);
    return !orderId || !orderIds.has(orderId);
  }).filter(matches);

  const step = (label: string, state: 'complete' | 'current' | 'pending', detail?: string) => <li className="relative flex min-h-12 gap-3 pb-3 last:pb-0">
    <span className={cn('relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border', state === 'complete' ? 'border-[#177D66] bg-[#177D66] text-white' : state === 'current' ? 'border-[#177D66] bg-[#59C3A5]/20 text-[#177D66] dark:text-emerald-200' : 'border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-950')}>
      {state === 'complete' ? <Check className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
    </span>
    <span className="min-w-0 pt-0.5"><span className={cn('block text-sm font-medium', state === 'pending' ? 'text-slate-400' : 'text-slate-900 dark:text-white')}>{label}</span>{detail ? <span className="mt-0.5 block text-xs leading-5 text-slate-500">{detail}</span> : null}</span>
  </li>;

  const productJourney = (order: Row) => {
    const orderId = id(order.id);
    const invoice = invoices.find(item => id(item.purchase_order_id) === orderId || text(item.purchase_order_folio) === text(order.folio));
    const payment = invoice ? purchaseOrderPaymentByInvoice.get(id(invoice.id)) : purchaseOrderPayments.find(item => id(item.purchase_order_id) === orderId);
    const orderStatus = text(order.status).toUpperCase();
    const receiptStarted = ['PARTIALLY_RECEIVED', 'RECEIVED'].includes(orderStatus);
    const receiptComplete = orderStatus === 'RECEIVED';
    const paid = text(payment?.payment_status).toUpperCase() === 'PAID';
    const partiallyPaid = text(payment?.payment_status).toUpperCase() === 'PARTIALLY_PAID';
    const nextStep = !['CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(orderStatus)
      ? 'Confirma la orden o solicita un ajuste.'
      : !receiptComplete ? 'La empresa debe registrar la recepción de mercancía.'
        : !invoice ? 'Ya puedes enviar la factura de esta orden.'
          : !paid ? 'Finanzas está gestionando el pago.' : 'Proceso completado.';
    return <article key={orderId} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-[#B63B32] dark:bg-rose-950/30 dark:text-rose-300">Productos</span><Status value={paid ? 'PAID' : invoice?.payment_status || payment?.payment_status || order.status} /></div><h3 className="mt-2 text-base font-medium text-slate-950 dark:text-white">Orden {text(order.folio)}</h3><p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{nextStep}</p></div>
        <div className="text-left sm:text-right"><p className="text-lg font-medium text-slate-950 dark:text-white">{money(order.total_amount, order.currency_code)}</p><p className="mt-1 text-xs text-slate-500">Entrega {date(order.expected_date)}</p></div>
      </div>
      <ol className="relative p-4 [&>li:not(:last-child)>span:first-child]:after:absolute [&>li:not(:last-child)>span:first-child]:after:left-1/2 [&>li:not(:last-child)>span:first-child]:after:top-7 [&>li:not(:last-child)>span:first-child]:after:h-6 [&>li:not(:last-child)>span:first-child]:after:w-px [&>li:not(:last-child)>span:first-child]:after:-translate-x-1/2 [&>li:not(:last-child)>span:first-child]:after:bg-slate-200 dark:[&>li:not(:last-child)>span:first-child]:after:bg-slate-700">
        {step('Orden recibida', 'complete', text(order.folio))}
        {step(receiptComplete ? 'Mercancía recibida' : receiptStarted ? 'Recepción parcial' : 'Recepción de mercancía', receiptComplete ? 'complete' : receiptStarted ? 'current' : 'pending', text(order.warehouse_name))}
        {step('Factura enviada', invoice ? 'complete' : receiptComplete ? 'current' : 'pending', invoice ? text(invoice.invoice_number) : undefined)}
        {step(partiallyPaid ? 'Pago parcial' : 'Pago', paid ? 'complete' : invoice ? 'current' : 'pending', payment ? `${money(payment.paid_amount || payment.payment_amount, payment.currency_code || order.currency_code)} informado` : undefined)}
        {step('Comprobante disponible', paid && rows(payment?.payment_evidence).length ? 'complete' : paid ? 'current' : 'pending')}
      </ol>
    </article>;
  };

  const serviceJourney = (payable: Row) => {
    const paymentStatus = text(payable.payment_status).toUpperCase();
    const status = text(payable.status).toUpperCase();
    const paid = paymentStatus === 'PAID';
    const partial = paymentStatus === 'PARTIALLY_PAID';
    const inReview = ['SUBMITTED', 'IN_REVIEW', 'APPROVED'].includes(status);
    const nextStep = paid ? 'Proceso completado.' : partial ? 'Finanzas continuará con el saldo pendiente.' : 'Finanzas está revisando o programando el pago.';
    return <article key={id(payable.id || payable.expense_id)} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-[#147514] dark:bg-emerald-950/30 dark:text-emerald-300">Servicio</span><Status value={payable.payment_status || payable.status} /></div><h3 className="mt-2 text-base font-medium text-slate-950 dark:text-white">{text(payable.folio || payable.document_reference)}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{text(payable.concept)}</p><p className="mt-1 text-sm leading-5 text-slate-500">{nextStep}</p></div><div className="text-left sm:text-right"><p className="text-lg font-medium text-slate-950 dark:text-white">{money(payable.total_amount, payable.currency_code)}</p><p className="mt-1 text-xs text-slate-500">Vence {date(payable.due_date)}</p></div></div>
      <ol className="relative p-4 [&>li:not(:last-child)>span:first-child]:after:absolute [&>li:not(:last-child)>span:first-child]:after:left-1/2 [&>li:not(:last-child)>span:first-child]:after:top-7 [&>li:not(:last-child)>span:first-child]:after:h-6 [&>li:not(:last-child)>span:first-child]:after:w-px [&>li:not(:last-child)>span:first-child]:after:-translate-x-1/2 [&>li:not(:last-child)>span:first-child]:after:bg-slate-200 dark:[&>li:not(:last-child)>span:first-child]:after:bg-slate-700">
        {step('Cuenta enviada', 'complete')}
        {step('Revisión de Finanzas', inReview || paid || partial ? 'complete' : 'current')}
        {step(partial ? 'Pago parcial' : 'Pago', paid ? 'complete' : partial ? 'current' : 'pending', `Saldo ${money(payable.balance_amount, payable.currency_code)}`)}
        {step('Comprobante disponible', paid && rows(payable.payment_evidence).length ? 'complete' : paid ? 'current' : 'pending')}
      </ol>
    </article>;
  };

  const showProducts = view === 'all' || view === 'products';
  const showServices = view === 'all' || view === 'services';
  return <WorkspaceFrame onRefresh={props.onRefresh} title="Seguimiento y pagos">
    <ProviderAppHeader description="Sigue cada operación desde su origen hasta el pago y abre los comprobantes disponibles." icon={<CircleDollarSign className="h-5 w-5" />} onRefresh={props.onRefresh} title="Seguimiento y pagos" tone="aqua" />
    <div className="rounded-2xl border border-[#59C3A5]/40 bg-[#59C3A5]/10 p-4 text-sm leading-6 text-slate-700 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-slate-200"><span className="font-medium text-[#177D66] dark:text-emerald-300">Tu información está protegida.</span> Aquí solo aparecen fechas, importes, referencias, saldos y comprobantes autorizados.</div>
    <ProviderWorkspaceTabs active={view} onChange={value => setView(value as typeof view)} tone="aqua" tabs={[
      { id: 'all', label: 'Todo', count: orders.length + payables.length + unlinkedSubmissions.length },
      { id: 'products', label: 'Productos', count: orders.length + unlinkedSubmissions.length },
      { id: 'services', label: 'Servicios', count: payables.length },
      { id: 'evidence', label: 'Comprobantes', count: paymentEvidenceRows.length },
    ]} />
    <label className="relative block"><span className="sr-only">Buscar seguimiento</span><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar folio, factura, concepto o estado" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-[#177D66] focus:ring-4 focus:ring-[#177D66]/10 dark:border-slate-700 dark:bg-slate-950" /></label>

    {view !== 'evidence' ? <div className="space-y-4">
      {showProducts && visibleOrders.map(productJourney)}
      {showProducts && unlinkedSubmissions.map(submission => <article key={id(submission.id)} className="flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-[#B63B32] dark:bg-rose-950/30 dark:text-rose-300">Propuesta</span><Status value={submission.status} /></div><h3 className="mt-2 text-base font-medium text-slate-950 dark:text-white">{text(submission.submission_number)}</h3><p className="mt-1 text-sm text-slate-500">Compras debe revisar o convertir esta propuesta antes de que continúe.</p></div><p className="text-lg font-medium text-slate-950 dark:text-white">{money(submission.total_amount, submission.currency_code)}</p></article>)}
      {showServices && visiblePayables.map(serviceJourney)}
      {((showProducts && !visibleOrders.length && !unlinkedSubmissions.length) && (showServices && !visiblePayables.length)) || (view === 'products' && !visibleOrders.length && !unlinkedSubmissions.length) || (view === 'services' && !visiblePayables.length) ? <Empty>No encontramos operaciones con los filtros actuales.</Empty> : null}
    </div> : null}

    {view === 'evidence' ? <Panel tone="aqua" icon={<File className="h-5 w-5" />} title="Comprobantes de pago" subtitle="Abre únicamente los documentos compartidos por Finanzas."><div className="space-y-3">{paymentEvidenceRows.length ? paymentEvidenceRows.filter(matches).map((evidence, index) => <div key={`${text(evidence.attachment_id)}-${index}`} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{text(evidence.file_name)}</p><p className="mt-1 text-xs leading-5 text-slate-500">{text(evidence.folio)} · {date(evidence.payment_date)} · {money(evidence.payment_amount, evidence.currency_code)}</p></div>{text(evidence.download_url) ? <a href={text(evidence.download_url)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white outline-none focus-visible:ring-4 focus-visible:ring-[#177D66]/20">Ver comprobante</a> : <span className="text-sm text-slate-500">No disponible</span>}</div>) : <Empty>Aún no hay comprobantes compartidos.</Empty>}</div></Panel> : null}
    <span className="sr-only">{documents.length} documentos y {paymentRows.length} pagos informados.</span>
  </WorkspaceFrame>;
}

export function ProviderCenterMultiKioskWorkspace(props: ProviderWorkspaceProps) {
  const kind = text(props.workspace.kiosk.workspace_kind).toUpperCase();
  if (kind === 'PROVIDER_PROPOSALS') return <PurchaseProposalWorkspace {...props} />;
  if (kind === 'PROVIDER_ORDERS_INVOICES') return <OrdersWorkspace {...props} />;
  if (kind === 'PROVIDER_PAYABLES') return <ProviderPayablesWorkspace {...props} />;
  return <TrackingWorkspace {...props} />;
}
