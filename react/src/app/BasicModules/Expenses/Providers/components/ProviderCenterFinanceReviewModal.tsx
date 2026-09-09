import { useCallback, useEffect, useState } from 'react';
import { Check, Landmark, LoaderCircle, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { KioskModalFrame } from '../../../../components/kiosk-engine/KioskModalFrame';
import { providersService } from '../../services';
import type { ProviderCenterInbox } from '../../../PointOfSale/OrdenesCompra/types/purchaseOrder.types';

const emptyInbox: ProviderCenterInbox = { registrations: [], changes: [] };
const inputClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950';
const date = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(parsed);
};

export function ProviderCenterFinanceReviewModal({
  isOpen,
  onClose,
  onError,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [inbox, setInbox] = useState<ProviderCenterInbox>(emptyInbox);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [units, setUnits] = useState<Record<number, string>>({});
  const [businesses, setBusinesses] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setInbox(await providersService.providerCenterInbox()); }
    catch (error) { onError(error instanceof Error ? error.message : 'No se pudo cargar la bandeja del Centro de Proveedores.'); }
    finally { setLoading(false); }
  }, [onError]);

  useEffect(() => { if (isOpen) void load(); }, [isOpen, load]);

  const mutate = async (operation: () => Promise<unknown>, message: string) => {
    if (busy) return;
    setBusy(true);
    try { await operation(); onSuccess(message); await load(); }
    catch (error) { onError(error instanceof Error ? error.message : 'No se pudo completar la revisión.'); }
    finally { setBusy(false); }
  };

  const pendingRegistrations = inbox.registrations.filter(item => ['SUBMITTED', 'IN_REVIEW'].includes(item.status));
  const pendingChanges = inbox.changes.filter(item => ['SUBMITTED', 'IN_REVIEW'].includes(item.status));
  const unitOptions = (inbox.assignment_options?.units ?? []).map(option => ({
    label: option.name,
    value: String(option.id),
  }));
  const businessOptions = (inbox.assignment_options?.businesses ?? []).map(option => ({
    label: option.name,
    unitId: option.unit_id == null ? undefined : String(option.unit_id),
    value: String(option.id),
  }));

  return <KioskModalFrame
      busy={busy}
      description="Aprueba altas y protege los cambios fiscales o bancarios antes de aplicarlos."
      footer={<button type="button" disabled={busy} onClick={onClose} className="min-h-10 rounded-xl border border-slate-200 px-5 text-sm font-medium">Cerrar</button>}
      icon={<ShieldCheck className="h-5 w-5" />}
      onOpenChange={open => !open && onClose()}
      open={isOpen}
      size="workspace"
      surface="administration"
      title="Solicitudes del Centro de Proveedores"
      tone="green"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30"><div><p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Finanzas revisa datos sensibles</p><p className="mt-1 text-xs leading-5 text-emerald-800 dark:text-emerald-200">Compras atiende datos comerciales y catálogo. Aquí se atienden altas, información fiscal y cuentas bancarias.</p></div><button type="button" aria-label="Actualizar" disabled={loading || busy} onClick={() => void load()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-white text-emerald-700"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>

        <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><h3 className="text-sm font-medium">Altas pendientes · {pendingRegistrations.length}</h3><p className="mt-1 text-xs text-slate-500">La solicitud llega sin alcance. Selecciona unidad y negocio antes de aprobar.</p><div className="mt-4 space-y-3">{pendingRegistrations.length ? pendingRegistrations.map(registration => {
          const unitId = units[registration.id] ?? '';
          const scopedBusinesses = businessOptions.filter(option => !unitId || !option.unitId || option.unitId === unitId);
          return <article key={registration.id} className="rounded-2xl border border-slate-200 p-3"><div><p className="text-sm font-medium">{registration.name}</p><p className="mt-1 text-xs text-slate-500">{registration.contact_name} · {registration.email}{registration.tax_id ? ` · ${registration.tax_id}` : ''}</p></div><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]"><select aria-label="Unidad" value={unitId} onChange={event => { setUnits(current => ({ ...current, [registration.id]: event.target.value })); setBusinesses(current => ({ ...current, [registration.id]: '' })); }} className={inputClass}><option value="">Unidad</option>{unitOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><select aria-label="Negocio" value={businesses[registration.id] ?? ''} onChange={event => setBusinesses(current => ({ ...current, [registration.id]: event.target.value }))} className={inputClass}><option value="">Negocio</option>{scopedBusinesses.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button type="button" disabled={busy || !unitId || !businesses[registration.id]} onClick={() => void mutate(() => providersService.approveProviderCenterRegistration(registration.id, Number(unitId), Number(businesses[registration.id])), 'Proveedor aprobado. Ya puedes configurar su acceso individual y NIP.')} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-emerald-700 px-3 text-xs font-medium text-white disabled:opacity-50"><Check className="h-4 w-4" /> Aprobar</button><button type="button" disabled={busy} onClick={() => void mutate(() => providersService.rejectProviderCenterRegistration(registration.id), 'Solicitud de alta rechazada.')} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl px-3 text-xs font-medium text-red-600"><X className="h-4 w-4" /> Rechazar</button></div></article>;
        }) : <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">No hay altas pendientes.</p>}</div></section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Landmark className="h-4 w-4" /></span><div><h3 className="text-sm font-medium">Cambios fiscales y bancarios · {pendingChanges.length}</h3><p className="mt-1 text-xs text-slate-500">Los valores bancarios se almacenan protegidos y no aparecen en el seguimiento público.</p></div></div><div className="mt-4 space-y-3">{pendingChanges.length ? pendingChanges.map(change => <article key={change.id} className="rounded-2xl border border-slate-200 p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium">{change.provider_name} · {change.category}</p><p className="mt-1 text-xs text-slate-500">{change.submitted_by_name || 'Contacto'} · {date(change.created_at)}</p></div><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void mutate(() => providersService.reviewProviderCenterChange(change.id, 'approve'), 'Cambio aprobado y aplicado.')} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-emerald-700 px-3 text-xs font-medium text-white"><Check className="h-4 w-4" /> Aprobar</button><button type="button" disabled={busy} onClick={() => void mutate(() => providersService.reviewProviderCenterChange(change.id, 'reject'), 'Cambio rechazado.')} className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-xs font-medium text-red-600"><X className="h-4 w-4" /> Rechazar</button></div></div><pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-5 dark:bg-slate-950">{JSON.stringify(change.changes, null, 2)}</pre></article>) : <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">No hay cambios fiscales o bancarios pendientes.</p>}</div></section>

        {loading ? <div className="flex items-center justify-center p-4 text-sm text-slate-500"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Cargando solicitudes…</div> : null}
      </div>
    </KioskModalFrame>;
}
