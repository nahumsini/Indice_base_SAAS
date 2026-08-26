import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Armchair, BellRing, ChefHat, CircleCheckBig, Clock3, Flame, LayoutGrid, Loader2, LogOut, Maximize2, Minimize2, Minus, Plus, RefreshCw, TriangleAlert, UtensilsCrossed } from 'lucide-react';
import { useParams } from 'react-router';
import { KioskIdentityGate } from '../../../components/kiosk-engine/KioskIdentityGate';
import { KioskPublicShell } from '../../../components/kiosk-engine/KioskPublicShell';
import { useKioskSessionBoundary } from '../../../components/kiosk-engine/useKioskSessionBoundary';
import { ApiClientError } from '../../../lib/apiClient';
import {
  restaurantKioskApi,
  type KitchenItem,
  type RestaurantBootstrap,
  type RestaurantItem,
  type RestaurantOrder,
  type RestaurantSession,
  type RestaurantWorkspace,
} from './restaurantKioskApi';
import {
  initialTableId,
  RestaurantFloorPlanPanel,
  WaiterStationWorkspace,
  type RestaurantWorkspaceMutation,
} from './WaiterStationWorkspace';

export default function RestaurantKioskPage() {
  const { publicAccessToken = '' } = useParams();
  const [bootstrap, setBootstrap] = useState<RestaurantBootstrap | null>(null);
  const [session, setSession] = useState<RestaurantSession | null>(null);
  const [workspace, setWorkspace] = useState<RestaurantWorkspace | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const stationRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    restaurantKioskApi.bootstrap(publicAccessToken)
      .then(value => { if (active) { setBootstrap(value); setError(''); } })
      .catch(failure => active && setError(failure instanceof Error ? failure.message : 'Este kiosco no está disponible.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [publicAccessToken]);

  const expireSession = useCallback(() => {
    setSession(null);
    setWorkspace(null);
    setNotice('');
    setError('');
    setBusy(false);
    setSessionMessage('La sesión de la estación cambió o venció. Ingresa tu PIN nuevamente para continuar.');
  }, []);

  const recoverTerminalSessionFailure = useCallback((failure: unknown) => {
    if (!isTerminalStationSessionFailure(failure)) return false;
    expireSession();
    return true;
  }, [expireSession]);

  const refresh = useCallback(async () => {
    if (!bootstrap || !session) return;
    try {
      const value = await restaurantKioskApi.action<RestaurantWorkspace>(
        publicAccessToken, 'pos.restaurant.workspace.read', session, bootstrap.csrfToken,
      );
      setWorkspace(value);
    } catch (failure) {
      if (recoverTerminalSessionFailure(failure)) return;
      throw failure;
    }
  }, [bootstrap, publicAccessToken, recoverTerminalSessionFailure, session]);

  useEffect(() => {
    if (!session) return;
    void refresh().catch(failure => setError(failure instanceof Error ? failure.message : 'No fue posible cargar la operación.'));
    const interval = window.setInterval(() => void refresh().catch(() => undefined), 5_000);
    return () => window.clearInterval(interval);
  }, [refresh, session]);

  const { isSessionExpiring } = useKioskSessionBoundary({
    active: Boolean(session),
    expiresAt: session?.expiresAt,
    inactivityTimeoutSeconds: 180,
    onExpire: expireSession,
  });

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === stationRootRef.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const authenticate = async () => {
    if (!bootstrap) return;
    setBusy(true); setError(''); setSessionMessage('');
    try {
      const value = await restaurantKioskApi.authenticate(publicAccessToken, pin, bootstrap.csrfToken);
      setWorkspace(null); setSession(value); setPin('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No fue posible validar el PIN.');
    } finally { setBusy(false); }
  };

  const mutate = async (capability: string, payload: Record<string, unknown>, success: string) => {
    if (!bootstrap || !session) return false;
    setBusy(true); setError(''); setNotice('');
    try {
      setWorkspace(await restaurantKioskApi.action<RestaurantWorkspace>(publicAccessToken, capability, session, bootstrap.csrfToken, payload, true));
      setNotice(success);
      return true;
    } catch (failure) {
      if (recoverTerminalSessionFailure(failure)) return false;
      setError(failure instanceof Error ? failure.message : 'No fue posible completar la acción.');
      return false;
    } finally { setBusy(false); }
  };

  const toggleFullscreen = async () => {
    setError('');
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (!stationRootRef.current?.requestFullscreen) {
        setError('La pantalla completa no está disponible en este dispositivo.');
        return;
      }
      await stationRootRef.current.requestFullscreen();
    } catch {
      setError('No fue posible activar la pantalla completa. Inténtalo nuevamente.');
    }
  };

  const closeSession = () => {
    setSession(null);
    setWorkspace(null);
    setNotice('');
    setSessionMessage('');
    if (document.fullscreenElement === stationRootRef.current) void document.exitFullscreen();
  };

  const Icon = bootstrap?.kioskType === 'kitchen_display' ? ChefHat : bootstrap?.kioskType === 'table_order_center' ? LayoutGrid : UtensilsCrossed;
  return (
    <div ref={stationRootRef} className="bg-slate-100 dark:bg-slate-950" data-restaurant-kiosk-root>
      <KioskPublicShell
        moduleScope="POINT_OF_SALE_RESTAURANT"
        minimalContent
        lockDesktopViewport={Boolean(session)}
        maxWidthClassName="max-w-none"
        errorMessage={error}
        sessionExpiredMessage={sessionMessage || (isSessionExpiring ? 'La sesión de la estación vencerá en menos de un minuto.' : null)}
        successMessage={notice}
        loadingOverlay={loading || busy ? <div className="fixed inset-0 z-[200] grid place-items-center bg-white/65 backdrop-blur-sm dark:bg-slate-950/65"><Loader2 className="h-8 w-8 animate-spin text-[#FF6B5E]" /></div> : null}
        header={bootstrap ? <header className="flex min-h-16 flex-wrap items-center gap-3 bg-[#222831] px-4 py-3 text-white"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF6B5E] text-[#222831]"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h1 className="truncate text-base font-medium">{bootstrap.name}</h1><p className="truncate text-xs text-slate-300">{bootstrap.ecosystemName}{session ? ` · ${session.user.name}` : ''}</p></div>{session ? <div className="flex items-center gap-2"><button type="button" onClick={() => void refresh()} aria-label="Actualizar estación" title="Actualizar estación" className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/5 transition hover:bg-white/10"><RefreshCw className="h-4 w-4" /></button><button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? 'Salir de pantalla completa' : 'Activar pantalla completa'} aria-pressed={fullscreen} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white px-3 text-sm font-medium text-[#222831] transition hover:bg-slate-100">{fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}<span className="hidden sm:inline">{fullscreen ? 'Salir de pantalla' : 'Pantalla completa'}</span></button><button type="button" onClick={closeSession} aria-label="Cerrar sesión" title="Cerrar sesión" className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/5 text-[#FFB0AA] transition hover:bg-white/10"><LogOut className="h-4 w-4" /></button></div> : null}</header> : <div />}
      >
        {bootstrap && !session ? <KioskIdentityGate tone="coral" title="Identifícate para comenzar" description="Usa tu PIN personal de colaborador de 5 dígitos." privacyMessage="Las mesas y comandas solo serán visibles después de validar tu identidad." pinLength={5} pinValue={pin} onPinChange={setPin} onSubmit={() => void authenticate()} isSubmitting={busy} pinAriaLabel="PIN personal" submitLabel="Entrar a la estación" clearLabel="Limpiar" backspaceLabel="Borrar" /> : null}
        {workspace && !workspace.sourceRegisterOpen ? <div role="status" className="mx-3 mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">La caja de liquidación está cerrada. La operación del turno anterior quedó archivada; abre un nuevo turno para comenzar con cocina y mesas limpias.</div> : null}
        {workspace?.kioskType === 'waiter_station' ? <WaiterStationWorkspace workspace={workspace} mutate={mutate} /> : null}
        {workspace?.kioskType === 'table_order_center' ? <OrderCenterWorkspace workspace={workspace} mutate={mutate} /> : null}
        {workspace?.kioskType === 'kitchen_display' ? <KitchenWorkspace workspace={workspace} mutate={mutate} /> : null}
      </KioskPublicShell>
    </div>
  );
}

function OrderCenterWorkspace({ workspace, mutate }: { workspace: RestaurantWorkspace; mutate: RestaurantWorkspaceMutation }) {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(() => initialTableId(workspace.tables));
  const [guestCount, setGuestCount] = useState(1);
  const [now, setNow] = useState(() => Date.now());
  const selectedTable = workspace.tables.find(table => table.id === selectedTableId);
  const selectedOrder = workspace.orders.find(order => order.id === selectedTable?.orderId)
    ?? workspace.orders.find(order => order.tableId === selectedTableId);
  const selectedTableCanAssign = selectedTable?.status === 'AVAILABLE';

  useEffect(() => {
    if (selectedTableId != null && workspace.tables.some(table => table.id === selectedTableId)) return;
    setSelectedTableId(initialTableId(workspace.tables));
  }, [selectedTableId, workspace.tables]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const selectTable = (table: RestaurantWorkspace['tables'][number]) => {
    setSelectedTableId(table.id);
    setGuestCount(Math.max(1, table.guestCount || 1));
  };

  const assignSelectedTable = async () => {
    if (!selectedTable) return;
    await mutate(
      'pos.restaurant.order.open',
      { tableId: selectedTable.id, guestCount },
      `${selectedTable.name} fue asignada correctamente.`,
    );
  };

  const monitors = useMemo(() => workspace.orders.map(buildCaptainMonitor), [workspace.orders]);
  const orderedMonitors = [...monitors].sort((left, right) => {
    const leftSelected = left.order.tableId === selectedTableId ? 1 : 0;
    const rightSelected = right.order.tableId === selectedTableId ? 1 : 0;
    if (leftSelected !== rightSelected) return rightSelected - leftSelected;
    const priorityDifference = captainPriority(right, now) - captainPriority(left, now);
    if (priorityDifference !== 0) return priorityDifference;
    return captainTimestamp(left.oldestActiveSentAt) - captainTimestamp(right.oldestActiveSentAt)
      || left.order.tableName.localeCompare(right.order.tableName, 'es', { numeric: true });
  });
  const stats = monitors.reduce((result, monitor) => {
    result.received += monitor.counts.received;
    result.preparing += monitor.counts.preparing;
    result.ready += monitor.counts.ready;
    if (activeServiceElapsed(monitor.order, now).seconds >= 15 * 60) result.delayed += 1;
    return result;
  }, { received: 0, preparing: 0, ready: 0, delayed: 0 });

  return (
    <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-2" data-order-center-workspace>
      <RestaurantFloorPlanPanel
        mutate={mutate}
        onSelectTable={selectTable}
        selectedTableId={selectedTableId}
        workspace={workspace}
      />

      <section className="flex min-h-[38rem] min-w-0 flex-col overflow-hidden rounded-xl border border-[#222831]/10 bg-white dark:border-slate-700 dark:bg-slate-950 xl:min-h-0">
        <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-medium">Monitor del capitán</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {selectedTable ? `${selectedTable.name} seleccionada · hostess, cocina y tiempos por etapa` : 'Asignación de mesas y seguimiento del servicio'}
              </p>
            </div>
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-emerald-50 px-3 text-xs font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200" title="Los datos se sincronizan automáticamente cada 5 segundos">
              <Activity aria-hidden="true" className="h-4 w-4 animate-pulse" /> En vivo · 5 s
            </span>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-4" data-captain-kpis>
          <CaptainKpi icon={BellRing} label="Recibidas" tone="coral" value={stats.received} />
          <CaptainKpi icon={Flame} label="En preparación" tone="blue" value={stats.preparing} />
          <CaptainKpi icon={CircleCheckBig} label="Listas para servir" tone="green" value={stats.ready} />
          <CaptainKpi icon={TriangleAlert} label="Con demora" tone="red" value={stats.delayed} valueLabel={stats.delayed === 1 ? 'mesa' : 'mesas'} />
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#F7F8FA] p-3 dark:bg-slate-900/60" data-captain-monitor>
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Ordenado por mesa seleccionada, atención y antigüedad</span>
            <span><strong className="text-slate-700 dark:text-slate-200">SLA visual:</strong> atención 8 min · demora 15 min</span>
          </div>
          {selectedTable && !selectedOrder && selectedTableCanAssign ? (
            <HostessAssignmentPanel
              guestCount={guestCount}
              onAssign={assignSelectedTable}
              onGuestCountChange={setGuestCount}
              sourceRegisterOpen={workspace.sourceRegisterOpen}
              tableName={selectedTable.name}
            />
          ) : null}
          {selectedTable && !selectedOrder && !selectedTableCanAssign ? (
            <div className="grid min-h-44 place-items-center rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
              <div><Armchair className="mx-auto h-8 w-8" /><p className="mt-3 font-medium">{selectedTable.name} no está disponible</p><p className="mt-1 text-xs">Su estado operativo es {selectedTable.status.toLowerCase().replace(/_/g, ' ')}.</p></div>
            </div>
          ) : null}
          {orderedMonitors.length === 0 ? (
            selectedTable && !selectedOrder ? null : <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-950">
              <div><LayoutGrid className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-lg font-medium">No hay comandas abiertas</p><p className="mt-1 text-sm text-slate-500">Selecciona una mesa disponible para asignarla como hostess.</p></div>
            </div>
          ) : orderedMonitors.map(monitor => (
            <CaptainOrderCard
              key={monitor.order.id}
              monitor={monitor}
              mutate={mutate}
              now={now}
              selected={monitor.order.tableId === selectedTableId}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function HostessAssignmentPanel({ guestCount, onAssign, onGuestCountChange, sourceRegisterOpen, tableName }: {
  guestCount: number;
  onAssign: () => Promise<void>;
  onGuestCountChange: (value: number) => void;
  sourceRegisterOpen: boolean;
  tableName: string;
}) {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-500/25 dark:bg-slate-950" data-hostess-assignment>
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"><Armchair aria-hidden="true" className="h-7 w-7" /></span>
        <h3 className="mt-3 text-xl font-medium">{tableName} está disponible</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Asigna a los comensales y comienza el cronómetro de atención de la mesa.</p>
        <div className="mx-auto mt-5 max-w-xs rounded-2xl bg-slate-100 p-3 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Número de personas</p>
          <div className="mt-2 grid grid-cols-[3rem_1fr_3rem] items-center gap-3">
            <button aria-label="Quitar una persona" className="grid h-12 place-items-center rounded-xl border border-slate-200 bg-white disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950" disabled={guestCount <= 1} onClick={() => onGuestCountChange(Math.max(1, guestCount - 1))} type="button"><Minus className="h-5 w-5" /></button>
            <strong className="text-3xl font-medium tabular-nums">{guestCount}</strong>
            <button aria-label="Agregar una persona" className="grid h-12 place-items-center rounded-xl border border-slate-200 bg-white disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950" disabled={guestCount >= 1000} onClick={() => onGuestCountChange(Math.min(1000, guestCount + 1))} type="button"><Plus className="h-5 w-5" /></button>
          </div>
        </div>
        <button className="mt-5 min-h-14 w-full rounded-xl bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831] shadow-[0_8px_18px_rgba(255,107,94,0.24)] transition hover:bg-[#ff5d50] disabled:cursor-not-allowed disabled:opacity-45" disabled={!sourceRegisterOpen} onClick={() => void onAssign()} type="button">Asignar mesa e iniciar servicio</button>
        {!sourceRegisterOpen ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Abre la caja de liquidación para asignar nuevas mesas.</p> : null}
      </div>
    </section>
  );
}

type CaptainStage = 'SENT' | 'PREPARING' | 'READY' | 'SERVED';
type CaptainCounts = { received: number; preparing: number; ready: number; served: number; draft: number };
type CaptainRound = {
  key: string;
  roundNumber?: number;
  sentAt?: string;
  status: CaptainStage;
  itemCount: number;
};
type CaptainMonitor = {
  order: RestaurantOrder;
  counts: CaptainCounts;
  rounds: CaptainRound[];
  oldestActiveSentAt?: string;
};

function CaptainKpi({ icon: Icon, label, tone, value, valueLabel = 'partidas' }: {
  icon: typeof BellRing;
  label: string;
  tone: 'coral' | 'blue' | 'green' | 'red';
  value: number;
  valueLabel?: string;
}) {
  const tones = {
    coral: 'bg-[#FFF1EF] text-[#C7443A] dark:bg-rose-500/10 dark:text-rose-200',
    blue: 'bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200',
    green: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200',
    red: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200',
  } as const;
  return (
    <div className={`flex min-h-20 items-center gap-3 rounded-xl px-3 py-2 ${tones[tone]}`}>
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      <div className="min-w-0"><p className="truncate text-[11px] font-medium">{label}</p><p className="mt-0.5 text-xl font-medium leading-none">{value} <span className="text-[10px] font-normal">{valueLabel}</span></p></div>
    </div>
  );
}

function CaptainOrderCard({ monitor, mutate, now, selected }: {
  monitor: CaptainMonitor;
  mutate: RestaurantWorkspaceMutation;
  now: number;
  selected: boolean;
}) {
  const { order, counts } = monitor;
  const stageElapsed = activeServiceElapsed(order, now);
  const totalElapsed = captainElapsed(order.createdAt, now);
  const attention = captainAttention(monitor, stageElapsed.seconds);
  const activeItems = order.items.filter(item => !['CANCELLED', 'VOIDED'].includes(item.status));
  const canSendToRegister = activeItems.length > 0
    && activeItems.every(item => item.status === 'SERVED')
    && !['READY_FOR_CHECKOUT', 'CLAIMED_FOR_CHECKOUT'].includes(order.status);

  return (
    <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-950 ${selected ? 'border-[#FF6B5E] ring-4 ring-[#FF6B5E]/10' : attention.borderClass}`} data-captain-order>
      <div className={`h-1.5 ${attention.railClass}`} />
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium text-[#222831] dark:text-white">{order.tableName}</h3>
            <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${attention.badgeClass}`}>{attention.label}</span>
          </div>
          <p className="mt-1 truncate font-mono text-[10px] text-slate-400" title={order.orderNumber}>{order.orderNumber}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{order.guestCount} {order.guestCount === 1 ? 'persona' : 'personas'} · {order.items.length} partidas · {order.responsibleWaiterName ? `Mesero ${order.responsibleWaiterName}` : 'Mesero por asignar'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-[#222831] dark:text-white">{money(order.totalAmount)}</p>
          <p className="mt-1 text-[10px] text-slate-400">Tiempo en mesa</p>
          <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-xs font-medium ${attention.timerClass}`} title={totalElapsed.title}>
            <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />{totalElapsed.label}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 px-3 py-3" aria-label={`Flujo de cocina de ${order.tableName}`}>
        <CaptainStageMetric icon={BellRing} label="Recibidas" tone="coral" value={counts.received} />
        <CaptainStageMetric icon={Flame} label="Preparando" tone="blue" value={counts.preparing} />
        <CaptainStageMetric icon={CircleCheckBig} label="Listas" tone="green" value={counts.ready} />
      </div>

      <CaptainServiceTimeline now={now} order={order} />

      {monitor.rounds.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-3 py-2.5 dark:border-slate-800" data-captain-rounds>
          {monitor.rounds.slice(0, 4).map(round => {
            const roundElapsed = captainElapsed(round.sentAt, now);
            return <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200" key={round.key}><strong>R{round.roundNumber ?? '—'}</strong><span>{captainStageLabel(round.status)}</span><span className="font-mono text-slate-500">{roundElapsed.label}</span></span>;
          })}
          {monitor.rounds.length > 4 ? <span className="inline-flex min-h-8 items-center rounded-lg bg-slate-100 px-2.5 text-[11px] dark:bg-slate-800">+{monitor.rounds.length - 4} rondas</span> : null}
        </div>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="text-xs">
          <p className={`font-medium ${attention.messageClass}`}>{attention.message}</p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{counts.served} servidas · {counts.draft} por enviar</p>
        </div>
        {canSendToRegister ? (
          <button className="min-h-11 rounded-xl bg-[#FF6B5E] px-4 text-xs font-medium text-[#222831] shadow-[0_6px_16px_rgba(255,107,94,0.2)] transition hover:bg-[#ff5d50]" onClick={() => void mutate('pos.restaurant.check.request', { orderId: order.id }, 'La cuenta se envió a caja.')} type="button">Enviar a caja</button>
        ) : <span className="rounded-lg bg-slate-100 px-2.5 py-2 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-300">{captainOrderStatus(order.status)}</span>}
      </footer>
    </article>
  );
}

type ServiceTimingStage = {
  key: string;
  label: string;
  startAt?: string;
  endAt?: string;
};

function CaptainServiceTimeline({ now, order }: { now: number; order: RestaurantOrder }) {
  return (
    <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800" data-service-timeline>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[#222831] dark:text-white">Tiempos por etapa</p>
        <span className="text-[10px] text-slate-400">Desde la asignación hasta la cuenta</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {serviceTimingStages(order).map((stage, index) => {
          const active = Boolean(stage.startAt && !stage.endAt);
          const complete = Boolean(stage.startAt && stage.endAt);
          const duration = captainElapsed(stage.startAt, now, stage.endAt);
          return (
            <div className={`min-h-16 rounded-xl border px-2.5 py-2 ${active ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200' : complete ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-500/5 dark:text-emerald-200' : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/70'}`} key={stage.key}>
              <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-medium">{index + 1}. {stage.label}</span>{complete ? <CircleCheckBig aria-label="Etapa completada" className="h-3.5 w-3.5 shrink-0" /> : active ? <Activity aria-label="Etapa activa" className="h-3.5 w-3.5 shrink-0 animate-pulse" /> : null}</div>
              <p className="mt-1 font-mono text-sm font-medium tabular-nums">{stage.startAt ? duration.label : 'Pendiente'}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function serviceTimingStages(order: RestaurantOrder): ServiceTimingStage[] {
  return [
    { key: 'order', label: 'Tomar orden', startAt: order.createdAt, endAt: order.firstItemAt },
    { key: 'send', label: 'Enviar a cocina', startAt: order.firstItemAt, endAt: order.firstRoundSentAt },
    { key: 'kitchen-wait', label: 'Inicio en cocina', startAt: order.firstRoundSentAt, endAt: order.kitchenStartedAt },
    { key: 'preparation', label: 'Preparación', startAt: order.kitchenStartedAt, endAt: order.kitchenReadyAt },
    { key: 'serve', label: 'Servir', startAt: order.kitchenReadyAt, endAt: order.servedAt },
    { key: 'check', label: 'Solicitar cuenta', startAt: order.servedAt, endAt: order.checkRequestedAt },
  ];
}

function activeServiceElapsed(order: RestaurantOrder, now: number) {
  const activeStage = serviceTimingStages(order).find(stage => stage.startAt && !stage.endAt);
  return captainElapsed(activeStage?.startAt, now);
}

function CaptainStageMetric({ icon: Icon, label, tone, value }: { icon: typeof BellRing; label: string; tone: 'coral' | 'blue' | 'green'; value: number }) {
  const tones = {
    coral: 'border-rose-100 bg-[#FFF8F7] text-[#C7443A] dark:border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-200',
    blue: 'border-sky-100 bg-sky-50/70 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/5 dark:text-sky-200',
    green: 'border-emerald-100 bg-emerald-50/70 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-200',
  } as const;
  return <div className={`rounded-xl border px-2 py-2.5 text-center ${tones[tone]}`}><Icon aria-hidden="true" className="mx-auto h-4 w-4" /><p className="mt-1 text-lg font-medium leading-none">{value}</p><p className="mt-1 truncate text-[10px] font-medium">{label}</p></div>;
}

function buildCaptainMonitor(order: RestaurantOrder): CaptainMonitor {
  const counts: CaptainCounts = { received: 0, preparing: 0, ready: 0, served: 0, draft: 0 };
  const roundItems = new Map<string, RestaurantItem[]>();
  order.items.forEach(item => {
    if (item.status === 'DRAFT') counts.draft += 1;
    else if (item.status === 'SENT') counts.received += 1;
    else if (item.status === 'ACKNOWLEDGED' || item.status === 'PREPARING') counts.preparing += 1;
    else if (item.status === 'READY') counts.ready += 1;
    else if (item.status === 'SERVED') counts.served += 1;
    if (!['SENT', 'ACKNOWLEDGED', 'PREPARING', 'READY', 'SERVED'].includes(item.status)) return;
    const key = item.roundId != null ? `round-${item.roundId}` : `legacy-${order.id}`;
    roundItems.set(key, [...(roundItems.get(key) ?? []), item]);
  });
  const rounds = [...roundItems.entries()].map(([key, items]) => ({
    key,
    roundNumber: items.find(item => item.roundNumber != null)?.roundNumber,
    sentAt: oldestItemTimestamp(items),
    status: captainRoundStatus(items),
    itemCount: items.length,
  })).sort((left, right) => captainTimestamp(left.sentAt) - captainTimestamp(right.sentAt));
  const activeItems = order.items.filter(item => ['SENT', 'ACKNOWLEDGED', 'PREPARING', 'READY'].includes(item.status));
  return { order, counts, rounds, oldestActiveSentAt: oldestItemTimestamp(activeItems) };
}

function captainRoundStatus(items: RestaurantItem[]): CaptainStage {
  if (items.some(item => item.status === 'SENT')) return 'SENT';
  if (items.some(item => item.status === 'ACKNOWLEDGED' || item.status === 'PREPARING')) return 'PREPARING';
  if (items.some(item => item.status === 'READY')) return 'READY';
  return 'SERVED';
}

function oldestItemTimestamp(items: RestaurantItem[]) {
  return items.map(item => item.sentAt ?? item.createdAt ?? item.updatedAt).filter((value): value is string => Boolean(value))
    .sort((left, right) => captainTimestamp(left) - captainTimestamp(right))[0];
}

function captainTimestamp(value?: string) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}

function captainElapsed(value: string | undefined, now: number, endValue?: string) {
  const timestamp = captainTimestamp(value);
  if (timestamp === Number.MAX_SAFE_INTEGER) return { seconds: 0, label: '--:--', title: 'Hora de inicio no disponible' };
  const endTimestamp = endValue ? captainTimestamp(endValue) : now;
  const seconds = Math.max(0, Math.floor(((endTimestamp === Number.MAX_SAFE_INTEGER ? now : endTimestamp) - timestamp) / 1_000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;
  const label = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  return { seconds, label, title: `Inició a las ${new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(timestamp))}` };
}

function captainPriority(monitor: CaptainMonitor, now: number) {
  const elapsedSeconds = activeServiceElapsed(monitor.order, now).seconds;
  if (monitor.counts.ready > 0) return 5;
  if (elapsedSeconds >= 15 * 60) return 4;
  if (elapsedSeconds >= 8 * 60) return 3;
  if (monitor.counts.received + monitor.counts.preparing > 0) return 2;
  if (monitor.counts.draft > 0) return 1;
  return 0;
}

function captainAttention(monitor: CaptainMonitor, elapsedSeconds: number) {
  const activeStageLabel = serviceTimingStages(monitor.order).find(stage => stage.startAt && !stage.endAt)?.label;
  if (monitor.counts.ready > 0) return {
    label: 'Listo para servir', message: `${monitor.counts.ready} ${monitor.counts.ready === 1 ? 'partida lista' : 'partidas listas'} para llevar a mesa`,
    railClass: 'bg-emerald-500', borderClass: 'border-emerald-200 dark:border-emerald-500/30', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200', timerClass: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200', messageClass: 'text-emerald-800 dark:text-emerald-200',
  };
  if (elapsedSeconds >= 15 * 60) return {
    label: 'Demora', message: activeStageLabel ? `${activeStageLabel} está fuera del tiempo objetivo` : 'La mesa requiere atención',
    railClass: 'bg-rose-500', borderClass: 'border-rose-300 dark:border-rose-500/40', badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200', timerClass: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200', messageClass: 'text-rose-700 dark:text-rose-200',
  };
  if (elapsedSeconds >= 8 * 60) return {
    label: 'Atención', message: activeStageLabel ? `${activeStageLabel} se acerca al tiempo límite` : 'La mesa se acerca al tiempo límite',
    railClass: 'bg-amber-500', borderClass: 'border-amber-200 dark:border-amber-500/30', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200', timerClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200', messageClass: 'text-amber-800 dark:text-amber-200',
  };
  if (monitor.counts.preparing > 0) return {
    label: 'En preparación', message: 'Cocina está trabajando esta comanda',
    railClass: 'bg-sky-500', borderClass: 'border-sky-200 dark:border-sky-500/30', badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200', timerClass: 'bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200', messageClass: 'text-sky-800 dark:text-sky-200',
  };
  if (monitor.counts.received > 0) return {
    label: 'Recibida', message: 'Comanda recibida por cocina',
    railClass: 'bg-[#FF6B5E]', borderClass: 'border-rose-200 dark:border-rose-500/30', badgeClass: 'bg-[#FFF1EF] text-[#C7443A] dark:bg-rose-500/10 dark:text-rose-200', timerClass: 'bg-[#FFF1EF] text-[#C7443A] dark:bg-rose-500/10 dark:text-rose-200', messageClass: 'text-[#C7443A] dark:text-rose-200',
  };
  return {
    label: monitor.counts.draft > 0 ? 'Por enviar' : 'Servicio completo', message: monitor.counts.draft > 0 ? 'El mesero aún no envía esta ronda a cocina' : 'Todas las partidas fueron servidas',
    railClass: 'bg-slate-300', borderClass: 'border-slate-200 dark:border-slate-700', badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200', timerClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', messageClass: 'text-slate-600 dark:text-slate-300',
  };
}

function captainStageLabel(status: CaptainStage) {
  return { SENT: 'Recibida', PREPARING: 'Preparando', READY: 'Lista', SERVED: 'Servida' }[status];
}

function captainOrderStatus(status: string) {
  return ({ OPEN: 'Mesa abierta', IN_SERVICE: 'En servicio', READY_FOR_CHECKOUT: 'Enviada a caja', CLAIMED_FOR_CHECKOUT: 'En cobro' } as Record<string, string>)[status] ?? status;
}

function KitchenWorkspace({ workspace, mutate }: { workspace: RestaurantWorkspace; mutate: RestaurantWorkspaceMutation }) {
  const [now, setNow] = useState(() => Date.now());
  const tickets = useMemo(() => groupKitchenTickets(workspace.kitchenItems ?? []), [workspace.kitchenItems]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto" data-kitchen-workspace>
      {KITCHEN_STAGES.map(stage => {
        const stageTickets = tickets.filter(ticket => ticket.status === stage.status);
        const itemCount = stageTickets.reduce((total, ticket) => total + ticket.items.length, 0);
        const StageIcon = stage.icon;
        return (
          <section
            aria-label={stage.label}
            className="flex min-h-[34rem] min-w-[20rem] flex-1 basis-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#F7F8FA] dark:border-slate-700 dark:bg-slate-900/70"
            key={stage.status}
          >
            <header className={`border-b px-4 py-3 ${stage.headerClass}`}>
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${stage.iconClass}`}><StageIcon aria-hidden="true" className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-medium text-[#222831] dark:text-white">{stage.label}</h2>
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-[#222831] shadow-sm dark:bg-slate-950 dark:text-white">{stageTickets.length}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{kitchenCountLabel(itemCount, 'partida', 'partidas')}</p>
                </div>
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              {stageTickets.length > 0 ? stageTickets.map(ticket => (
                <KitchenTicketCard key={ticket.key} mutate={mutate} now={now} ticket={ticket} />
              )) : (
                <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-slate-300 bg-white/70 p-5 text-center dark:border-slate-700 dark:bg-slate-950/60">
                  <div><StageIcon aria-hidden="true" className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" /><p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">{stage.emptyLabel}</p><p className="mt-1 text-xs text-slate-400">Las comandas aparecerán automáticamente.</p></div>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function KitchenTicketCard({ ticket, mutate, now }: { ticket: KitchenTicket; mutate: RestaurantWorkspaceMutation; now: number }) {
  const stage = KITCHEN_STAGES.find(candidate => candidate.status === ticket.status) ?? KITCHEN_STAGES[0];
  const lines = groupKitchenLines(ticket.items);
  const guests = [...new Set(ticket.items.map(item => item.guestNumber || 1))].sort((left, right) => left - right);
  const quantity = ticket.items.reduce((total, item) => total + Number(item.quantity || 0), 0);
  const elapsed = elapsedKitchenTime(ticket.sentAt, now);
  const urgency = kitchenUrgency(elapsed.minutes);
  const ActionIcon = stage.actionIcon;

  const advance = () => {
    if (!stage.nextStatus) return;
    void mutate(
      'pos.restaurant.item.status',
      {
        itemIds: ticket.items.map(item => item.id),
        status: stage.nextStatus,
        reason: `KDS grouped round ${ticket.roundNumber ?? 'legacy'}`,
      },
      stage.successMessage,
    );
  };

  return (
    <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md dark:bg-slate-950 ${stage.cardBorderClass}`} data-kitchen-ticket>
      <div className={`h-1.5 ${stage.railClass}`} />
      <header className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-medium leading-tight text-[#222831] dark:text-white">{ticket.tableName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">Ronda {ticket.roundNumber ?? 'activa'}</span>
              <span>{guests.length === 1 ? `Comensal ${guests[0]}` : `${guests.length} comensales`}</span>
            </div>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium ${urgency.className}`} title={elapsed.title}>
            <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />{elapsed.label}
          </span>
        </div>
        <p className="mt-2 truncate font-mono text-[10px] text-slate-400" title={ticket.orderNumber}>{ticket.orderNumber}</p>
      </header>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {lines.map(line => (
          <div className="px-4 py-3" key={line.key}>
            <div className="flex items-start gap-3">
              <span className={`grid min-h-9 min-w-9 shrink-0 place-items-center rounded-xl px-2 text-sm font-medium ${stage.quantityClass}`}>{formatKitchenQuantity(line.quantity)}×</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug text-[#222831] dark:text-white">{line.name}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Comensal {line.guestNumber}</p>
              </div>
            </div>
            {line.modifierSummary ? <p className="ml-12 mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">Preparación: {line.modifierSummary}</p> : null}
            {line.notes ? <p className="ml-12 mt-2 rounded-lg border border-amber-200 bg-[#FFFDF5] px-3 py-2 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-100">Nota: {line.notes}</p> : null}
          </div>
        ))}
      </div>

      <footer className="border-t border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mb-2 flex items-center justify-between gap-3 px-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span>{kitchenCountLabel(lines.length, 'producto', 'productos')}</span>
          <span>{formatKitchenQuantity(quantity)} unidades</span>
        </div>
        {stage.nextStatus ? (
          <button aria-label={`${stage.actionLabel}: ${ticket.tableName}, ronda ${ticket.roundNumber ?? 'activa'}`} className={`inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition active:scale-[0.99] ${stage.buttonClass}`} onClick={advance} type="button">
            {stage.actionLabel}<ActionIcon aria-hidden="true" className="h-5 w-5" />
          </button>
        ) : (
          <div className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 text-sm font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"><CircleCheckBig aria-hidden="true" className="h-5 w-5" />Lista para servir</div>
        )}
      </footer>
    </article>
  );
}

type KitchenStageStatus = 'SENT' | 'PREPARING' | 'READY';
type KitchenTicket = {
  key: string;
  orderId: number;
  orderNumber: string;
  tableName: string;
  roundId?: number;
  roundNumber?: number;
  sentAt?: string;
  status: KitchenStageStatus;
  items: KitchenItem[];
};

const KITCHEN_STAGES = [
  {
    status: 'SENT', label: 'Recibidos', emptyLabel: 'Sin comandas nuevas', icon: BellRing,
    nextStatus: 'PREPARING', actionLabel: 'Iniciar preparación', actionIcon: Flame,
    successMessage: 'Comanda en preparación.',
    headerClass: 'border-rose-200 bg-[#FFF1EF] dark:border-rose-500/20 dark:bg-rose-500/10',
    iconClass: 'bg-[#FF6B5E] text-[#222831]', cardBorderClass: 'border-rose-200 dark:border-rose-500/30',
    railClass: 'bg-[#FF6B5E]', quantityClass: 'bg-[#FFF1EF] text-[#C7443A] dark:bg-rose-500/10 dark:text-rose-300',
    buttonClass: 'bg-[#FF6B5E] text-[#222831] shadow-[0_8px_18px_rgba(255,107,94,0.24)] hover:bg-[#ff5d50]',
  },
  {
    status: 'PREPARING', label: 'En preparación', emptyLabel: 'Nada en preparación', icon: Flame,
    nextStatus: 'READY', actionLabel: 'Marcar como lista', actionIcon: CircleCheckBig,
    successMessage: 'Comanda marcada como lista.',
    headerClass: 'border-sky-200 bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10',
    iconClass: 'bg-sky-500 text-white', cardBorderClass: 'border-sky-200 dark:border-sky-500/30',
    railClass: 'bg-sky-500', quantityClass: 'bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200',
    buttonClass: 'bg-sky-500 text-white shadow-[0_8px_18px_rgba(14,165,233,0.2)] hover:bg-sky-400',
  },
  {
    status: 'READY', label: 'Listos', emptyLabel: 'Nada listo para servir', icon: CircleCheckBig,
    nextStatus: null, actionLabel: '', actionIcon: CircleCheckBig, successMessage: '',
    headerClass: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10',
    iconClass: 'bg-emerald-500 text-white', cardBorderClass: 'border-emerald-200 dark:border-emerald-500/30',
    railClass: 'bg-emerald-500', quantityClass: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200',
    buttonClass: '',
  },
] as const;

function groupKitchenTickets(items: KitchenItem[]): KitchenTicket[] {
  const tickets = new Map<string, KitchenTicket>();
  items.forEach(item => {
    const visibleStatus = visibleKitchenStatus(item.status);
    if (!visibleStatus) return;
    const roundIdentity = item.roundId != null ? `round-${item.roundId}` : `order-${item.orderId}`;
    const key = `${visibleStatus}:${roundIdentity}`;
    const current = tickets.get(key);
    if (current) {
      current.items.push(item);
      return;
    }
    tickets.set(key, {
      key,
      orderId: item.orderId,
      orderNumber: item.orderNumber,
      tableName: item.tableName,
      roundId: item.roundId,
      roundNumber: item.roundNumber,
      sentAt: item.sentAt ?? item.createdAt ?? item.updatedAt,
      status: visibleStatus,
      items: [item],
    });
  });
  return [...tickets.values()].sort((left, right) => kitchenTimestamp(left.sentAt) - kitchenTimestamp(right.sentAt));
}

function groupKitchenLines(items: KitchenItem[]) {
  const lines = new Map<string, { key: string; name: string; quantity: number; guestNumber: number; notes?: string; modifierSummary?: string }>();
  items.forEach(item => {
    const key = [item.name, item.guestNumber || 1, item.notes ?? '', item.modifierSummary ?? ''].join('|');
    const current = lines.get(key);
    if (current) {
      current.quantity += Number(item.quantity || 0);
      return;
    }
    lines.set(key, {
      key,
      name: item.name,
      quantity: Number(item.quantity || 0),
      guestNumber: item.guestNumber || 1,
      notes: item.notes,
      modifierSummary: item.modifierSummary,
    });
  });
  return [...lines.values()];
}

function visibleKitchenStatus(status: string): KitchenStageStatus | null {
  if (status === 'ACKNOWLEDGED') return 'PREPARING';
  return KITCHEN_STAGES.some(stage => stage.status === status) ? status as KitchenStageStatus : null;
}

function kitchenTimestamp(value?: string) {
  const timestamp = value ? new Date(value).getTime() : Date.now();
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function elapsedKitchenTime(value: string | undefined, now: number) {
  const timestamp = kitchenTimestamp(value);
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  const label = minutes < 1 ? 'Ahora' : minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return { minutes, label, title: value ? `Enviada ${new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))}` : 'Hora de envío no disponible' };
}

function kitchenUrgency(minutes: number) {
  if (minutes >= 15) return { className: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200' };
  if (minutes >= 8) return { className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200' };
  return { className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' };
}

function kitchenCountLabel(value: number, singular: string, plural: string) { return `${value} ${value === 1 ? singular : plural}`; }
function formatKitchenQuantity(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''); }

function money(value?: number | string) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value || 0)); }

function isTerminalStationSessionFailure(failure: unknown) {
  return failure instanceof ApiClientError
    && (
      failure.status === 401
      || failure.status === 403
      || /session|csrf|revoked|expired|kiosk_unavailable/i.test(failure.code ?? '')
    );
}
