import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Building2, Check, FileQuestion, LoaderCircle, MessageSquareWarning, Plus, RefreshCw, Send, Trash2, X } from 'lucide-react';
import { purchaseOrdersApi } from '../services/purchaseOrdersApi';
import type {
  ProviderCenterInbox,
  ProviderOption,
  SupplierQuoteRequest,
  SupplierQuoteRequestPayload,
} from '../types/purchaseOrder.types';

type ProductChoice = { id: number | string; name?: string | null; sku?: string | null };
type QuoteLine = { productId: string; productName: string; quantity: string; sku: string; notes: string };

const emptyInbox: ProviderCenterInbox = { registrations: [], changes: [] };
const emptyLine = (): QuoteLine => ({ productId: '', productName: '', quantity: '1', sku: '', notes: '' });
const inputClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#FF6B5E] focus:ring-4 focus:ring-[#FF6B5E]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const formatDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
};

function Section({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5"><div><h2 className="text-base font-medium text-slate-950 dark:text-white">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p></div><div className="mt-4">{children}</div></section>;
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-200">{label}</span>{children}</label>;
}

export function ProviderCenterProcurementPanel({
  products,
  providers,
  onOrdersChanged,
  onError,
  onNotice,
}: {
  products: ProductChoice[];
  providers: ProviderOption[];
  onOrdersChanged: () => Promise<void>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}) {
  const [inbox, setInbox] = useState<ProviderCenterInbox>(emptyInbox);
  const [requests, setRequests] = useState<SupplierQuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<QuoteLine[]>([emptyLine()]);
  const [registrationUnits, setRegistrationUnits] = useState<Record<number, string>>({});
  const [registrationBusinesses, setRegistrationBusinesses] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextInbox, nextRequests] = await Promise.all([
        purchaseOrdersApi.providerCenterInbox(),
        purchaseOrdersApi.supplierQuoteRequests(),
      ]);
      setInbox(nextInbox);
      setRequests(nextRequests.items ?? []);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudo cargar el Centro de Proveedores.');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { void load(); }, [load]);

  const pendingRegistrations = inbox.registrations.filter(item => ['SUBMITTED', 'IN_REVIEW'].includes(item.status));
  const pendingChanges = inbox.changes.filter(item => ['SUBMITTED', 'IN_REVIEW'].includes(item.status));
  const pendingOrderResponses = inbox.order_responses ?? [];
  const units = inbox.assignment_options?.units ?? [];
  const businesses = inbox.assignment_options?.businesses ?? [];
  const productById = useMemo(() => new Map(products.map(product => [String(product.id), product])), [products]);

  const mutate = async (operation: () => Promise<unknown>, message: string) => {
    if (busy) return false;
    setBusy(true);
    try {
      await operation();
      onNotice(message);
      await load();
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudo completar la acción.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const createRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const deadline = new Date(String(values.get('response_deadline') ?? ''));
    if (Number.isNaN(deadline.getTime())) {
      onError('Selecciona una fecha límite válida.');
      return;
    }
    const payload: SupplierQuoteRequestPayload = {
      providerId: Number(values.get('provider_id')),
      title: String(values.get('title') ?? '').trim(),
      description: String(values.get('description') ?? '').trim() || null,
      currencyCode: String(values.get('currency_code') ?? 'MXN').trim().toUpperCase(),
      responseDeadline: deadline.toISOString(),
      items: lines.map(line => ({
        productId: line.productId ? Number(line.productId) : null,
        sku: line.sku.trim() || null,
        productName: line.productName.trim(),
        quantity: Number(line.quantity),
        notes: line.notes.trim() || null,
      })),
    };
    if (await mutate(() => purchaseOrdersApi.createSupplierQuoteRequest(payload), 'Solicitud de cotización creada como borrador. Revísala y ábrela para el proveedor.')) {
      form.reset();
      setLines([emptyLine()]);
    }
  };

  const selectProduct = (index: number, productId: string) => {
    const product = productById.get(productId);
    setLines(current => current.map((line, lineIndex) => lineIndex === index ? {
      ...line,
      productId,
      productName: product?.name ?? line.productName,
      sku: product?.sku ?? line.sku,
    } : line));
  };

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 rounded-[22px] border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#B63B32]"><Building2 className="h-5 w-5" /></span><div><h2 className="font-medium text-slate-950 dark:text-white">Operación del Centro de Proveedores</h2><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">Solicita cotizaciones y decide altas o cambios sin compartir información interna.</p></div></div>
      <button type="button" disabled={loading || busy} onClick={() => void load()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#FF6B5E]/40 bg-white px-3 text-xs font-medium text-[#B63B32] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button>
    </div>

    <Section title="Nueva solicitud de cotización" subtitle="El proveedor verá la solicitud únicamente al abrirla. Puede reemplazar su respuesta hasta la fecha límite.">
      <form className="space-y-4" onSubmit={createRequest}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Proveedor *"><select required name="provider_id" className={inputClass}><option value="">Selecciona</option>{providers.map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></Field>
          <Field label="Título *"><input required name="title" maxLength={240} className={inputClass} /></Field>
          <Field label="Fecha límite *"><input required name="response_deadline" type="datetime-local" className={inputClass} /></Field>
          <Field label="Moneda *"><input required name="currency_code" minLength={3} maxLength={3} defaultValue="MXN" className={inputClass} /></Field>
        </div>
        <Field label="Contexto para el proveedor"><textarea name="description" maxLength={4000} rows={2} className={`${inputClass} h-auto`} /></Field>
        <div className="space-y-2">{lines.map((line, index) => <div key={index} className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950 sm:grid-cols-12">
          <div className="sm:col-span-3"><Field label="Producto del catálogo"><select value={line.productId} onChange={event => selectProduct(index, event.target.value)} className={inputClass}><option value="">Servicio u otro</option>{products.map(product => <option key={String(product.id)} value={String(product.id)}>{product.name}</option>)}</select></Field></div>
          <div className="sm:col-span-3"><Field label="Producto o servicio *"><input required maxLength={240} value={line.productName} onChange={event => setLines(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, productName: event.target.value } : item))} className={inputClass} /></Field></div>
          <div className="sm:col-span-2"><Field label="SKU"><input maxLength={120} value={line.sku} onChange={event => setLines(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, sku: event.target.value } : item))} className={inputClass} /></Field></div>
          <div className="sm:col-span-2"><Field label="Cantidad *"><input required min="0.0001" step="0.0001" type="number" value={line.quantity} onChange={event => setLines(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} className={inputClass} /></Field></div>
          <button type="button" aria-label="Quitar partida" disabled={lines.length === 1} onClick={() => setLines(current => current.filter((_, itemIndex) => itemIndex !== index))} className="self-end justify-self-start rounded-xl p-3 text-red-600 disabled:opacity-30 sm:col-span-1"><Trash2 className="h-4 w-4" /></button>
        </div>)}</div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><button type="button" onClick={() => setLines(current => [...current, emptyLine()])} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium"><Plus className="h-4 w-4" /> Agregar partida</button><button type="submit" disabled={busy || lines.some(line => !line.productName.trim() || Number(line.quantity) <= 0)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831] disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileQuestion className="h-4 w-4" />} Crear borrador</button></div>
      </form>
    </Section>

    <Section title={`Solicitudes emitidas · ${requests.length}`} subtitle="Abre el borrador cuando esté listo; cerrar impide nuevas revisiones y cancelar conserva el historial.">
      <div className="space-y-2">{requests.length ? requests.map(request => <article key={request.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{request.request_number} · {request.title}</p><p className="mt-1 text-xs text-slate-500">{request.provider_name} · vence {formatDate(request.response_deadline)} · {request.response_count} respuesta(s)</p></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium">{request.status}</span>{request.status === 'DRAFT' ? <button disabled={busy} type="button" onClick={() => void mutate(() => purchaseOrdersApi.transitionSupplierQuoteRequest(request.id, 'open'), 'Solicitud abierta para el proveedor.')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white">Abrir</button> : null}{request.status === 'OPEN' ? <button disabled={busy} type="button" onClick={() => void mutate(() => purchaseOrdersApi.transitionSupplierQuoteRequest(request.id, 'close'), 'Solicitud cerrada.')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium">Cerrar</button> : null}{['DRAFT', 'OPEN'].includes(request.status) ? <button disabled={busy} type="button" onClick={() => void mutate(() => purchaseOrdersApi.transitionSupplierQuoteRequest(request.id, 'cancel'), 'Solicitud cancelada sin borrar su historial.')} className="rounded-lg px-3 py-2 text-xs font-medium text-red-600">Cancelar</button> : null}</div></article>) : <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">Todavía no hay solicitudes de cotización.</p>}</div>
    </Section>

    <Section title={`Ajustes de órdenes · ${pendingOrderResponses.length}`} subtitle="Cada solicitud pausa la orden. Revisa el motivo antes de reenviarla; el proveedor no puede responder de nuevo hasta entonces.">
      <div className="space-y-3">{pendingOrderResponses.length ? pendingOrderResponses.map(response => <article key={response.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-amber-700 dark:bg-slate-900 dark:text-amber-300"><MessageSquareWarning className="h-4 w-4" /></span><div className="min-w-0"><p className="text-sm font-medium text-slate-950 dark:text-white">{response.folio} · {response.provider_name}</p><p className="mt-1 text-xs text-slate-500">{response.submitted_by_name || 'Contacto del proveedor'} · {formatDate(response.created_at)}</p>{response.requested_expected_date ? <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">Fecha propuesta: {response.requested_expected_date}</p> : null}<p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700 dark:text-slate-200">{response.reason || 'El proveedor solicitó revisar la orden.'}</p></div></div>
          <button disabled={busy} type="button" onClick={() => void mutate(async () => { await purchaseOrdersApi.action(response.purchase_order_id, 'send', 'Orden reenviada después de revisar la solicitud del proveedor.'); await onOrdersChanged(); }, 'Orden reenviada. El proveedor ya puede responder a esta nueva emisión.')} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-700 px-3 text-xs font-medium text-white disabled:opacity-50"><Send className="h-4 w-4" /> Reenviar sin cambios</button>
        </div>
      </article>) : <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">No hay solicitudes de ajuste pendientes.</p>}</div>
    </Section>

    <Section title={`Altas pendientes · ${pendingRegistrations.length}`} subtitle="El proveedor no eligió alcance. Asígnalo aquí antes de crear su ficha; su NIP único se genera después en el Centro de kioscos.">
      <div className="space-y-3">{pendingRegistrations.length ? pendingRegistrations.map(registration => {
        const unitId = registrationUnits[registration.id] ?? '';
        const scopedBusinesses = businesses.filter(option => !unitId || String(option.unit_id) === unitId);
        return <article key={registration.id} className="rounded-2xl border border-slate-200 p-3"><div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><div><p className="text-sm font-medium">{registration.name}</p><p className="mt-1 text-xs text-slate-500">{registration.contact_name} · {registration.email}{registration.tax_id ? ` · ${registration.tax_id}` : ''}</p></div><span className="self-start rounded-full bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800">POR REVISAR</span></div><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]"><select aria-label="Unidad" value={unitId} onChange={event => { setRegistrationUnits(current => ({ ...current, [registration.id]: event.target.value })); setRegistrationBusinesses(current => ({ ...current, [registration.id]: '' })); }} className={inputClass}><option value="">Unidad</option>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><select aria-label="Negocio" value={registrationBusinesses[registration.id] ?? ''} onChange={event => setRegistrationBusinesses(current => ({ ...current, [registration.id]: event.target.value }))} className={inputClass}><option value="">Negocio</option>{scopedBusinesses.map(business => <option key={business.id} value={business.id}>{business.name}</option>)}</select><button disabled={busy || !unitId || !registrationBusinesses[registration.id]} onClick={() => void mutate(() => purchaseOrdersApi.approveProviderCenterRegistration(registration.id, Number(unitId), Number(registrationBusinesses[registration.id])), 'Proveedor aprobado. Genera su NIP único desde el Centro de kioscos.')} type="button" className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-medium text-white disabled:opacity-50"><Check className="h-4 w-4" /> Aprobar</button><button disabled={busy} onClick={() => void mutate(() => purchaseOrdersApi.rejectProviderCenterRegistration(registration.id), 'Solicitud de alta rechazada.')} type="button" className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl px-3 text-xs font-medium text-red-600"><X className="h-4 w-4" /> Rechazar</button></div></article>;
      }) : <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">No hay altas pendientes.</p>}</div>
    </Section>

    <Section title={`Cambios pendientes · ${pendingChanges.length}`} subtitle="Aprobar aplica únicamente los campos mostrados. Catálogo modifica productos ya ligados al proveedor.">
      <div className="space-y-3">{pendingChanges.length ? pendingChanges.map(change => <article key={change.id} className="rounded-2xl border border-slate-200 p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium">{change.provider_name} · {change.category}</p><p className="mt-1 text-xs text-slate-500">Enviado por {change.submitted_by_name || 'contacto'} · {formatDate(change.created_at)}</p></div><div className="flex gap-2"><button disabled={busy} onClick={() => void mutate(() => purchaseOrdersApi.reviewProviderCenterChange(change.id, 'approve'), 'Cambio aprobado y aplicado.')} type="button" className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-medium text-white"><Check className="h-4 w-4" /> Aprobar</button><button disabled={busy} onClick={() => void mutate(() => purchaseOrdersApi.reviewProviderCenterChange(change.id, 'reject'), 'Cambio rechazado.')} type="button" className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-xs font-medium text-red-600"><X className="h-4 w-4" /> Rechazar</button></div></div><pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:bg-slate-950 dark:text-slate-300">{JSON.stringify(change.changes, null, 2)}</pre></article>) : <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">No hay cambios comerciales o de catálogo pendientes.</p>}</div>
    </Section>
  </div>;
}
