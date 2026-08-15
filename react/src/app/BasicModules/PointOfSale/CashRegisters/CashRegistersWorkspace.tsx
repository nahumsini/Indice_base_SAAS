import { useEffect, useMemo, useState } from 'react';
import { Activity, Building2, CheckCircle2, ChevronDown, ChevronRight, CircleDollarSign, Loader2, Monitor, Pencil, Plus, ReceiptText, RefreshCw, Search, Warehouse } from 'lucide-react';
import { configCenterApi } from '../../../api/configCenter';
import { PointOfSaleTitleBar, pointOfSaleTitleBarPrimaryActionClassName, pointOfSaleTitleBarSecondaryActionClassName } from '../shared/components/PointOfSaleTitleBar';
import { CreateCashRegisterModal } from '../Sale/components/CreateCashRegisterModal';
import { PosModalFrame, posModalModuleFooterClassName, posModalPrimaryActionClassName, posModalSecondaryActionClassName } from '../Sale/components/PosModalFrame';
import { posBackendApi, type PosCashRegisterCreatePayload, type PosCashRegisterResponse, type PosContextResponse, type PosShiftClosingSummaryResponse, type PosShiftResponse, type PosWarehouseSummary } from '../Sale/services/posBackendApi';

type Row = {
  warehouse: PosWarehouseSummary;
  register: PosCashRegisterResponse | null;
  shift: PosShiftResponse | null;
  closedShifts: PosShiftResponse[];
};

const unwrap = <T,>(value: T[] | { items?: T[] } | null | undefined): T[] => Array.isArray(value) ? value : value?.items ?? [];

export default function CashRegistersWorkspace() {
  const [context, setContext] = useState<PosContextResponse | null>(null);
  const [registers, setRegisters] = useState<PosCashRegisterResponse[]>([]);
  const [shifts, setShifts] = useState<PosShiftResponse[]>([]);
  const [summaries, setSummaries] = useState<Record<number, PosShiftClosingSummaryResponse>>({});
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [expandedRegisters, setExpandedRegisters] = useState<Set<number>>(new Set());
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null);
  const [query, setQuery] = useState('');
  const [sessionView, setSessionView] = useState<'all' | 'open' | 'closed'>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PosCashRegisterResponse | null>(null);

  const refreshLive = async () => {
    const shiftResponse = await posBackendApi.shifts();
    const nextShifts = unwrap(shiftResponse as unknown as { items?: PosShiftResponse[] });
    setShifts(nextShifts);
    const monitoredShifts = nextShifts.filter((shift) => shift.status === 'OPEN' || shift.status === 'CLOSING' || (shift.status === 'CLOSED' && isToday(shift.closedAt || shift.openedAt)));
    const nextSummaries = await Promise.all(monitoredShifts.map(async (shift) => [shift.id, await posBackendApi.getShiftClosingSummary(shift.id)] as const));
    setSummaries(Object.fromEntries(nextSummaries));
    setLastLiveUpdate(new Date());
  };

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextContext, registerResponse] = await Promise.all([
        posBackendApi.context(),
        posBackendApi.cashRegisters(),
      ]);
      setContext(nextContext);
      setRegisters(unwrap(registerResponse as unknown as { items?: PosCashRegisterResponse[] }));
      try {
        const usersResponse = await configCenterApi.getUsers();
        setUserNames(Object.fromEntries(usersResponse.users.map((user) => [user.id, [user.nombres, user.apellidos].filter(Boolean).join(' ') || user.email])));
      } catch {
        setUserNames({});
      }
      await refreshLive();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar las cajas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    const intervalId = window.setInterval(() => { void refreshLive().catch(() => undefined); }, 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  const rows = useMemo<Row[]>(() => {
    const warehouses = context?.warehouses ?? [];
    const openByRegister = new Map(shifts.filter((shift) => shift.status === 'OPEN' || shift.status === 'CLOSING').map((shift) => [shift.cashRegisterId, shift]));
    const closedByRegister = new Map<number, PosShiftResponse[]>();
    shifts.filter((shift) => shift.status === 'CLOSED' && isToday(shift.closedAt || shift.openedAt)).forEach((shift) => {
      closedByRegister.set(shift.cashRegisterId, [...(closedByRegister.get(shift.cashRegisterId) ?? []), shift]);
    });
    const result: Row[] = [];
    warehouses.forEach((warehouse) => {
      const warehouseRegisters = registers.filter((register) => register.warehouseId === warehouse.id);
      if (warehouseRegisters.length === 0) result.push({ warehouse, register: null, shift: null, closedShifts: [] });
      warehouseRegisters.forEach((register) => result.push({ warehouse, register, shift: openByRegister.get(register.id) ?? null, closedShifts: closedByRegister.get(register.id) ?? [] }));
    });
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return result.filter((row) => {
      if (sessionView === 'open' && !row.shift) return false;
      if (sessionView === 'closed' && row.closedShifts.length === 0) return false;
      return !normalizedQuery || [row.warehouse.name, row.warehouse.warehouseCode, row.register?.name, row.register?.code].filter(Boolean).some((value) => String(value).toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [context?.warehouses, query, registers, sessionView, shifts]);

  const provision = async (warehouseId: number) => {
    setSaving(true); setError(''); setNotice('');
    try {
      const register = await posBackendApi.ensureCashRegisterForWarehouse(warehouseId);
      setNotice(`${register.code} · ${register.name} quedó disponible para abrir turno.`);
      await reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible preparar la caja.');
    } finally { setSaving(false); }
  };

  const create = async (payload: PosCashRegisterCreatePayload) => {
    setSaving(true); setError(''); setNotice('');
    try {
      const register = await posBackendApi.createCashRegister(payload);
      setCreating(false);
      setNotice(`${register.code} · ${register.name} fue creada.`);
      await reload();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible crear la caja.'); }
    finally { setSaving(false); }
  };

  const update = async (payload: PosCashRegisterCreatePayload) => {
    if (!editing) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const register = await posBackendApi.updateCashRegister(editing.id, payload);
      setEditing(null);
      setNotice(`${register.code} · ${register.name} fue actualizada.`);
      await reload();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible actualizar la caja.'); }
    finally { setSaving(false); }
  };

  const activeCount = registers.filter((register) => register.active && register.status === 'ACTIVE').length;
  const openCount = shifts.filter((shift) => shift.status === 'OPEN' || shift.status === 'CLOSING').length;
  const closedToday = shifts.filter((shift) => shift.status === 'CLOSED' && isToday(shift.closedAt || shift.openedAt));
  const todaySummaries = Object.values(summaries);
  const todaySales = todaySummaries.reduce((total, summary) => total + Number(summary.totalSalesAmount || 0), 0);
  const todayTickets = todaySummaries.reduce((total, summary) => total + Number(summary.ticketsCount || 0), 0);
  const todayCurrency = todaySummaries[0]?.currencyCode || 'MXN';
  const toggleRegister = (registerId: number) => setExpandedRegisters((current) => {
    const next = new Set(current);
    if (next.has(registerId)) next.delete(registerId); else next.add(registerId);
    return next;
  });

  return <div className="space-y-5">
    <PointOfSaleTitleBar
      icon={<Monitor className="h-6 w-6" />}
      eyebrow="Administración operativa"
      title="Cajas"
      subtitle="Administra las cajas ligadas a cada almacén y consulta quién tiene un turno abierto."
      actions={<div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => void reload()} className={pointOfSaleTitleBarSecondaryActionClassName}><RefreshCw className="h-4 w-4" />Actualizar</button>
        <button type="button" onClick={() => setCreating(true)} className={pointOfSaleTitleBarPrimaryActionClassName}><Plus className="h-4 w-4" />Nueva caja</button>
      </div>}
    />

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Metric label="Cajas activas" value={activeCount} icon={<Monitor className="h-5 w-5" />} />
      <Metric label="Turnos abiertos" value={openCount} icon={<Building2 className="h-5 w-5" />} />
      <Metric label="Cortes cerrados hoy" value={closedToday.length} icon={<CheckCircle2 className="h-5 w-5" />} />
      <Metric label="Ventas de hoy" value={formatMoney(todaySales, todayCurrency)} icon={<Activity className="h-5 w-5" />} />
      <Metric label="Tickets de hoy" value={todayTickets} icon={<ReceiptText className="h-5 w-5" />} />
      <Metric label="Ticket promedio del día" value={formatMoney(todayTickets > 0 ? todaySales / todayTickets : 0, todayCurrency)} icon={<CircleDollarSign className="h-5 w-5" />} />
    </div>

    {(error || notice) ? <div className={`rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || notice}</div> : null}

    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 dark:border-slate-700">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-medium text-slate-950 dark:text-white">Operación de cajas del día</h2><p className="text-sm text-slate-500 dark:text-slate-300">Supervisa sesiones abiertas y conserva visibles los cortes cerrados hoy.</p>{lastLiveUpdate ? <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700"><Activity className="h-3.5 w-3.5" />En vivo · actualizado {lastLiveUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p> : null}</div>
        <label className="relative block sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar almacén o caja" className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm dark:border-slate-600 dark:bg-slate-950" /></label></div>
        <div className="flex flex-wrap gap-2">{([['all', 'Todas las cajas'], ['open', `Sesiones abiertas (${openCount})`], ['closed', `Cortes de hoy (${closedToday.length})`]] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setSessionView(id)} className={`min-h-10 rounded-lg border px-4 text-sm font-medium transition ${sessionView === id ? 'border-[#FF6B5E] bg-[#FF6B5E] text-[#222831]' : 'border-slate-200 bg-white text-slate-600 hover:border-[#FF6B5E]/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>{label}</button>)}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-950/60 dark:text-slate-300"><tr><th className="w-12 px-3 py-3"><span className="sr-only">Expandir</span></th><th className="px-4 py-3 font-medium">Almacén</th><th className="px-4 py-3 font-medium">Unidad</th><th className="px-4 py-3 font-medium">Negocio</th><th className="px-4 py-3 font-medium">Caja</th><th className="px-4 py-3 font-medium">Estado</th><th className="px-4 py-3 font-medium">Responsable actual</th><th className="px-4 py-3 text-right font-medium">Acciones</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Cargando cajas…</td></tr> : rows.map(({ warehouse, register, shift, closedShifts }) => {
              const expanded = register ? expandedRegisters.has(register.id) : false;
              const summary = shift ? summaries[shift.id] : undefined;
              return [<tr key={`${warehouse.id}-${register?.id ?? 'missing'}`} className={expanded ? 'bg-[#FFF8F7] dark:bg-[#FF6B5E]/5' : undefined}>
                <td className="px-3 py-4">{register ? <button type="button" onClick={() => toggleRegister(register.id)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-[#FF6B5E] hover:text-[#B63B32] dark:border-slate-700" aria-label={expanded ? 'Contraer caja' : 'Expandir caja'}>{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button> : null}</td>
                <td className="px-4 py-4"><strong className="block font-medium text-slate-950 dark:text-white">{warehouse.name}</strong><span className="text-xs text-slate-500">{warehouse.warehouseCode || `Almacén ${warehouse.id}`}</span></td>
                <td className="px-4 py-4 text-slate-700 dark:text-slate-200">{warehouse.unitName || (warehouse.unitId ? `Unidad ${warehouse.unitId}` : 'No vinculada')}</td>
                <td className="px-4 py-4 text-slate-700 dark:text-slate-200">{warehouse.businessName || (warehouse.businessId ? `Negocio ${warehouse.businessId}` : 'No vinculado')}</td>
                <td className="px-4 py-4">{register ? <><strong className="block font-medium text-slate-900 dark:text-white">{register.name}</strong><span className="text-xs text-slate-500">{register.code}</span></> : <span className="text-slate-500">Sin caja configurada</span>}</td>
                <td className="px-4 py-4"><StatusBadge register={register} shift={shift} closedToday={closedShifts.length > 0} /></td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{shift ? `${userNames[shift.openedByUserId] || `Usuario ${shift.openedByUserId}`} · ${new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : closedShifts.length > 0 ? `${closedShifts.length} corte${closedShifts.length === 1 ? '' : 's'} cerrado${closedShifts.length === 1 ? '' : 's'} hoy` : 'Disponible'}</td>
                <td className="px-4 py-4 text-right">{register ? <button type="button" onClick={() => setEditing(register)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"><Pencil className="h-4 w-4" />Editar</button> : <button type="button" disabled={saving} onClick={() => void provision(warehouse.id)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#FF6B5E] px-3 font-medium text-[#222831] disabled:opacity-60"><Plus className="h-4 w-4" />Preparar caja</button>}</td>
              </tr>, expanded && register ? <tr key={`session-${register.id}`}><td colSpan={8} className="bg-slate-50 px-6 py-5 dark:bg-slate-950/50"><SessionFolder register={register} shift={shift} summary={summary} userName={shift ? userNames[shift.openedByUserId] : undefined} closedShifts={closedShifts} summaries={summaries} userNames={userNames} /></td></tr> : null];
            })}
            {!loading && rows.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500">No hay resultados para esta búsqueda.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>

    <CreateCashRegisterModal isOpen={creating} warehouses={context?.warehouses ?? []} isSubmitting={saving} onClose={() => setCreating(false)} onConfirm={create} />
    {editing ? <EditRegisterModal register={editing} warehouses={context?.warehouses ?? []} saving={saving} onClose={() => setEditing(null)} onSave={update} /> : null}
  </div>;
}

function Metric({ label, value, icon, warning = false }: { label: string; value: number | string; icon: React.ReactNode; warning?: boolean }) {
  return <div className={`rounded-lg border bg-white p-4 dark:bg-slate-900 ${warning ? 'border-orange-300 dark:border-orange-500/40' : 'border-slate-200 dark:border-slate-700'}`}><div className="flex items-center justify-between text-slate-500"><span className="text-sm">{label}</span>{icon}</div><strong className="mt-2 block text-2xl font-medium text-slate-950 dark:text-white">{value}</strong></div>;
}

function SessionFolder({ register, shift, summary, userName, closedShifts, summaries, userNames }: {
  register: PosCashRegisterResponse;
  shift: PosShiftResponse | null;
  summary?: PosShiftClosingSummaryResponse;
  userName?: string;
  closedShifts: PosShiftResponse[];
  summaries: Record<number, PosShiftClosingSummaryResponse>;
  userNames: Record<number, string>;
}) {
  if (!shift && closedShifts.length === 0) return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><Monitor className="h-5 w-5" /></div><div><strong className="font-medium text-slate-950 dark:text-white">Caja disponible</strong><p className="text-sm text-slate-500">{register.name} no tiene actividad registrada hoy.</p></div></div></div>;

  const orderedClosedShifts = [...closedShifts].sort((left, right) => new Date(right.closedAt || right.openedAt).getTime() - new Date(left.closedAt || left.openedAt).getTime());
  return <div className="space-y-4">
    {shift ? <OpenSessionCard shift={shift} summary={summary} userName={userName} /> : null}
    {orderedClosedShifts.length > 0 ? <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300"><CheckCircle2 className="h-4 w-4 text-violet-600" />Cortes cerrados hoy ({orderedClosedShifts.length})</div>
      {orderedClosedShifts.map((closedShift) => <ClosedSessionCard key={closedShift.id} shift={closedShift} summary={summaries[closedShift.id]} userName={userNames[closedShift.openedByUserId]} closedByUserName={closedShift.closedByUserId ? userNames[closedShift.closedByUserId] : undefined} />)}
    </div> : null}
  </div>;
}

function OpenSessionCard({ shift, summary, userName }: { shift: PosShiftResponse; summary?: PosShiftClosingSummaryResponse; userName?: string }) {
  const currency = summary?.currencyCode || shift.currencyCode;
  return <div className="rounded-lg border border-[#FF6B5E]/25 bg-white p-5 dark:bg-slate-900">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" /><strong className="font-medium text-slate-950 dark:text-white">Sesión abierta · Turno {shift.id}</strong></div><p className="mt-1 text-sm text-slate-500">{userName || `Usuario ${shift.openedByUserId}`} · inició {new Date(shift.openedAt).toLocaleString()}</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">Monitoreo en tiempo real</span></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <LiveValue icon={<CircleDollarSign className="h-4 w-4" />} label="Venta acumulada" value={summary ? formatMoney(Number(summary.totalSalesAmount), currency) : 'Actualizando…'} highlight />
      <LiveValue icon={<ReceiptText className="h-4 w-4" />} label="Tickets" value={summary ? String(summary.ticketsCount) : '—'} />
      <LiveValue icon={<ReceiptText className="h-4 w-4" />} label="Ticket promedio" value={summary ? formatMoney(summary.ticketsCount > 0 ? Number(summary.totalSalesAmount) / summary.ticketsCount : 0, currency) : '—'} />
      <LiveValue icon={<CircleDollarSign className="h-4 w-4" />} label="Venta en efectivo" value={summary ? formatMoney(Number(summary.cashSalesAmount), currency) : '—'} />
      <LiveValue icon={<CircleDollarSign className="h-4 w-4" />} label="Efectivo esperado" value={summary ? formatMoney(Number(summary.expectedCashAmount), currency) : '—'} />
      <LiveValue icon={<CircleDollarSign className="h-4 w-4" />} label="Fondo inicial" value={summary ? formatMoney(Number(summary.openingCashAmount), currency) : formatMoney(Number(shift.openingAmount || 0), currency)} />
    </div>
  </div>;
}

function ClosedSessionCard({ shift, summary, userName, closedByUserName }: { shift: PosShiftResponse; summary?: PosShiftClosingSummaryResponse; userName?: string; closedByUserName?: string }) {
  const currency = summary?.currencyCode || shift.currencyCode;
  const tickets = summary?.ticketsCount ?? 0;
  const sales = Number(summary?.totalSalesAmount || 0);
  const difference = Number(summary?.overShortAmount ?? shift.overShortAmount ?? 0);
  return <div className="rounded-lg border border-violet-200 bg-white p-5 dark:border-violet-500/30 dark:bg-slate-900">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-violet-100 text-violet-700"><CheckCircle2 className="h-4 w-4" /></span><strong className="font-medium text-slate-950 dark:text-white">Corte cerrado · Turno {shift.id}</strong></div><p className="mt-1 text-sm text-slate-500">{userName || `Usuario ${shift.openedByUserId}`} · {new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} a {shift.closedAt ? new Date(shift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}{closedByUserName ? ` · cerró ${closedByUserName}` : ''}</p></div><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800">Sesión cerrada</span></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <LiveValue icon={<CircleDollarSign className="h-4 w-4" />} label="Venta del corte" value={summary ? formatMoney(sales, currency) : 'Actualizando…'} highlight />
      <LiveValue icon={<ReceiptText className="h-4 w-4" />} label="Tickets" value={summary ? String(tickets) : '—'} />
      <LiveValue icon={<ReceiptText className="h-4 w-4" />} label="Ticket promedio" value={summary ? formatMoney(tickets > 0 ? sales / tickets : 0, currency) : '—'} />
      <LiveValue icon={<CircleDollarSign className="h-4 w-4" />} label="Efectivo esperado" value={summary ? formatMoney(Number(summary.expectedCashAmount), currency) : '—'} />
      <LiveValue icon={<CircleDollarSign className="h-4 w-4" />} label="Efectivo contado" value={summary ? formatMoney(Number(summary.countedCashAmount || 0), currency) : '—'} />
      <LiveValue icon={<CircleDollarSign className="h-4 w-4" />} label="Diferencia" value={summary ? formatMoney(difference, currency) : '—'} alert={Boolean(summary && Math.abs(difference) >= 0.01)} />
    </div>
  </div>;
}

function LiveValue({ icon, label, value, highlight = false, alert = false }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean; alert?: boolean }) {
  const tone = alert ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10' : highlight ? 'border-[#FF6B5E]/30 bg-[#FFF3F1] dark:bg-[#FF6B5E]/10' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/60';
  return <div className={`rounded-lg border p-3 ${tone}`}><div className={`flex items-center gap-1.5 text-xs ${alert ? 'text-red-600' : 'text-slate-500'}`}>{icon}{label}</div><strong className={`mt-1 block text-base font-medium ${alert ? 'text-red-700 dark:text-red-300' : 'text-slate-950 dark:text-white'}`}>{value}</strong></div>;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
}

function isToday(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
}

function StatusBadge({ register, shift, closedToday }: { register: PosCashRegisterResponse | null; shift: PosShiftResponse | null; closedToday: boolean }) {
  const label = !register ? 'Requiere caja' : shift ? (shift.status === 'CLOSING' ? 'En cierre' : 'Turno abierto') : closedToday ? 'Cerrada hoy' : register.active && register.status === 'ACTIVE' ? 'Disponible' : 'Inactiva';
  const tone = !register ? 'bg-orange-100 text-orange-800' : shift ? 'bg-sky-100 text-sky-800' : closedToday ? 'bg-violet-100 text-violet-800' : register.active && register.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{label}</span>;
}

function EditRegisterModal({ register, warehouses, saving, onClose, onSave }: { register: PosCashRegisterResponse; warehouses: PosWarehouseSummary[]; saving: boolean; onClose: () => void; onSave: (payload: PosCashRegisterCreatePayload) => Promise<void> }) {
  const [warehouseId, setWarehouseId] = useState(String(register.warehouseId));
  const [code, setCode] = useState(register.code);
  const [name, setName] = useState(register.name);
  const [active, setActive] = useState(register.active && register.status === 'ACTIVE');
  const payload = { warehouseId: Number(warehouseId), code: code.trim().toUpperCase(), name: name.trim(), status: active ? 'ACTIVE' as const : 'INACTIVE' as const, active, notes: register.notes };
  return <PosModalFrame modalType="standard-form" closeLabel="Cerrar edición" eyebrow="Administración de cajas" icon={<Pencil className="h-6 w-6" />} isCloseDisabled={saving} onClose={onClose} size="md" subtitle="Actualiza identidad, almacén y disponibilidad operativa." title="Editar caja" tone="coral" footerClassName={posModalModuleFooterClassName} footerLeading={<button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>Cancelar</button>} footer={<button type="button" disabled={saving || !code.trim() || !name.trim()} onClick={() => void onSave(payload)} className={posModalPrimaryActionClassName}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>}>
    <div className="space-y-4"><label className="block text-sm font-medium">Almacén<select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-950">{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Código<input value={code} onChange={(event) => setCode(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 dark:border-slate-600 dark:bg-slate-950" /></label><label className="block text-sm font-medium">Nombre<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 dark:border-slate-600 dark:bg-slate-950" /></label></div><label className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-700"><span><strong className="block text-sm font-medium">Caja activa</strong><span className="text-xs text-slate-500">Permite abrir nuevos turnos en esta caja.</span></span><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-5 w-5" /></label></div>
  </PosModalFrame>;
}
