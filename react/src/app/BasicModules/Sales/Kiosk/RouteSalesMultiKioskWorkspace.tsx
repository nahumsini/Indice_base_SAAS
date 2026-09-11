import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Banknote,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  FileText,
  Landmark,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingBag,
  Smartphone,
  Trash2,
  Upload,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { KioskModalFrame } from '../../../components/kiosk-engine/KioskModalFrame';
import {
  KioskFileDropzone,
  KioskStickyActionBar,
  KioskToolWorkspaceFrame,
  KioskWorkflowStepper,
  KioskWorkspaceChoiceCard,
  KioskWorkspaceContextBar,
  KioskWorkspaceFieldStatus,
  KioskWorkspaceNotice,
  KioskWorkspaceSectionHeader,
  KioskWorkspaceSurface,
} from '../../../components/kiosk-engine/KioskToolWorkspace';
import { KioskWorkspaceTabs } from '../../../components/kiosk-engine/KioskWorkspacePrimitives';
import {
  multiKioskPublicApi,
  type MultiKioskChildWorkspace,
  type RouteSalesKioskBootstrap,
  type RouteSalesKioskContact,
  type RouteSalesKioskProduct,
  type RouteSalesKioskSale,
} from '../../../api/multiKiosks';
import {
  uploadPresignedKioskFile,
  type KioskPresignedUpload,
} from '../../../KioskCenter/multiKioskWorkspaceUploads';
import { fiscalCountryOptions, fallbackFiscalCountry } from '../Contactos/constants/contactConstants';
import { RouteSalesProductPicker } from './components/RouteSalesProductPicker';

const capabilities = {
  contactCreate: 'sales.route.contact.create@1',
  saleCreate: 'sales.route.sale.create@1',
  evidencePresign: 'sales.route.payment-evidence.presign@1',
  evidenceRegister: 'sales.route.payment-evidence.register@1',
} as const;

type WorkspaceTab = 'sell' | 'sales' | 'customers';
type SaleStep = 1 | 2 | 3 | 4;
type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit';

const fallbackPaymentMethods: RouteSalesKioskBootstrap['payment_methods'] = [
  { id: 'cash', label: 'Efectivo', description: 'Bajo tu custodia hasta entregarlo.' },
  { id: 'card', label: 'Tarjeta', description: 'Ingresa a la cuenta que selecciones.' },
  { id: 'transfer', label: 'Transferencia', description: 'Ingresa a la cuenta que selecciones.' },
  { id: 'credit', label: 'Crédito', description: 'Pendiente de cobranza.' },
];

interface RouteSalesMultiKioskWorkspaceProps {
  token: string;
  kioskId: number;
  workspace: MultiKioskChildWorkspace;
  locale: string;
  onAuthorizationFailure: (error: unknown) => boolean;
  onRefresh: () => Promise<void>;
}

interface ContactDraft {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  fiscal: ContactFiscalDraft;
}

interface ContactFiscalDraft {
  country: string;
  legalName: string;
  taxId: string;
  registryId: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  email: string;
  regime: string;
  cfdiUse: string;
  notes: string;
}

interface CreatedSaleResponse {
  sale: RouteSalesKioskSale;
  settlement_status: string;
  message: string;
}

type PresignResponse = KioskPresignedUpload & {
  objectKey?: string;
  uploadUrl?: string;
  uploadHeaders?: Record<string, string>;
};

type EvidenceStatus = 'idle' | 'uploading' | 'uploaded' | 'failed';

const maximumEvidenceBytes = 15 * 1024 * 1024;
const supportedEvidenceTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

const emptyFiscalProfile: ContactFiscalDraft = {
  country: fallbackFiscalCountry.value,
  legalName: '',
  taxId: '',
  registryId: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  email: '',
  regime: '',
  cfdiUse: '',
  notes: '',
};

const emptyContact: ContactDraft = {
  companyName: '',
  contactPerson: '',
  phone: '',
  email: '',
  fiscal: emptyFiscalProfile,
};

const contactInputClassName = 'mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#E85D52] focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-rose-950';

function csrfFor(token: string) {
  try {
    return sessionStorage.getItem(`indice.multi-kiosk.${token}.csrf`) ?? '';
  } catch {
    return '';
  }
}

function safeError(error: unknown, fallback: string) {
  if (!(error instanceof Error) || !error.message.trim()) return fallback;
  return /internal server|status\s*500|unexpected server|idempotency-key/i.test(error.message)
    ? fallback
    : error.message;
}

function money(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale || 'es-MX', {
    currency: currency || 'MXN',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(Number.isFinite(value) ? value : 0);
}

function dateLabel(value: string, locale: string) {
  if (!value) return '—';
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(locale || 'es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusLabel(value: string) {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'approved' || normalized === 'completed' || normalized === 'delivered') return 'Listo';
  if (normalized === 'not_required') return 'No aplica';
  if (normalized === 'rejected') return 'Requiere atención';
  return 'Pendiente';
}

function statusClass(value: string) {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'approved' || normalized === 'completed' || normalized === 'delivered') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
  }
  if (normalized === 'rejected') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200';
  }
  return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
}

function paymentIcon(method: PaymentMethod) {
  if (method === 'cash') return Banknote;
  if (method === 'card') return CreditCard;
  if (method === 'transfer') return Smartphone;
  return CircleDollarSign;
}

function evidenceContentType(file: File) {
  if (file.type) return file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();
  return ({
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  } as Record<string, string>)[extension ?? ''] ?? 'application/octet-stream';
}

export function RouteSalesMultiKioskWorkspace({
  token,
  kioskId,
  workspace,
  locale,
  onAuthorizationFailure,
  onRefresh,
}: RouteSalesMultiKioskWorkspaceProps) {
  const bootstrap = workspace.bootstrap;
  const seller = bootstrap?.seller;
  const products = bootstrap?.products ?? [];
  const warehouses = bootstrap?.warehouses ?? [];
  const balances = bootstrap?.inventory_balances ?? [];
  const paymentAccounts = bootstrap?.payment_accounts ?? [];
  const recentSales = bootstrap?.recent_sales ?? [];
  const paymentMethods = bootstrap?.payment_methods ?? [];
  const availablePaymentMethods = paymentMethods.length ? paymentMethods : fallbackPaymentMethods;
  const routeSummary = bootstrap?.summary as RouteSalesKioskBootstrap['summary'] | undefined;
  const [contacts, setContacts] = useState<RouteSalesKioskContact[]>(bootstrap?.contacts ?? []);
  const [tab, setTab] = useState<WorkspaceTab>('sell');
  const [step, setStep] = useState<SaleStep>(1);
  const [contactId, setContactId] = useState<number | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | null>(warehouses[0]?.id ?? null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState<number | null>(null);
  const [deliveredNow, setDeliveredNow] = useState(true);
  const [notes, setNotes] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceStatus, setEvidenceStatus] = useState<EvidenceStatus>('idle');
  const [query, setQuery] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [showNewContact, setShowNewContact] = useState(false);
  const [contactDraft, setContactDraft] = useState<ContactDraft>(emptyContact);
  const [busy, setBusy] = useState<'contact' | 'sale' | 'evidence' | 'refresh' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdSale, setCreatedSale] = useState<RouteSalesKioskSale | null>(null);
  const contactInFlightRef = useRef(false);
  const saleInFlightRef = useRef(false);
  const evidenceInFlightRef = useRef(false);

  useEffect(() => setContacts(bootstrap?.contacts ?? []), [bootstrap?.contacts]);
  useEffect(() => {
    if (!warehouseId && warehouses[0]) setWarehouseId(warehouses[0].id);
  }, [warehouseId, warehouses]);

  const selectedContact = contacts.find(contact => contact.id === contactId);
  const selectedCurrency = Object.entries(quantities)
    .find(([, quantity]) => quantity > 0)
    ? products.find(product => product.id === Number(Object.entries(quantities).find(([, quantity]) => quantity > 0)?.[0]))?.currency ?? ''
    : '';
  const cartLines = useMemo(() => products.flatMap(product => {
    const quantity = quantities[product.id] ?? 0;
    if (quantity <= 0) return [];
    const subtotal = quantity * Number(product.price || 0);
    const tax = subtotal * Number(product.tax_percent || 0) / 100;
    return [{ product, quantity, subtotal, tax, total: subtotal + tax }];
  }), [products, quantities]);
  const subtotal = cartLines.reduce((sum, line) => sum + line.subtotal, 0);
  const taxTotal = cartLines.reduce((sum, line) => sum + line.tax, 0);
  const total = subtotal + taxTotal;
  const selectedUnits = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const currency = cartLines[0]?.product.currency ?? products[0]?.currency ?? 'MXN';
  const selectedWarehouse = warehouses.find(warehouse => warehouse.id === warehouseId);
  const electronicPayment = paymentMethod === 'card' || paymentMethod === 'transfer';
  const eligiblePaymentAccounts = useMemo(() => paymentAccounts.filter(account => {
    if (account.currency !== currency) return false;
    const businessId = selectedWarehouse?.business_id ?? bootstrap?.scope?.business_id;
    const unitId = selectedWarehouse?.unit_id ?? bootstrap?.scope?.unit_id;
    if (account.business_id != null) return businessId != null && String(account.business_id) === String(businessId);
    if (account.unit_id != null) return unitId != null && String(account.unit_id) === String(unitId);
    return true;
  }), [bootstrap?.scope?.business_id, bootstrap?.scope?.unit_id, currency, paymentAccounts, selectedWarehouse]);
  const selectedPaymentAccount = eligiblePaymentAccounts.find(account => account.id === paymentAccountId);
  const selectedPaymentMethod = availablePaymentMethods.find(method => method.id === paymentMethod);
  const canAttachEvidence = workspace.session.capabilities.includes(capabilities.evidencePresign)
    && workspace.session.capabilities.includes(capabilities.evidenceRegister);
  const selectedFiscalCountry = fiscalCountryOptions.find(
    option => option.value === contactDraft.fiscal.country,
  ) ?? fallbackFiscalCountry;
  const fiscalDataCount = Object.entries(contactDraft.fiscal)
    .filter(([field, value]) => field !== 'country' && value.trim()).length;

  const stockFor = (productId: number) => balances.find(
    balance => balance.product_id === productId && balance.warehouse_id === warehouseId,
  )?.available_quantity ?? 0;

  const visibleContacts = contacts.filter(contact => {
    const needle = contactQuery.trim().toLocaleLowerCase();
    return !needle || [contact.name, contact.contact_person, contact.phone, contact.email]
      .some(value => value?.toLocaleLowerCase().includes(needle));
  });

  const setQuantity = (product: RouteSalesKioskProduct, next: number) => {
    setError('');
    const normalized = Math.max(0, Math.floor(next));
    if (normalized > 0 && selectedCurrency && selectedCurrency !== product.currency) {
      setError('Una venta sólo puede contener productos de la misma moneda.');
      return;
    }
    const isService = (product.type || '').toUpperCase() === 'SERVICE';
    const available = stockFor(product.id);
    if (!isService && normalized > available) {
      setError(`Sólo hay ${available} disponibles de ${product.name} en este almacén.`);
      return;
    }
    setQuantities(current => ({ ...current, [product.id]: normalized }));
  };

  const resetSale = () => {
    setContactId(null);
    setWarehouseId(warehouses[0]?.id ?? null);
    setQuantities({});
    setPaymentMethod('cash');
    setPaymentReference('');
    setPaymentAccountId(null);
    setDeliveredNow(true);
    setNotes('');
    setEvidenceFile(null);
    setEvidenceStatus('idle');
    setQuery('');
    setStep(1);
    setCreatedSale(null);
  };

  useEffect(() => {
    if (!electronicPayment) {
      if (paymentAccountId != null) setPaymentAccountId(null);
      return;
    }
    if (paymentAccountId != null && eligiblePaymentAccounts.some(account => account.id === paymentAccountId)) return;
    setPaymentAccountId(eligiblePaymentAccounts.length === 1 ? eligiblePaymentAccounts[0].id : null);
  }, [electronicPayment, eligiblePaymentAccounts, paymentAccountId]);

  const selectEvidence = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    setError('');
    if (!file) return;
    const contentType = evidenceContentType(file);
    if (file.size <= 0 || file.size > maximumEvidenceBytes || !supportedEvidenceTypes.has(contentType)) {
      setError('El comprobante debe ser PDF, JPEG, PNG o WebP y pesar máximo 15 MB.');
      return;
    }
    setEvidenceFile(file);
    setEvidenceStatus('idle');
  };

  const setFiscalField = (field: keyof ContactFiscalDraft, value: string) => {
    setContactDraft(current => ({
      ...current,
      fiscal: { ...current.fiscal, [field]: value },
    }));
  };

  const uploadEvidence = async (saleId: number, file: File) => {
    const contentType = evidenceContentType(file);
    const presigned = await multiKioskPublicApi.action<PresignResponse>(
      token,
      kioskId,
      capabilities.evidencePresign,
      { saleId, fileName: file.name, contentType, sizeBytes: file.size },
      csrfFor(token),
    );
    const upload: KioskPresignedUpload = {
      object_key: presigned.object_key ?? presigned.objectKey ?? '',
      upload_url: presigned.upload_url ?? presigned.uploadUrl ?? '',
      upload_headers: presigned.upload_headers ?? presigned.uploadHeaders,
      expires_at: presigned.expires_at,
    };
    if (!upload.object_key || !upload.upload_url) {
      throw new Error('No fue posible preparar la carga del comprobante.');
    }
    await uploadPresignedKioskFile(upload, file, contentType, { timeoutMs: 30_000 });
    await multiKioskPublicApi.action(
      token,
      kioskId,
      capabilities.evidenceRegister,
      { saleId, objectKey: upload.object_key, fileName: file.name, contentType, sizeBytes: file.size },
      csrfFor(token),
    );
  };

  const advance = () => {
    setError('');
    if (step === 1 && !selectedContact) {
      setError('Selecciona o registra un cliente para continuar.');
      return;
    }
    if (step === 2) {
      if (!warehouseId) {
        setError('Selecciona el almacén desde el que sale la mercancía.');
        return;
      }
      if (!cartLines.length) {
        setError('Agrega al menos un producto a la venta.');
        return;
      }
    }
    if (step === 3 && electronicPayment) {
      if (!paymentReference.trim()) {
        setError('Captura la referencia del cobro para continuar.');
        return;
      }
      if (!selectedPaymentAccount) {
        setError('Selecciona la cuenta bancaria donde se recibió el cobro.');
        return;
      }
    }
    setStep(current => Math.min(4, current + 1) as SaleStep);
  };

  const createContact = async () => {
    if (contactInFlightRef.current) return;
    if (!contactDraft.companyName.trim()) {
      setError('Escribe el nombre del cliente.');
      return;
    }
    contactInFlightRef.current = true;
    setBusy('contact');
    setError('');
    try {
      const response = await multiKioskPublicApi.action<{ contact: RouteSalesKioskContact }>(
        token,
        kioskId,
        capabilities.contactCreate,
        { ...contactDraft },
        csrfFor(token),
      );
      setContacts(current => [response.contact, ...current.filter(item => item.id !== response.contact.id)]);
      setContactId(response.contact.id);
      setContactDraft(emptyContact);
      setShowNewContact(false);
      setSuccess('Cliente guardado y seleccionado.');
      if (tab === 'customers') await onRefresh();
    } catch (caught) {
      if (!onAuthorizationFailure(caught)) setError(safeError(caught, 'No fue posible guardar el cliente.'));
    } finally {
      contactInFlightRef.current = false;
      setBusy(null);
    }
  };

  const createSale = async () => {
    if (saleInFlightRef.current || !contactId || !warehouseId || !cartLines.length) return;
    saleInFlightRef.current = true;
    setBusy('sale');
    setError('');
    setSuccess('');
    try {
      const response = await multiKioskPublicApi.action<CreatedSaleResponse>(
        token,
        kioskId,
        capabilities.saleCreate,
        {
          contactId,
          warehouseId,
          paymentMethod,
          paymentReference: paymentReference.trim() || null,
          paymentAccountId: electronicPayment ? paymentAccountId : null,
          deliveredNow,
          notes: notes.trim() || null,
          items: cartLines.map(line => ({ productId: line.product.id, quantity: line.quantity })),
        },
        csrfFor(token),
      );
      setCreatedSale(response.sale);
      let evidenceFailed = false;
      if (evidenceFile && canAttachEvidence) {
        setEvidenceStatus('uploading');
        try {
          await uploadEvidence(response.sale.id, evidenceFile);
          setEvidenceStatus('uploaded');
        } catch (caught) {
          evidenceFailed = true;
          setEvidenceStatus('failed');
          if (!onAuthorizationFailure(caught)) {
            setError('La venta quedó registrada, pero no pudimos subir el comprobante. Reintenta sólo el archivo.');
          }
        }
      }
      setSuccess(evidenceFailed
        ? 'Venta registrada correctamente; el comprobante sigue pendiente.'
        : evidenceFile ? 'Venta y comprobante registrados correctamente.'
          : response.message || 'Venta registrada correctamente.');
      await onRefresh().catch(() => undefined);
    } catch (caught) {
      if (!onAuthorizationFailure(caught)) setError(safeError(caught, 'No fue posible terminar la venta.'));
    } finally {
      saleInFlightRef.current = false;
      setBusy(null);
    }
  };

  const retryEvidence = async () => {
    if (!createdSale || !evidenceFile || evidenceInFlightRef.current) return;
    evidenceInFlightRef.current = true;
    setBusy('evidence');
    setEvidenceStatus('uploading');
    setError('');
    try {
      await uploadEvidence(createdSale.id, evidenceFile);
      setEvidenceStatus('uploaded');
      setSuccess('Comprobante enviado correctamente. Finanzas ya puede revisarlo.');
      await onRefresh().catch(() => undefined);
    } catch (caught) {
      setEvidenceStatus('failed');
      if (!onAuthorizationFailure(caught)) {
        setError('No fue posible subir el comprobante. Conservamos la venta; inténtalo nuevamente.');
      }
    } finally {
      evidenceInFlightRef.current = false;
      setBusy(null);
    }
  };

  const refresh = async () => {
    setBusy('refresh');
    setError('');
    try {
      await onRefresh();
    } catch (caught) {
      if (!onAuthorizationFailure(caught)) setError('No fue posible actualizar la información.');
    } finally {
      setBusy(null);
    }
  };

  if (!seller) {
    return (
      <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
        No encontramos un perfil de vendedor activo para esta sesión.
      </section>
    );
  }

  const contactForm = (
    <KioskModalFrame
      busy={busy === 'contact'}
      closeLabel="Cerrar"
      description="Quedará asignado a tu cartera y alcance actual."
      footer={(
        <Button aria-busy={busy === 'contact' || undefined} disabled={busy === 'contact'} form="route-sales-contact-form" type="submit">
          {busy === 'contact' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {busy === 'contact' ? 'Guardando…' : 'Guardar cliente'}
        </Button>
      )}
      footerLeading={<Button type="button" variant="outline" disabled={busy === 'contact'} onClick={() => { setShowNewContact(false); setError(''); }}>Cancelar</Button>}
      footerSummary={fiscalDataCount ? `${fiscalDataCount} datos fiscales capturados` : 'Datos fiscales opcionales'}
      icon={<UsersRound className="h-5 w-5" />}
      onOpenChange={open => { if (!open && busy !== 'contact') { setShowNewContact(false); setError(''); } }}
      open={showNewContact}
      size="form"
      surface="public"
      title="Nuevo cliente"
      tone="coral"
    >
      <form
        aria-busy={busy === 'contact' || undefined}
        className="space-y-4"
        id="route-sales-contact-form"
        noValidate
        onSubmit={event => { event.preventDefault(); void createContact(); }}
      >
      {error ? <KioskWorkspaceNotice kind="error">{error}</KioskWorkspaceNotice> : null}
      <div className="grid gap-3 min-[430px]:grid-cols-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Empresa o cliente *
          <input autoFocus required value={contactDraft.companyName} maxLength={180} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#E85D52] focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-rose-950" onChange={event => setContactDraft(current => ({ ...current, companyName: event.target.value }))} />
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Persona de contacto
          <input value={contactDraft.contactPerson} maxLength={180} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#E85D52] dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={event => setContactDraft(current => ({ ...current, contactPerson: event.target.value }))} />
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Teléfono
          <input value={contactDraft.phone} inputMode="tel" maxLength={40} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#E85D52] dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={event => setContactDraft(current => ({ ...current, phone: event.target.value }))} />
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Correo
          <input value={contactDraft.email} type="email" maxLength={240} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#E85D52] dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={event => setContactDraft(current => ({ ...current, email: event.target.value }))} />
        </label>
      </div>
      <details className="group overflow-hidden rounded-xl border border-rose-200 bg-white dark:border-rose-900/60 dark:bg-slate-950">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3 py-2 outline-none focus-visible:ring-4 focus-visible:ring-rose-100 [&::-webkit-details-marker]:hidden">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-[#C94840] dark:bg-rose-950/40 dark:text-rose-200"><FileText className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-slate-950 dark:text-white">Datos fiscales</span>
            <span className="block text-xs text-slate-500">Se guardan en la ficha real del cliente para facturación.</span>
          </span>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${fiscalDataCount ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
            {fiscalDataCount ? `${fiscalDataCount} capturados` : 'Opcional'}
          </span>
        </summary>
        <div className="grid gap-3 border-t border-rose-100 p-3 sm:grid-cols-2 dark:border-rose-900/50">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            País fiscal
            <select value={contactDraft.fiscal.country} className={contactInputClassName} onChange={event => setContactDraft(current => ({ ...current, fiscal: { ...current.fiscal, country: event.target.value, cfdiUse: event.target.value === 'MX' ? current.fiscal.cfdiUse : '' } }))}>
              {fiscalCountryOptions.map(country => <option key={country.value} value={country.value}>{country.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Razón social
            <input value={contactDraft.fiscal.legalName} maxLength={220} placeholder="Como aparece en su constancia" className={contactInputClassName} onChange={event => setFiscalField('legalName', event.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {selectedFiscalCountry.taxIdLabel}
            <input value={contactDraft.fiscal.taxId} maxLength={120} autoCapitalize="characters" placeholder="Identificador fiscal" className={contactInputClassName} onChange={event => setFiscalField('taxId', event.target.value.toUpperCase())} />
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {selectedFiscalCountry.regimeLabel}
            <input value={contactDraft.fiscal.regime} maxLength={180} placeholder="Clave o nombre del régimen" className={contactInputClassName} onChange={event => setFiscalField('regime', event.target.value)} />
          </label>
          {contactDraft.fiscal.country === 'MX' ? <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Uso de CFDI
            <input value={contactDraft.fiscal.cfdiUse} maxLength={32} autoCapitalize="characters" placeholder="Ej. G03" className={contactInputClassName} onChange={event => setFiscalField('cfdiUse', event.target.value.toUpperCase())} />
          </label> : null}
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {selectedFiscalCountry.registryLabel}
            <input value={contactDraft.fiscal.registryId} maxLength={140} placeholder="Registro o constancia" className={contactInputClassName} onChange={event => setFiscalField('registryId', event.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300 sm:col-span-2">
            Domicilio fiscal
            <input value={contactDraft.fiscal.addressLine1} maxLength={240} placeholder="Calle, número y colonia" className={contactInputClassName} onChange={event => setFiscalField('addressLine1', event.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Complemento del domicilio
            <input value={contactDraft.fiscal.addressLine2} maxLength={240} placeholder="Interior o referencias" className={contactInputClassName} onChange={event => setFiscalField('addressLine2', event.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Ciudad
            <input value={contactDraft.fiscal.city} maxLength={120} className={contactInputClassName} onChange={event => setFiscalField('city', event.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Estado o provincia
            <input value={contactDraft.fiscal.state} maxLength={120} className={contactInputClassName} onChange={event => setFiscalField('state', event.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Código postal fiscal
            <input value={contactDraft.fiscal.postalCode} inputMode={contactDraft.fiscal.country === 'MX' ? 'numeric' : 'text'} maxLength={40} className={contactInputClassName} onChange={event => setFiscalField('postalCode', event.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300 sm:col-span-2">
            Correo de facturación
            <input value={contactDraft.fiscal.email} type="email" maxLength={220} placeholder={contactDraft.email || 'facturacion@cliente.com'} className={contactInputClassName} onChange={event => setFiscalField('email', event.target.value)} />
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300 sm:col-span-2">
            Notas fiscales
            <textarea value={contactDraft.fiscal.notes} maxLength={2000} rows={2} placeholder="Indicaciones adicionales para facturación" className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-950 outline-none focus:border-[#E85D52] focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-rose-950" onChange={event => setFiscalField('notes', event.target.value)} />
          </label>
        </div>
      </details>
      </form>
    </KioskModalFrame>
  );

  return (
    <KioskToolWorkspaceFrame data-route-sales-workspace width="catalog">
      {error && !showNewContact && (tab !== 'sell' || Boolean(createdSale)) ? <KioskWorkspaceNotice kind="error">{error}</KioskWorkspaceNotice> : null}
      {success ? <KioskWorkspaceNotice kind="success">{success}</KioskWorkspaceNotice> : null}

      <KioskWorkspaceTabs<WorkspaceTab>
        activeTextClassName="text-slate-950"
        activeValue={tab}
        ariaLabel="Secciones de venta en ruta"
        items={[
          { icon: <ShoppingBag className="h-4 w-4" />, label: 'Vender', value: 'sell' },
          { icon: <PackageCheck className="h-4 w-4" />, label: 'Mis ventas', value: 'sales' },
          { icon: <UsersRound className="h-4 w-4" />, label: 'Clientes', value: 'customers' },
        ]}
        onChange={setTab}
        sticky={false}
        tone="coral"
      />

      <KioskWorkspaceContextBar
        action={(
          <button
            aria-label="Actualizar"
            className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#FF6B5E] hover:bg-[#FF6B5E]/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            onClick={() => void refresh()}
            type="button"
          >
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${busy === 'refresh' ? 'animate-spin' : ''}`} />
          </button>
        )}
        density="compact"
        description={bootstrap?.scope?.business_name || bootstrap?.scope?.unit_name || 'Alcance de empresa'}
        eyebrow="Vendedor en ruta"
        icon={<ShoppingBag className="h-5 w-5" />}
        meta={(
          <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
            <span>{currency}</span>
            <span>{recentSales.length} ventas registradas</span>
          </div>
        )}
        title={seller.name}
        tone="coral"
      />

      {tab === 'sell' ? (
        <div className="space-y-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <KioskWorkflowStepper
              ariaLabel={`Paso ${step} de 4`}
              currentStep={step}
              density="compact"
              labels={['Cliente', 'Productos', 'Cobro', 'Revisar']}
              tone="coral"
            />
          </section>

          {createdSale ? (
            <section className="rounded-2xl border border-emerald-200 bg-white p-5 text-center dark:border-emerald-900/60 dark:bg-slate-950">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="h-7 w-7" /></span>
              <h3 className="mt-3 text-lg font-medium text-slate-950 dark:text-white">Venta terminada</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Folio {createdSale.sale_number}</p>
              <p className="mt-3 text-2xl font-medium text-slate-950 dark:text-white">{money(createdSale.total_amount, createdSale.currency, locale)}</p>
              <KioskWorkspaceFieldStatus className="mt-4 text-left" kind={createdSale.settlement_status === 'settled' ? 'success' : 'warning'}>
                {createdSale.settlement_status === 'settled'
                  ? `Ingreso registrado en Tesorería${createdSale.payment_account_name ? ` · ${createdSale.payment_account_name}` : ''}.`
                  : createdSale.settlement_status === 'receivable_pending'
                    ? 'Venta a crédito registrada; el saldo queda pendiente de cobranza.'
                    : 'El efectivo queda bajo tu custodia hasta entregarlo a Finanzas.'}
              </KioskWorkspaceFieldStatus>
              {evidenceFile ? <KioskWorkspaceFieldStatus className="mt-3 text-left" kind={evidenceStatus === 'uploaded' ? 'success' : evidenceStatus === 'failed' ? 'error' : 'help'}>
                {evidenceStatus === 'uploading' ? <span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" />Guardando comprobante…</span> : evidenceStatus === 'uploaded' ? 'Comprobante enviado a revisión.' : evidenceStatus === 'failed' ? 'El comprobante no se cargó; la venta sí quedó guardada.' : 'Comprobante pendiente.'}
              </KioskWorkspaceFieldStatus> : null}
              {evidenceStatus === 'failed' ? <Button type="button" variant="outline" className="mt-3 h-11 w-full border-red-200 text-red-700" disabled={busy === 'evidence'} onClick={() => void retryEvidence()}>{busy === 'evidence' ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Reintentar comprobante</Button> : null}
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" className="h-11" disabled={busy === 'sale' || busy === 'evidence'} onClick={() => { resetSale(); setTab('sales'); }}>Ver mis ventas</Button>
                <Button type="button" className="h-11 bg-[#E85D52] text-white hover:bg-[#cf4d44]" disabled={busy === 'sale' || busy === 'evidence'} onClick={resetSale}>Nueva venta</Button>
              </div>
            </section>
          ) : null}

          {!createdSale && step === 1 ? (
            <KioskWorkspaceSurface className="space-y-3">
              <KioskWorkspaceSectionHeader
                action={<Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => { setError(''); setShowNewContact(true); }}><UserPlus className="mr-1.5 h-4 w-4" />Nuevo</Button>}
                description="Sólo ves clientes de tu cartera."
                icon={<UsersRound className="h-5 w-5" />}
                title="¿A quién le vendes?"
                tone="coral"
              />
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input value={contactQuery} placeholder="Buscar cliente, teléfono o correo" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#E85D52] dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={event => setContactQuery(event.target.value)} />
              </label>
              <div className="grid max-h-[48vh] gap-2 overflow-y-auto sm:grid-cols-2">
                {visibleContacts.map(contact => (
                  <button key={contact.id} type="button" className={`rounded-xl border p-3 text-left transition ${contact.id === contactId ? 'border-[#E85D52] bg-rose-50 ring-2 ring-rose-100 dark:bg-rose-950/30 dark:ring-rose-950' : 'border-slate-200 hover:border-rose-300 dark:border-slate-700'}`} onClick={() => setContactId(contact.id)}>
                    <div className="flex items-start gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${contact.id === contactId ? 'bg-[#E85D52] text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{contact.id === contactId ? <Check className="h-4 w-4" /> : <UsersRound className="h-4 w-4" />}</span><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{contact.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{contact.contact_person || contact.phone || contact.email || 'Sin datos adicionales'}</p>{contact.fiscal_tax_id ? <p className="mt-1 truncate text-[11px] font-medium text-[#C94840]">{contact.fiscal_country === 'MX' ? 'RFC' : 'ID fiscal'}: {contact.fiscal_tax_id}</p> : null}</div></div>
                  </button>
                ))}
                {!visibleContacts.length ? <p className="col-span-full rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-900">No hay clientes con esa búsqueda.</p> : null}
              </div>
            </KioskWorkspaceSurface>
          ) : null}

          {!createdSale && step === 2 ? (
            <RouteSalesProductPicker
              products={products}
              warehouses={warehouses}
              warehouseId={warehouseId}
              quantities={quantities}
              selectedCurrency={selectedCurrency}
              query={query}
              locale={locale}
              currency={currency}
              total={total}
              stockFor={stockFor}
              onQueryChange={setQuery}
              onWarehouseChange={nextWarehouseId => {
                setWarehouseId(nextWarehouseId);
                setQuantities({});
                setPaymentAccountId(null);
              }}
              onQuantityChange={setQuantity}
            />
          ) : null}

          {!createdSale && step === 3 ? (
            <KioskWorkspaceSurface className="space-y-3">
              <KioskWorkspaceSectionHeader
                description="Indica el método y, si es electrónico, dónde entró el dinero."
                icon={<CreditCard className="h-5 w-5" />}
                title="¿Cómo paga el cliente?"
                tone="coral"
              />
              <div className="grid grid-cols-2 gap-2">
                {availablePaymentMethods.map(method => {
                  const id = method.id as PaymentMethod;
                  const Icon = paymentIcon(id);
                  return (
                    <KioskWorkspaceChoiceCard
                      density="compact"
                      icon={<Icon className="h-4 w-4" />}
                      key={id}
                      onClick={() => { setPaymentMethod(id); setPaymentReference(''); if (id !== 'card' && id !== 'transfer') setPaymentAccountId(null); if (id === 'credit') { setEvidenceFile(null); setEvidenceStatus('idle'); } }}
                      selected={paymentMethod === id}
                      title={method.label}
                      tone="coral"
                    />
                  );
                })}
              </div>
              {selectedPaymentMethod?.description ? (
                <KioskWorkspaceFieldStatus>{selectedPaymentMethod.description}</KioskWorkspaceFieldStatus>
              ) : null}
              {(paymentMethod === 'card' || paymentMethod === 'transfer') ? <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Referencia del cobro *<input value={paymentReference} maxLength={180} required placeholder={paymentMethod === 'card' ? 'Folio de terminal' : 'Referencia bancaria'} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#E85D52] focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-rose-950" onChange={event => setPaymentReference(event.target.value)} /></label> : null}
              {electronicPayment ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                    <span className="flex items-center gap-1.5"><Landmark className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />Cuenta bancaria destino *</span>
                    <select
                      value={paymentAccountId ?? ''}
                      required
                      className="mt-1 h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:border-emerald-900 dark:bg-slate-950 dark:text-white dark:focus:ring-emerald-950"
                      onChange={event => setPaymentAccountId(Number(event.target.value) || null)}
                    >
                      <option value="">Selecciona dónde se recibió el dinero</option>
                      {eligiblePaymentAccounts.map(account => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}
                    </select>
                  </label>
                  {eligiblePaymentAccounts.length ? (
                    <KioskWorkspaceFieldStatus className="mt-2" kind={selectedPaymentAccount ? 'success' : 'help'}>
                      {selectedPaymentAccount
                        ? `Al terminar, ${money(total, currency, locale)} entrará en Tesorería · ${selectedPaymentAccount.name}.`
                        : 'Selecciona la cuenta donde se recibió el dinero para cerrar correctamente el flujo.'}
                    </KioskWorkspaceFieldStatus>
                  ) : (
                    <KioskWorkspaceFieldStatus className="mt-2" kind="warning">No hay una cuenta bancaria activa en {currency} para el alcance de esta venta. Configúrala en Finanzas → Cuentas de pago.</KioskWorkspaceFieldStatus>
                  )}
                </div>
              ) : null}
              {paymentMethod !== 'credit' ? <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                <KioskWorkspaceSectionHeader
                  description="Opcional · foto o PDF · máximo 15 MB."
                  icon={<FileText className="h-5 w-5" />}
                  title="Comprobante del cobro"
                  tone="coral"
                />
                {canAttachEvidence ? <div className="mt-3 grid gap-2 min-[430px]:grid-cols-2">
                  <KioskFileDropzone
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    density="compact"
                    description="Cámara del dispositivo"
                    icon={<Camera className="h-4 w-4" />}
                    onChange={selectEvidence}
                    title="Tomar foto"
                    tone="coral"
                  />
                  <KioskFileDropzone
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    density="compact"
                    description="Foto o documento PDF"
                    icon={<Upload className="h-4 w-4" />}
                    onChange={selectEvidence}
                    title="Elegir archivo"
                    tone="coral"
                  />
                </div> : <KioskWorkspaceFieldStatus className="mt-3" kind="warning">Vuelve a identificarte con tu PIN para habilitar la carga segura de comprobantes.</KioskWorkspaceFieldStatus>}
                {evidenceFile ? <div className="mt-3 flex min-h-14 items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><FileText className="h-5 w-5 shrink-0 text-[#C94840]" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{evidenceFile.name}</p><p className="text-xs text-slate-500">{Math.max(1, evidenceFile.size / 1024).toFixed(0)} KB · listo para enviar</p></div><button type="button" aria-label="Quitar comprobante" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-red-600 hover:bg-red-50" onClick={() => { setEvidenceFile(null); setEvidenceStatus('idle'); }}><Trash2 className="h-4 w-4" /></button></div> : null}
              </div> : null}
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><input type="checkbox" checked={deliveredNow} className="h-5 w-5 accent-[#E85D52]" onChange={event => setDeliveredNow(event.target.checked)} /><span><span className="block text-sm font-medium text-slate-950 dark:text-white">Mercancía entregada ahora</span><span className="block text-xs text-slate-500">Desactívalo si queda una entrega pendiente.</span></span></label>
              <details className="group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700" data-route-sales-optional-notes>
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-medium text-slate-700 outline-none focus-visible:ring-4 focus-visible:ring-rose-100 dark:text-slate-200 dark:focus-visible:ring-rose-950 [&::-webkit-details-marker]:hidden">
                  <span>Notas de la venta <span className="font-normal text-slate-400">· opcional</span></span>
                  <ChevronRight aria-hidden="true" className="h-4 w-4 transition group-open:rotate-90" />
                </summary>
                <div className="border-t border-slate-100 p-2 dark:border-slate-800">
                  <textarea aria-label="Notas de la venta" value={notes} maxLength={2000} rows={3} className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-[#E85D52] focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-rose-950" onChange={event => setNotes(event.target.value)} />
                </div>
              </details>
            </KioskWorkspaceSurface>
          ) : null}

          {!createdSale && step === 4 ? (
            <KioskWorkspaceSurface className="space-y-4">
              <KioskWorkspaceSectionHeader
                description="Al confirmar se registra la venta y se descuenta el inventario."
                icon={<ClipboardCheck className="h-5 w-5" />}
                title="Revisa y termina la venta"
                tone="coral"
              />
              <div className="grid grid-cols-2 gap-2"><div className="min-w-0 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900"><p className="text-[10px] text-slate-500">Cliente</p><p className="mt-1 truncate text-sm font-medium text-slate-950 dark:text-white">{selectedContact?.name}</p></div><div className="min-w-0 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900"><p className="text-[10px] text-slate-500">Almacén</p><p className="mt-1 truncate text-sm font-medium text-slate-950 dark:text-white">{selectedWarehouse?.name}</p></div><div className="min-w-0 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900"><p className="text-[10px] text-slate-500">Cobro</p><p className="mt-1 truncate text-sm font-medium text-slate-950 dark:text-white">{selectedPaymentMethod?.label || paymentMethod}</p>{electronicPayment ? <><p className="mt-1 truncate text-[11px] text-slate-500">{selectedPaymentAccount?.name}</p><p className="truncate text-[10px] text-slate-400">Ref. {paymentReference}</p></> : null}</div><div className="min-w-0 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900"><p className="text-[10px] text-slate-500">Comprobante</p><p className="mt-1 truncate text-sm font-medium text-slate-950 dark:text-white">{paymentMethod === 'credit' ? 'No aplica' : evidenceFile?.name || 'Sin archivo'}</p></div></div>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">{cartLines.map(line => <div key={line.product.id} className="flex items-center justify-between gap-3 p-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{line.product.name}</p><p className="text-xs text-slate-500">{line.quantity} × {money(line.product.price, line.product.currency, locale)} · Imp. {line.product.tax_percent}%</p></div><strong className="font-medium text-sm text-slate-950 dark:text-white">{money(line.total, line.product.currency, locale)}</strong></div>)}</div>
              <div className="space-y-1 rounded-xl bg-rose-50 p-4 dark:bg-rose-950/25"><div className="flex justify-between text-sm text-slate-600 dark:text-slate-300"><span>Subtotal</span><span>{money(subtotal, currency, locale)}</span></div><div className="flex justify-between text-sm text-slate-600 dark:text-slate-300"><span>Impuestos</span><span>{money(taxTotal, currency, locale)}</span></div><div className="flex justify-between border-t border-rose-200 pt-2 text-lg font-medium text-slate-950 dark:border-rose-900 dark:text-white"><span>Total</span><span>{money(total, currency, locale)}</span></div></div>
              <div className={`rounded-xl border p-3 text-xs ${electronicPayment ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200'}`}>
                {electronicPayment
                  ? `Al confirmar, ${money(total, currency, locale)} entrará en Tesorería · ${selectedPaymentAccount?.name}.`
                  : paymentMethod === 'cash'
                    ? 'El efectivo queda en custodia de ruta hasta su entrega; todavía no aumenta una cuenta bancaria.'
                    : 'La venta quedará como saldo pendiente de cobranza y no registrará un ingreso bancario.'}
              </div>
            </KioskWorkspaceSurface>
          ) : null}

          {!createdSale ? (
            <>
              {error && !showNewContact ? <KioskWorkspaceNotice kind="error">{error}</KioskWorkspaceNotice> : null}
              <KioskStickyActionBar
                summary={step === 2 && cartLines.length ? (
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-slate-600 dark:text-slate-300">{selectedUnits} unidades · {cartLines.length} productos</span>
                    <strong className="shrink-0 font-medium text-[#C94840] dark:text-rose-200">{money(total, currency, locale)}</strong>
                  </div>
                ) : undefined}
              >
                {step > 1 ? <Button type="button" variant="outline" className="h-11" disabled={busy === 'sale'} onClick={() => { setError(''); setStep(current => Math.max(1, current - 1) as SaleStep); }}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button> : null}
                {step < 4 ? <Button type="button" className="h-11 flex-1 bg-[#E85D52] text-white hover:bg-[#cf4d44]" onClick={advance}>Continuar<ChevronRight className="ml-1 h-4 w-4" /></Button> : <Button type="button" className="h-11 flex-1 bg-[#E85D52] text-white hover:bg-[#cf4d44]" disabled={busy === 'sale'} onClick={() => void createSale()}>{busy === 'sale' ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Terminar venta</Button>}
              </KioskStickyActionBar>
            </>
          ) : null}
        </div>
      ) : null}

      {tab === 'sales' ? (
        <KioskWorkspaceSurface className="space-y-3">
          <KioskWorkspaceSectionHeader
            description="Seguimiento de las ventas registradas con tu usuario."
            icon={<PackageCheck className="h-5 w-5" />}
            title="Mis ventas"
            tone="coral"
          />
          {routeSummary ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-950/25"><p className="text-[11px] text-slate-500">Ventas de hoy</p><p className="mt-1 text-xl font-medium text-slate-950 dark:text-white">{routeSummary.today_count}</p></div>
              <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/25"><p className="text-[11px] text-slate-500">Por entregar o cobrar</p><p className="mt-1 text-xl font-medium text-slate-950 dark:text-white">{routeSummary.pending_settlement_count}</p></div>
              <div className="col-span-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-[11px] text-slate-500">Vendido hoy</p><p className="mt-1 text-sm font-medium text-slate-950 dark:text-white">{Object.entries(routeSummary.today_totals).map(([summaryCurrency, amount]) => money(Number(amount), summaryCurrency, locale)).join(' · ') || 'Sin ventas todavía'}</p></div>
            </div>
          ) : null}
          <div className="grid gap-2">
            {recentSales.map(sale => (
              <article key={sale.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{sale.customer_name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{sale.sale_number} · {dateLabel(sale.sale_date, locale)}</p>
                  </div>
                  <strong className="shrink-0 text-sm font-medium text-slate-950 dark:text-white">{money(sale.total_amount, sale.currency, locale)}</strong>
                </div>
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-900">
                  <Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <p className="min-w-0 text-xs text-slate-600 dark:text-slate-300">
                    {sale.settlement_status === 'settled'
                      ? sale.payment_method.toLowerCase() === 'cash'
                        ? 'Efectivo entregado a Finanzas'
                        : <>Tesorería · <span className="font-medium">{sale.payment_account_name || 'Cuenta bancaria'}</span>{sale.payment_reference ? ` · Ref. ${sale.payment_reference}` : ''}</>
                      : sale.payment_method.toLowerCase() === 'cash'
                        ? 'Efectivo en custodia de ruta'
                        : sale.payment_method.toLowerCase() === 'credit'
                          ? 'Saldo pendiente de cobranza'
                          : 'Cobro electrónico pendiente de conciliación'}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${statusClass(sale.inventory_status)}`}>Inventario: {statusLabel(sale.inventory_status)}</span>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${statusClass(sale.delivery_status)}`}>Entrega: {statusLabel(sale.delivery_status)}</span>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${statusClass(sale.finance_status)}`}>Cobro: {statusLabel(sale.finance_status)}</span>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${statusClass(sale.payment_evidence_status || 'missing')}`}>Comprobante: {sale.payment_evidence_status === 'not_required' ? 'No aplica' : Number(sale.evidence_count || 0) > 0 ? 'Enviado' : 'Pendiente'}</span>
                </div>
              </article>
            ))}
          </div>
          {!recentSales.length ? <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-900">Todavía no tienes ventas registradas.</div> : null}
        </KioskWorkspaceSurface>
      ) : null}

      {tab === 'customers' ? (
        <KioskWorkspaceSurface className="space-y-3">
          <KioskWorkspaceSectionHeader
            action={<Button type="button" size="sm" className="min-h-11 bg-[#E85D52] text-white hover:bg-[#cf4d44]" onClick={() => { setError(''); setShowNewContact(true); }}><UserPlus className="mr-1.5 h-4 w-4" />Nuevo</Button>}
            description="Tu cartera disponible para ventas en ruta."
            icon={<UsersRound className="h-5 w-5" />}
            title="Mis clientes"
            tone="coral"
          />
          <label className="relative block"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input value={contactQuery} placeholder="Buscar cliente" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#E85D52] dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={event => setContactQuery(event.target.value)} /></label>
          <div className="grid gap-2 sm:grid-cols-2">{visibleContacts.map(contact => <article key={contact.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-[#C94840] dark:bg-rose-950/30 dark:text-rose-300"><UsersRound className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{contact.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{contact.contact_person || contact.code || 'Cliente de ruta'}</p><p className="mt-1 truncate text-xs text-slate-500">{contact.phone || contact.email || 'Sin contacto capturado'}</p>{contact.fiscal_tax_id ? <p className="mt-1 truncate text-[11px] font-medium text-[#C94840]">{contact.fiscal_country === 'MX' ? 'RFC' : 'ID fiscal'}: {contact.fiscal_tax_id}</p> : <p className="mt-1 text-[11px] text-slate-400">Sin datos fiscales</p>}</div></div><Button type="button" size="sm" variant="outline" className="mt-3 min-h-11 w-full" onClick={() => { setContactId(contact.id); setTab('sell'); setStep(2); }}>Vender a este cliente</Button></article>)}</div>
        </KioskWorkspaceSurface>
      ) : null}
      {contactForm}
    </KioskToolWorkspaceFrame>
  );
}
