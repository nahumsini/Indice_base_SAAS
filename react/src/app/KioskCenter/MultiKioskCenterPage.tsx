import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, Ban, Check, Clipboard, Copy, ExternalLink,
  Grid2X2, KeyRound, Link2, LoaderCircle, Pencil, Plus, Power,
  QrCode, RefreshCw, Search, ShieldCheck, Smartphone, UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import { KioskModalFrame } from '../components/kiosk-engine/KioskModalFrame';
import { useKioskQrCode } from '../components/kiosk-engine/useKioskQrCode';
import {
  multiKioskAdminApi,
  type MultiKioskCatalogEmployee,
  type MultiKioskCatalogKiosk,
  type MultiKioskDetail,
  type MultiKioskPayload,
  type MultiKioskStatus,
  type MultiKioskSummary,
} from '../api/multiKiosks';

type Catalog = { kiosks: MultiKioskCatalogKiosk[]; employees: MultiKioskCatalogEmployee[] };
type Step = 1 | 2 | 3;
type EditorState = {
  id?: number;
  name: string;
  description: string;
  theme_key: string;
  default_locale: string;
  unit_id: number | null;
  business_id: number | null;
  expires_at: string;
  kioskIds: number[];
  employeeIds: number[];
};

const emptyEditor = (): EditorState => ({
  name: '', description: '', theme_key: 'indice-blue', default_locale: 'es-MX',
  unit_id: null, business_id: null, expires_at: '', kioskIds: [], employeeIds: [],
});

const statusCopy: Record<MultiKioskStatus, { label: string; classes: string }> = {
  ACTIVE: { label: 'Activo', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  DISABLED: { label: 'Deshabilitado', classes: 'border-amber-200 bg-amber-50 text-amber-700' },
  EXPIRED: { label: 'Vencido', classes: 'border-slate-200 bg-slate-100 text-slate-600' },
  REVOKED: { label: 'Revocado', classes: 'border-red-200 bg-red-50 text-red-700' },
};

const moduleLabel = (value: string) => ({
  PROCESS_TASKS: 'Procesos y tareas', HUMAN_RESOURCES: 'Recursos Humanos',
  EXPENSES: 'Gastos', PETTY_CASH: 'Caja chica', SALES: 'Ventas',
  POINT_OF_SALE: 'Punto de venta', INVENTORY: 'Inventarios',
}[value] ?? value.replace(/_/g, ' '));

const absoluteAccessUrl = (item?: Pick<MultiKioskSummary, 'access_path'>) => {
  if (!item?.access_path || typeof window === 'undefined') return '';
  return new URL(item.access_path, window.location.origin).toString();
};

const detailToEditor = (detail: MultiKioskDetail): EditorState => ({
  id: detail.id,
  name: detail.name,
  description: detail.description ?? '',
  theme_key: detail.theme_key,
  default_locale: detail.default_locale,
  unit_id: detail.unit_id ?? null,
  business_id: detail.business_id ?? null,
  expires_at: detail.expires_at ? new Date(detail.expires_at).toISOString().slice(0, 16) : '',
  kioskIds: detail.kiosks.sort((a, b) => a.sort_order - b.sort_order).map(kiosk => kiosk.id),
  employeeIds: detail.employees.map(employee => employee.user_company_id),
});

const payloadFrom = (editor: EditorState): MultiKioskPayload => ({
  name: editor.name.trim(),
  description: editor.description.trim(),
  theme_key: editor.theme_key,
  default_locale: editor.default_locale,
  unit_id: editor.unit_id,
  business_id: editor.business_id,
  expires_at: editor.expires_at ? new Date(editor.expires_at).toISOString() : null,
  kiosk_definition_ids: editor.kioskIds,
  employee_ids: editor.employeeIds,
});

function StatusBadge({ status }: { status: MultiKioskStatus }) {
  const copy = statusCopy[status] ?? statusCopy.DISABLED;
  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium', copy.classes)}>{copy.label}</span>;
}

function ActionButton({ label, icon, onClick, danger = false, disabled = false }: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white transition hover:bg-slate-50 disabled:opacity-40 dark:bg-slate-900 dark:hover:bg-slate-800', danger ? 'border-red-200 text-red-600' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}>{icon}</button>;
}

function EditorModal({ catalog, editor, onClose, onSaved }: {
  catalog: Catalog;
  editor: EditorState;
  onClose: () => void;
  onSaved: (item: MultiKioskDetail) => void;
}) {
  const [form, setForm] = useState(editor);
  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selectedKiosks = form.kioskIds.map(id => catalog.kiosks.find(item => item.id === id)).filter(Boolean) as MultiKioskCatalogKiosk[];
  const selectedModules = new Set(selectedKiosks.map(item => item.module_slug));
  const unitOptions = useMemo(() => Array.from(new Map([
    ...catalog.kiosks.filter(item => item.unit_id).map(item => [item.unit_id!, item.unit_name || `Unidad ${item.unit_id}`] as const),
    ...catalog.employees.filter(item => item.unit_id).map(item => [item.unit_id!, item.unit_name || `Unidad ${item.unit_id}`] as const),
  ]).entries()), [catalog]);
  const businessOptions = useMemo(() => Array.from(new Map([
    ...catalog.kiosks.filter(item => item.business_id && (!form.unit_id || item.unit_id === form.unit_id)).map(item => [item.business_id!, item.business_name || `Negocio ${item.business_id}`] as const),
    ...catalog.employees.filter(item => item.business_id && (!form.unit_id || item.unit_id === form.unit_id)).map(item => [item.business_id!, item.business_name || `Negocio ${item.business_id}`] as const),
  ]).entries()), [catalog, form.unit_id]);
  const employeeEligible = (employee: MultiKioskCatalogEmployee) => {
    const role = employee.role.toLocaleLowerCase().replace('super admin', 'superadmin');
    const modulesAllowed = ['root', 'superadmin'].includes(role) || [...selectedModules].every(module => employee.module_slugs.includes(module));
    const unitAllowed = !form.unit_id || !employee.unit_id || employee.unit_id === form.unit_id;
    const businessAllowed = !form.business_id || !employee.business_id || employee.business_id === form.business_id;
    return employee.pin_ready && modulesAllowed && unitAllowed && businessAllowed;
  };
  const visibleKiosks = catalog.kiosks.filter(item => {
    const matchesScope = (!form.unit_id || !item.unit_id || item.unit_id === form.unit_id)
      && (!form.business_id || !item.business_id || item.business_id === form.business_id);
    const normalized = search.trim().toLocaleLowerCase();
    return matchesScope && (!normalized || [item.name, moduleLabel(item.owner_module)].some(value => value.toLocaleLowerCase().includes(normalized)));
  });
  const visibleEmployees = catalog.employees.filter(item => {
    const normalized = search.trim().toLocaleLowerCase();
    return !normalized || [item.name, item.email, item.unit_name ?? '', item.business_name ?? ''].some(value => value.toLocaleLowerCase().includes(normalized));
  });
  const canContinue = step === 1 ? form.name.trim().length >= 3 : step === 2 ? form.kioskIds.length > 0 : form.employeeIds.length > 0;
  const save = async () => {
    setBusy(true); setError('');
    try {
      const saved = form.id
        ? await multiKioskAdminApi.update(form.id, payloadFrom(form))
        : await multiKioskAdminApi.create(payloadFrom(form));
      onSaved(saved);
    } catch {
      setError('No fue posible guardar. Revisa que cada empleado tenga PIN, acceso a los módulos y alcance compatible.');
    } finally { setBusy(false); }
  };
  const toggleKiosk = (id: number) => setForm(current => ({ ...current, kioskIds: current.kioskIds.includes(id) ? current.kioskIds.filter(value => value !== id) : [...current.kioskIds, id], employeeIds: [] }));
  const toggleEmployee = (id: number) => setForm(current => ({ ...current, employeeIds: current.employeeIds.includes(id) ? current.employeeIds.filter(value => value !== id) : [...current.employeeIds, id] }));
  const moveKiosk = (id: number, direction: -1 | 1) => setForm(current => {
    const ids = [...current.kioskIds]; const index = ids.indexOf(id); const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return current;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    return { ...current, kioskIds: ids };
  });
  return (
    <KioskModalFrame
      open
      onOpenChange={open => { if (!open) onClose(); }}
      busy={busy}
      size="wizard"
      tone="blue"
      icon={<Grid2X2 className="h-5 w-5" />}
      eyebrow={form.id ? `Edición · ${form.name}` : 'Nuevo acceso móvil'}
      title={form.id ? 'Editar Multikiosco' : 'Crear Multikiosco'}
      description="Agrupa accesos directos sin mezclar la operación de los kioscos hijos."
      footerSummary={`Paso ${step} de 3 · ${form.kioskIds.length} kioscos · ${form.employeeIds.length} empleados`}
      footer={<>
        <Button variant="outline" type="button" onClick={step === 1 ? onClose : () => setStep(current => (current - 1) as Step)} disabled={busy}>{step === 1 ? 'Cancelar' : 'Anterior'}</Button>
        {step < 3 ? <Button type="button" onClick={() => { setSearch(''); setStep(current => (current + 1) as Step); }} disabled={!canContinue || busy}>Continuar</Button> : <Button type="button" onClick={() => void save()} disabled={!canContinue || busy}>{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}{form.id ? 'Guardar cambios' : 'Crear Multikiosco'}</Button>}
      </>}
    >
      <div className="mb-5 grid grid-cols-3 gap-2">
        {(['Datos', 'Kioscos', 'Empleados'] as const).map((label, index) => <div key={label} className={cn('rounded-xl border px-3 py-2 text-center text-xs font-medium', step === index + 1 ? 'border-blue-600 bg-blue-50 text-blue-700' : step > index + 1 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400')}>{step > index + 1 ? '✓ ' : ''}{label}</div>)}
      </div>
      {error ? <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {step === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="text-sm font-medium text-slate-700">Nombre</span><input autoFocus value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} maxLength={140} placeholder="Ej. Operación turno mañana" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" /></label>
          <label className="sm:col-span-2"><span className="text-sm font-medium text-slate-700">Descripción breve</span><textarea value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} maxLength={500} rows={3} placeholder="Qué encontrará el colaborador al abrir este acceso" className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" /></label>
          <label><span className="text-sm font-medium text-slate-700">Unidad de negocio</span><select value={form.unit_id ?? ''} onChange={event => setForm(current => ({ ...current, unit_id: event.target.value ? Number(event.target.value) : null, business_id: null, kioskIds: [], employeeIds: [] }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Toda la empresa</option>{unitOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label><span className="text-sm font-medium text-slate-700">Negocio</span><select value={form.business_id ?? ''} disabled={!form.unit_id} onChange={event => setForm(current => ({ ...current, business_id: event.target.value ? Number(event.target.value) : null, kioskIds: [], employeeIds: [] }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-100"><option value="">Todos los negocios</option>{businessOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label><span className="text-sm font-medium text-slate-700">Color</span><select value={form.theme_key} onChange={event => setForm(current => ({ ...current, theme_key: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="indice-blue">Azul Índice</option><option value="indice-green">Verde</option><option value="indice-yellow">Amarillo</option><option value="indice-coral">Coral</option></select></label>
          <label><span className="text-sm font-medium text-slate-700">Vigencia opcional</span><input type="datetime-local" value={form.expires_at} onChange={event => setForm(current => ({ ...current, expires_at: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" /></label>
        </div>
      ) : (
        <>
          <div className="relative mb-4"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={step === 2 ? 'Buscar kiosco o módulo' : 'Buscar empleado'} className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500" /></div>
          {step === 2 ? <div className="grid gap-3 sm:grid-cols-2">{visibleKiosks.map(kiosk => { const selected = form.kioskIds.includes(kiosk.id); const order = form.kioskIds.indexOf(kiosk.id); return <div key={kiosk.id} className={cn('flex items-center gap-3 rounded-2xl border bg-white p-3', selected ? 'border-blue-300 ring-2 ring-blue-500/10' : 'border-slate-200')}><button type="button" onClick={() => toggleKiosk(kiosk.id)} className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl border', selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-400')}>{selected ? <Check className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}</button><button type="button" onClick={() => toggleKiosk(kiosk.id)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-medium text-slate-900">{kiosk.name}</span><span className="mt-1 block truncate text-xs text-slate-500">{moduleLabel(kiosk.owner_module)}{kiosk.business_name ? ` · ${kiosk.business_name}` : kiosk.unit_name ? ` · ${kiosk.unit_name}` : ''}</span></button>{selected ? <span className="flex gap-1"><button type="button" aria-label="Subir" disabled={order === 0} onClick={() => moveKiosk(kiosk.id, -1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" aria-label="Bajar" disabled={order === form.kioskIds.length - 1} onClick={() => moveKiosk(kiosk.id, 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button></span> : null}</div>; })}</div> : <div className="grid gap-3 sm:grid-cols-2">{visibleEmployees.map(employee => { const eligible = employeeEligible(employee); const selected = form.employeeIds.includes(employee.user_company_id); return <button key={employee.user_company_id} type="button" disabled={!eligible} onClick={() => toggleEmployee(employee.user_company_id)} className={cn('flex items-center gap-3 rounded-2xl border bg-white p-3 text-left disabled:cursor-not-allowed disabled:opacity-50', selected ? 'border-blue-300 ring-2 ring-blue-500/10' : 'border-slate-200')}><span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-xs font-medium', selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-500')}>{selected ? <Check className="h-4 w-4" /> : employee.name.split(/\s+/).slice(0, 2).map(value => value[0]).join('').toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-900">{employee.name}</span><span className="mt-1 block truncate text-xs text-slate-500">{employee.email}</span><span className={cn('mt-1 inline-flex items-center gap-1 text-[10px]', employee.pin_ready ? 'text-emerald-600' : 'text-amber-700')}><KeyRound className="h-3 w-3" />{!employee.pin_ready ? 'Configura PIN primero' : !eligible ? 'Sin alcance para todos los kioscos' : 'PIN listo'}</span></span></button>; })}</div>}
        </>
      )}
    </KioskModalFrame>
  );
}

export default function MultiKioskCenterPage() {
  const [items, setItems] = useState<MultiKioskSummary[]>([]);
  const [catalog, setCatalog] = useState<Catalog>({ kiosks: [], employees: [] });
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [qrItem, setQrItem] = useState<MultiKioskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const qrUrl = absoluteAccessUrl(qrItem ?? undefined);
  const qr = useKioskQrCode(qrUrl, '#2563EB');
  const summaryCards: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: 'Multikioscos', value: items.length, icon: Grid2X2 },
    { label: 'Activos', value: items.filter(item => item.status === 'ACTIVE').length, icon: ShieldCheck },
    { label: 'Empleados asignados', value: items.reduce((sum, item) => sum + item.employee_count, 0), icon: UsersRound },
  ];
  const load = async () => {
    setLoading(true); setError('');
    try { const [nextItems, nextCatalog] = await Promise.all([multiKioskAdminApi.list(), multiKioskAdminApi.catalog()]); setItems(nextItems); setCatalog(nextCatalog); }
    catch { setError('No fue posible cargar el Centro de kioscos.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const edit = async (id: number) => { setBusyId(id); try { setEditor(detailToEditor(await multiKioskAdminApi.detail(id))); } catch { setError('No fue posible abrir este Multikiosco.'); } finally { setBusyId(null); } };
  const copyLink = async (item: MultiKioskSummary) => { const url = absoluteAccessUrl(item); if (!url) return; await navigator.clipboard.writeText(url); setCopiedId(item.id); window.setTimeout(() => setCopiedId(current => current === item.id ? null : current), 1800); };
  const transition = async (item: MultiKioskSummary, action: 'enable' | 'disable' | 'revoke') => {
    const message = action === 'revoke' ? 'Revocar es definitivo y cerrará todas las sesiones. ¿Continuar?' : action === 'disable' ? 'Se cerrarán las sesiones activas hasta volver a habilitarlo. ¿Continuar?' : '¿Habilitar nuevamente este Multikiosco?';
    if (!window.confirm(message)) return;
    setBusyId(item.id); try { await multiKioskAdminApi.transition(item.id, action); await load(); } catch { setError('No fue posible cambiar el estado.'); } finally { setBusyId(null); }
  };
  const rotate = async (item: MultiKioskSummary) => { if (!window.confirm('El enlace actual dejará de funcionar y se cerrarán las sesiones. ¿Generar uno nuevo?')) return; setBusyId(item.id); try { await multiKioskAdminApi.rotateLink(item.id); await load(); } catch { setError('No fue posible renovar el enlace.'); } finally { setBusyId(null); } };
  return (
    <main className="mx-auto min-h-[calc(100vh-5.5rem)] max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-7">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Grid2X2 className="h-5 w-5" /></span><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-blue-600">Kiosk Engine · Administración</p><h1 className="mt-1 text-2xl font-medium tracking-tight text-slate-950 dark:text-white">Centro de kioscos</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Crea accesos móviles que reúnen los kioscos autorizados de un grupo de colaboradores.</p></div></div>
          <Button type="button" onClick={() => setEditor(emptyEditor())} className="h-11 shrink-0 bg-blue-600 text-white hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" />Crear Multikiosco</Button>
        </div>
      </section>
      <section className="mt-5 grid grid-cols-3 gap-3">
        {summaryCards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex sm:items-center sm:gap-3"><Icon className="h-5 w-5 text-blue-600" /><div className="mt-2 sm:mt-0"><p className="text-2xl font-normal text-slate-950 dark:text-white">{value}</p><p className="text-xs text-slate-500">{label}</p></div></div>)}
      </section>
      {error ? <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
      <section className="mt-5 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-medium text-slate-950 dark:text-white">Multikioscos configurados</h2><p className="mt-1 text-xs text-slate-500">El enlace identifica el conjunto; el PIN personal identifica al colaborador.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></button></div>
        {loading ? <div className="grid min-h-52 place-items-center"><LoaderCircle className="h-7 w-7 animate-spin text-blue-600" /></div> : items.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center"><Smartphone className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-base font-medium text-slate-800">Aún no hay Multikioscos</p><p className="mt-1 text-sm text-slate-500">Crea el primero, elige sus kioscos y asígnalo a los colaboradores.</p></div> : <div className="mt-4 space-y-3">{items.map(item => <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 dark:border-slate-700 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Smartphone className="h-5 w-5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-base font-medium text-slate-950 dark:text-white">{item.name}</h3><StatusBadge status={item.status} /></div><p className="mt-1 truncate text-xs text-slate-500">{item.business_name || item.unit_name || 'Toda la empresa'} · {item.kiosk_count} kioscos · {item.employee_count} empleados</p><p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-blue-600"><Link2 className="h-3.5 w-3.5" />{item.access_path ? `Enlace listo · ${item.public_token_hint}` : 'Enlace protegido no disponible'}</p></div></div><div className="flex flex-wrap items-center gap-2 sm:justify-end"><ActionButton label={copiedId === item.id ? 'Enlace copiado' : 'Copiar enlace'} disabled={!item.access_path} onClick={() => void copyLink(item)} icon={copiedId === item.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} /><ActionButton label="Mostrar QR" disabled={!item.access_path} onClick={() => setQrItem(item)} icon={<QrCode className="h-4 w-4" />} /><ActionButton label="Abrir enlace" disabled={!item.access_path} onClick={() => window.open(absoluteAccessUrl(item), '_blank', 'noopener,noreferrer')} icon={<ExternalLink className="h-4 w-4" />} /><ActionButton label="Editar" disabled={busyId === item.id || item.status === 'REVOKED'} onClick={() => void edit(item.id)} icon={busyId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />} /><ActionButton label="Renovar enlace" disabled={busyId === item.id || item.status === 'REVOKED'} onClick={() => void rotate(item)} icon={<RefreshCw className="h-4 w-4" />} />{item.status === 'ACTIVE' ? <ActionButton label="Deshabilitar" onClick={() => void transition(item, 'disable')} icon={<Power className="h-4 w-4" />} /> : item.status === 'DISABLED' ? <ActionButton label="Habilitar" onClick={() => void transition(item, 'enable')} icon={<Power className="h-4 w-4 text-emerald-600" />} /> : null}{item.status !== 'REVOKED' ? <ActionButton label="Revocar" danger onClick={() => void transition(item, 'revoke')} icon={<Ban className="h-4 w-4" />} /> : null}</div></article>)}</div>}
      </section>
      {editor ? <EditorModal catalog={catalog} editor={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); void load(); }} /> : null}
      <KioskModalFrame open={Boolean(qrItem)} onOpenChange={open => { if (!open) setQrItem(null); }} size="compact" surface="administration" tone="blue" icon={<QrCode className="h-5 w-5" />} title="Compartir Multikiosco" description="Escanea desde el celular del colaborador." footer={<Button variant="outline" type="button" onClick={() => setQrItem(null)}>Cerrar</Button>}>
        <div className="text-center">{qr ? <img src={qr} alt="Código QR del Multikiosco" className="mx-auto h-56 w-56 rounded-2xl border border-slate-200 bg-white p-3" /> : <div className="mx-auto grid h-56 w-56 place-items-center rounded-2xl bg-slate-100"><LoaderCircle className="h-6 w-6 animate-spin text-slate-400" /></div>}<p className="mt-4 text-sm font-medium text-slate-900">{qrItem?.name}</p><button type="button" onClick={() => qrItem && void copyLink(qrItem)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600"><Clipboard className="h-4 w-4" />Copiar enlace</button></div>
      </KioskModalFrame>
    </main>
  );
}
