import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
  ChevronRight,
  Clipboard,
  KeyRound,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  aiConnectionsApi,
  type AiConnection,
  type AiConnectionActivity,
  type IssuedAiConnection,
} from '../../../api/aiConnections';
import { ApiClientError } from '../../../lib/apiClient';
import { useLanguage } from '../../../shared/context';

type ScopeDefinition = {
  code: string;
  label: string;
  description: string;
  kind: 'read' | 'action';
};

const SCOPES: ScopeDefinition[] = [
  { code: 'sales.today:read', label: 'Ventas de hoy', description: 'Totales diarios de ventas.', kind: 'read' },
  { code: 'business.snapshot:read', label: 'Resumen del negocio', description: 'Indicadores ejecutivos y alertas.', kind: 'read' },
  { code: 'hr.people:read', label: 'Colaboradores', description: 'Información operativa de empleados.', kind: 'read' },
  { code: 'hr.attendance:read', label: 'Asistencia', description: 'Incidencias y excepciones de asistencia.', kind: 'read' },
  { code: 'tasks.read', label: 'Tareas', description: 'Tareas propias, delegadas y de equipo.', kind: 'read' },
  { code: 'sales.read', label: 'Ventas', description: 'Resumen, listado y detalle de ventas.', kind: 'read' },
  { code: 'pos.read', label: 'Punto de venta', description: 'Cajas, sesiones y cortes autorizados.', kind: 'read' },
  { code: 'inventory.read', label: 'Productos e inventario', description: 'Precios, costos, existencias y valor.', kind: 'read' },
  { code: 'expenses.read', label: 'Gastos', description: 'Totales, estados, vencimientos y detalle.', kind: 'read' },
  { code: 'petty_cash.read', label: 'Fondos', description: 'Saldos y movimientos de caja chica.', kind: 'read' },
  { code: 'receivables.read', label: 'Cuentas por cobrar', description: 'Saldos, clientes y vencimientos.', kind: 'read' },
  { code: 'tasks.create', label: 'Crear tareas', description: 'Requiere vista previa y confirmación.', kind: 'action' },
  { code: 'expenses.create', label: 'Registrar gasto borrador', description: 'Crea únicamente gastos en borrador.', kind: 'action' },
  { code: 'petty_cash.expense:create', label: 'Registrar gasto en fondo', description: 'Reduce el saldo tras confirmar.', kind: 'action' },
  { code: 'petty_cash.deposit:create', label: 'Ingresar dinero a fondo', description: 'Aumenta el saldo tras confirmar.', kind: 'action' },
];

const DEFAULT_SCOPES = SCOPES.filter((scope) => scope.kind === 'read').map((scope) => scope.code);
const scopeByCode = new Map(SCOPES.map((scope) => [scope.code, scope]));

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin actividad';
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const connectionStatus = (connection: AiConnection) => {
  if (connection.revokedAt) return 'revoked';
  if (new Date(connection.expiresAt).getTime() <= Date.now()) return 'expired';
  return 'active';
};

const errorMessage = (error: unknown) => {
  if (error instanceof ApiClientError && error.message) return error.message;
  return 'No pudimos completar la operación. Intenta nuevamente.';
};

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement('textarea');
  input.value = value;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

export default function Integrations() {
  const { currentLanguage } = useLanguage();
  const spanish = currentLanguage.code.startsWith('es');
  const [connections, setConnections] = useState<AiConnection[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activity, setActivity] = useState<AiConnectionActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [activityError, setActivityError] = useState('');
  const [label, setLabel] = useState('ChatGPT');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(DEFAULT_SCOPES);
  const [issuedConnection, setIssuedConnection] = useState<IssuedAiConnection | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedConnection = useMemo(
    () => connections.find((connection) => connection.id === selectedId) ?? connections[0] ?? null,
    [connections, selectedId],
  );

  const loadConnections = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await aiConnectionsApi.list();
      setConnections(response.connections);
      setSelectedId((current) => (
        response.connections.some((connection) => connection.id === current)
          ? current
          : response.connections[0]?.id ?? null
      ));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    if (!selectedConnection) {
      setActivity([]);
      return;
    }
    let active = true;
    setIsActivityLoading(true);
    setActivityError('');
    aiConnectionsApi.activity(selectedConnection.id)
      .then((response) => {
        if (active) setActivity(response.events);
      })
      .catch((loadError) => {
        if (active) setActivityError(errorMessage(loadError));
      })
      .finally(() => {
        if (active) setIsActivityLoading(false);
      });
    return () => { active = false; };
  }, [selectedConnection?.id]);

  const resetCreate = () => {
    setLabel('ChatGPT');
    setExpiresInDays(30);
    setSelectedScopes(DEFAULT_SCOPES);
    setIssuedConnection(null);
    setCopied(false);
    setError('');
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    resetCreate();
  };

  const toggleScope = (scopeCode: string) => {
    setSelectedScopes((current) => (
      current.includes(scopeCode)
        ? current.filter((code) => code !== scopeCode)
        : [...current, scopeCode]
    ));
  };

  const createConnection = async () => {
    if (!label.trim() || selectedScopes.length === 0) return;
    setIsCreating(true);
    setError('');
    try {
      const created = await aiConnectionsApi.create({
        label: label.trim(),
        expiresInDays,
        scopes: selectedScopes,
      });
      setIssuedConnection(created);
      setConnections((current) => [created, ...current]);
      setSelectedId(created.id);
    } catch (createError) {
      setError(errorMessage(createError));
    } finally {
      setIsCreating(false);
    }
  };

  const revokeConnection = async (connection: AiConnection) => {
    if (!window.confirm(spanish
      ? `¿Revocar “${connection.label}”? ChatGPT perderá el acceso inmediatamente.`
      : `Revoke “${connection.label}”? ChatGPT will lose access immediately.`)) return;
    setRevokingId(connection.id);
    setError('');
    try {
      await aiConnectionsApi.revoke(connection.id);
      await loadConnections();
    } catch (revokeError) {
      setError(errorMessage(revokeError));
    } finally {
      setRevokingId(null);
    }
  };

  const activeCount = connections.filter((connection) => connectionStatus(connection) === 'active').length;
  const readScopes = SCOPES.filter((scope) => scope.kind === 'read');
  const actionScopes = SCOPES.filter((scope) => scope.kind === 'action');

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--indice-blue)] dark:bg-blue-900/30">
            <Bot className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-medium text-[var(--indice-blue)]">Integraciones</p>
            <h2 className="mt-1 text-xl font-medium text-slate-950 dark:text-white">Conectar IA</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Conecta ChatGPT u otro asistente compatible sin compartir tu contraseña. Índice conserva los permisos, la empresa y el registro de actividad.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { resetCreate(); setIsCreateOpen(true); }}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--indice-blue)] px-4 text-sm font-medium text-white shadow-sm transition hover:brightness-95"
        >
          <Plus className="h-4 w-4" /> Nueva conexión
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Conexiones activas</p>
          <p className="mt-2 text-2xl font-medium text-slate-950 dark:text-white">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Seguridad</p>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"><ShieldCheck className="h-5 w-5" /> Permisos limitados</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Acciones</p>
          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">Confirmación obligatoria</p>
        </div>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Cerrar"><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      <div className="grid min-h-[520px] gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between px-2 py-2">
            <div>
              <h3 className="text-sm font-medium text-slate-950 dark:text-white">Conexiones</h3>
              <p className="text-xs text-slate-500">Selecciona una para revisar.</p>
            </div>
            <button type="button" onClick={() => void loadConnections()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Actualizar conexiones">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /></div>
            ) : connections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
                <KeyRound className="mx-auto h-7 w-7 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">Aún no hay conexiones</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Crea la primera con permisos de solo lectura.</p>
              </div>
            ) : connections.map((connection) => {
              const status = connectionStatus(connection);
              const active = selectedConnection?.id === connection.id;
              return (
                <button
                  type="button"
                  key={connection.id}
                  onClick={() => setSelectedId(connection.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${active ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30' : 'border-transparent bg-slate-50 hover:border-slate-200 dark:bg-slate-800/60 dark:hover:border-slate-700'}`}
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${status === 'active' ? 'bg-emerald-500' : status === 'expired' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{connection.label}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">{formatDate(connection.lastUsedAt)}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              );
            })}
          </div>
        </aside>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {!selectedConnection ? (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
              <Bot className="h-10 w-10 text-slate-300" />
              <h3 className="mt-4 text-base font-medium text-slate-900 dark:text-white">Conecta un asistente de IA</h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">Empieza con consultas de lectura y habilita acciones solo cuando realmente las necesites.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-slate-700 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium text-slate-950 dark:text-white">{selectedConnection.label}</h3>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${connectionStatus(selectedConnection) === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {connectionStatus(selectedConnection) === 'active' ? 'Activa' : connectionStatus(selectedConnection) === 'expired' ? 'Vencida' : 'Revocada'}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-slate-500">{selectedConnection.tokenPrefix}••••••••</p>
                  <p className="mt-2 text-xs text-slate-500">Vence: {formatDate(selectedConnection.expiresAt)}</p>
                </div>
                {connectionStatus(selectedConnection) === 'active' ? (
                  <button
                    type="button"
                    onClick={() => void revokeConnection(selectedConnection)}
                    disabled={revokingId === selectedConnection.id}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    {revokingId === selectedConnection.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Revocar acceso
                  </button>
                ) : null}
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-950 dark:text-white">Permisos otorgados</h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedConnection.scopes.map((scopeCode) => (
                    <span key={scopeCode} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${scopeByCode.get(scopeCode)?.kind === 'action' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200' : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200'}`}>
                      {scopeByCode.get(scopeCode)?.label ?? scopeCode}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-medium text-slate-950 dark:text-white"><Activity className="h-4 w-4" /> Actividad reciente</h4>
                    <p className="mt-1 text-xs text-slate-500">Consultas y acciones, sin guardar respuestas ni datos sensibles.</p>
                  </div>
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  {isActivityLoading ? (
                    <div className="flex items-center justify-center py-10 text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /></div>
                  ) : activityError ? (
                    <div className="px-4 py-8 text-center text-sm text-red-700 dark:text-red-300">{activityError}</div>
                  ) : activity.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-slate-500">La actividad aparecerá después de la primera consulta.</div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                      {activity.map((event) => (
                        <div key={event.id} className="flex items-center gap-3 px-4 py-3">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${event.kind === 'READ' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'}`}>
                            {event.kind === 'READ' ? <Activity className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{event.toolName.replace(/_/g, ' ')}</span>
                            <span className="block text-xs text-slate-500">{event.kind === 'READ' ? 'Consulta' : event.eventType} · {formatDate(event.createdAt)}</span>
                          </span>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${event.outcome === 'SUCCESS' || event.outcome === 'REPLAY' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'}`}>
                            {event.outcome === 'FAILURE' ? 'Falló' : 'Correcto'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Nueva conexión de IA">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
              <div>
                <h3 className="text-lg font-medium text-slate-950 dark:text-white">{issuedConnection ? 'Guarda la clave segura' : 'Nueva conexión de IA'}</h3>
                <p className="mt-1 text-xs text-slate-500">{issuedConnection ? 'Índice no volverá a mostrarla.' : 'Empieza con el menor acceso necesario.'}</p>
              </div>
              <button type="button" onClick={closeCreate} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar"><X className="h-5 w-5" /></button>
            </div>

            {issuedConnection ? (
              <div className="space-y-5 p-5">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                  <div className="flex items-start gap-3">
                    <span className="rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"><Check className="h-5 w-5" /></span>
                    <div>
                      <p className="font-medium text-emerald-950 dark:text-emerald-100">Conexión creada</p>
                      <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">Copia la clave ahora y guárdala únicamente en el conector seguro.</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-900 dark:text-white">Clave de acceso</label>
                  <div className="mt-2 flex gap-2">
                    <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-xs text-emerald-300 dark:border-slate-700">{issuedConnection.accessToken}</code>
                    <button
                      type="button"
                      onClick={() => void copyText(issuedConnection.accessToken).then(() => setCopied(true))}
                      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--indice-blue)] px-4 text-sm font-medium text-white"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}{copied ? 'Copiada' : 'Copiar'}
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>No envíes esta clave por correo o chat. Si se pierde o se comparte por error, revócala y crea otra.</p>
                </div>
                <button type="button" onClick={closeCreate} className="h-11 w-full rounded-xl bg-slate-900 text-sm font-medium text-white dark:bg-white dark:text-slate-950">Terminar</button>
              </div>
            ) : (
              <div className="space-y-6 p-5">
                <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                  <label className="text-sm font-medium text-slate-900 dark:text-white">
                    Nombre de la conexión
                    <input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={120} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-[var(--indice-blue)] focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950" placeholder="ChatGPT del dueño" />
                  </label>
                  <label className="text-sm font-medium text-slate-900 dark:text-white">
                    Vigencia
                    <select value={expiresInDays} onChange={(event) => setExpiresInDays(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-950">
                      <option value={7}>7 días</option>
                      <option value={30}>30 días</option>
                      <option value={60}>60 días</option>
                      <option value={90}>90 días</option>
                    </select>
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-medium text-slate-950 dark:text-white">Consultas permitidas</h4>
                      <p className="mt-1 text-xs text-slate-500">Seleccionadas por defecto. No modifican información.</p>
                    </div>
                    <button type="button" onClick={() => setSelectedScopes((current) => [...new Set([...current.filter((scope) => scopeByCode.get(scope)?.kind === 'action'), ...DEFAULT_SCOPES])])} className="text-xs font-medium text-[var(--indice-blue)]">Seleccionar todas</button>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {readScopes.map((scope) => (
                      <label key={scope.code} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                        <input type="checkbox" checked={selectedScopes.includes(scope.code)} onChange={() => toggleScope(scope.code)} className="mt-1 h-4 w-4 accent-[var(--indice-blue)]" />
                        <span><span className="block text-sm font-medium text-slate-900 dark:text-white">{scope.label}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{scope.description}</span></span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <h4 className="text-sm font-medium text-amber-950 dark:text-amber-100">Acciones que modifican información</h4>
                  <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-200">Están apagadas por seguridad. Cada acción exige vista previa y confirmación explícita.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {actionScopes.map((scope) => (
                      <label key={scope.code} className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-white/80 p-3 dark:border-amber-900/50 dark:bg-slate-900/70">
                        <input type="checkbox" checked={selectedScopes.includes(scope.code)} onChange={() => toggleScope(scope.code)} className="mt-1 h-4 w-4 accent-amber-600" />
                        <span><span className="block text-sm font-medium text-slate-900 dark:text-white">{scope.label}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{scope.description}</span></span>
                      </label>
                    ))}
                  </div>
                </div>

                {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950/30 dark:text-red-200">{error}</p> : null}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={closeCreate} className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancelar</button>
                  <button type="button" disabled={isCreating || !label.trim() || selectedScopes.length === 0} onClick={() => void createConnection()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--indice-blue)] px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
                    {isCreating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Crear conexión segura
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
