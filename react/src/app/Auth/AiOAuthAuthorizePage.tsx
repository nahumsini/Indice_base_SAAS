import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Bot,
  Building2,
  Check,
  CircleCheck,
  Eye,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { aiOAuthApi, type AiOAuthConsentContext } from '../api/aiOAuth';
import { authApi, type AuthSessionResponse } from '../api/auth';
import { ApiClientError } from '../lib/apiClient';
import { Button } from '../components/ui/button';
import { IndiceBrandLogo } from './components/IndiceBrandLogo';

const actionScopes = new Set([
  'tasks.create',
  'customers.create',
  'customers.update',
  'opportunities.create',
  'opportunities.update',
  'quotes.create',
  'quotes.update',
  'tasks.delegate',
  'tasks.update',
  'expenses.create',
  'petty_cash.expense:create',
  'petty_cash.deposit:create',
]);

const scopeLabels: Record<string, string> = {
  'opportunities.read': 'Oportunidades y pipeline',
  'quotes.read': 'Cotizaciones',
  'commercial.references:read': 'Responsables comerciales',
  'customers.create': 'Crear clientes',
  'customers.update': 'Editar clientes',
  'opportunities.create': 'Crear oportunidades',
  'opportunities.update': 'Editar oportunidades',
  'quotes.create': 'Crear cotizaciones',
  'quotes.update': 'Editar cotizaciones',

  'customers.read': 'Clientes autorizados de Ventas y POS',
  'providers.read': 'Proveedores autorizados',
  'warehouses.read': 'Almacenes autorizados',
  'budget_lines.read': 'Partidas presupuestales y sus importes',
  'accounting_accounts.read': 'Catálogo de cuentas contables',
  openid: 'Confirmar la identidad de tu cuenta',
  email: 'Correo de acceso verificado',
  'sales.today:read': 'Ventas de hoy',
  'business.snapshot:read': 'Resumen del negocio',
  'business.context:read': 'Contexto, unidades y negocios autorizados',
  'hr.people:read': 'Colaboradores',
  'hr.attendance:read': 'Asistencia',
  'tasks.read': 'Tareas',
  'sales.read': 'Ventas',
  'pos.read': 'Punto de venta',
  'inventory.read': 'Productos e inventario',
  'expenses.read': 'Gastos',
  'petty_cash.read': 'Fondos',
  'receivables.read': 'Dinero por cobrar',
  'finance.references:read': 'Cuentas bancarias y de pago autorizadas',
  'tasks.delegate': 'Delegar tareas a responsables autorizados',
  'tasks.update': 'Editar tareas confirmadas',
  'tasks.create': 'Crear tareas confirmadas',
  'expenses.create': 'Preparar gastos en borrador',
  'petty_cash.expense:create': 'Registrar salidas confirmadas de fondos',
  'petty_cash.deposit:create': 'Registrar entradas confirmadas a fondos',
};

export default function AiOAuthAuthorizePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [context, setContext] = useState<AiOAuthConsentContext | null>(null);
  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isLocalPreview = import.meta.env.DEV && query.get('preview') === 'consent';
  const companyName = session?.company.name ?? (isLocalPreview ? 'El Corazón del Caribe' : undefined);

  useEffect(() => {
    if (isLocalPreview) {
      setContext({
        clientName: 'ChatGPT',
        expiresInDays: 30,
        userName: 'Nahum',
        scopes: [
          'business.snapshot:read', 'business.context:read', 'tasks.read', 'sales.read',
          'inventory.read', 'expenses.read', 'petty_cash.read', 'receivables.read',
          'tasks.create', 'tasks.update', 'customers.create', 'opportunities.create',
        ],
      });
      return undefined;
    }
    let active = true;
    const load = async () => {
      try {
        const currentSession = await authApi.me();
        if (!active) return;
        setSession(currentSession);
        const consent = await aiOAuthApi.context(location.search);
        if (active) setContext(consent);
      } catch (failure) {
        if (!active) return;
        if (failure instanceof ApiClientError && failure.status === 401) {
          navigate('/login', {
            replace: true,
            state: { returnTo: `${location.pathname}${location.search}` },
          });
          return;
        }
        setErrorStatus(failure instanceof ApiClientError ? failure.status : null);
        setError(failure instanceof Error ? failure.message : 'No pudimos preparar esta conexión.');
      }
    };
    void load();
    return () => { active = false; };
  }, [isLocalPreview, location.pathname, location.search, navigate]);

  const decide = async (approved: boolean) => {
    try {
      setSubmitting(true);
      setError('');
      setErrorStatus(null);
      const result = await aiOAuthApi.decide(query, approved);
      window.location.assign(result.redirectUrl);
    } catch (failure) {
      setErrorStatus(failure instanceof ApiClientError ? failure.status : null);
      setError(failure instanceof Error ? failure.message : 'No pudimos completar la conexión.');
      setSubmitting(false);
    }
  };

  const informationScopes = context?.scopes.filter((scope) => !actionScopes.has(scope)) ?? [];
  const requestedActions = context?.scopes.filter((scope) => actionScopes.has(scope)) ?? [];
  const capacityError = errorStatus === 409;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(145deg,#F8FAFC_0%,#EFF6FF_48%,#F8FAFC_100%)] px-4 py-5 text-slate-950 dark:bg-[#111827] dark:text-slate-50 sm:px-6 lg:py-8">
      <div className="mx-auto min-w-0 w-full max-w-4xl">
        <header className="mb-5 flex items-center justify-between gap-4">
          <IndiceBrandLogo alt="Índice" className="h-12 w-40" imageClassName="w-[188px]" />
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--indice-brand-border)] bg-white/90 px-3 py-2 text-xs font-medium text-[var(--indice-brand-text)] shadow-sm dark:bg-slate-900">
            <LockKeyhole className="h-4 w-4" /> Autorización segura
          </span>
        </header>

        <section className="min-w-0 overflow-hidden rounded-[28px] border border-[var(--indice-brand-border)] bg-white shadow-[0_28px_90px_-48px_rgba(37,99,235,0.45)] dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-[var(--indice-brand-border)] bg-[var(--indice-brand-action)] px-6 py-7 text-[var(--indice-brand-shell-foreground)] sm:px-8 lg:px-10">
            <div className="flex items-start gap-4 sm:items-center">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Bot className="h-6 w-6" /></span>
              <div>
                <p className="text-sm font-medium text-[var(--indice-brand-shell-muted)]">Conectar un asistente con Índice</p>
                <h1 className="mt-1 text-2xl font-medium sm:text-3xl">Revisa y autoriza el acceso</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--indice-brand-shell-muted)]">Tú eliges qué puede consultar. Índice conserva el control y valida tus permisos en cada solicitud.</p>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700 sm:px-8 lg:px-10">
            <ol className="grid min-w-0 grid-cols-3 gap-2" aria-label="Progreso de conexión">
              <ConnectionStep label="Ingresar" state="complete" />
              <ConnectionStep label="Revisar permisos" state="current" />
              <ConnectionStep label="Finalizar" state="upcoming" />
            </ol>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            {!context && !error ? (
              <div className="flex min-h-72 flex-col items-center justify-center text-center" role="status" aria-live="polite">
                <LoaderCircle className="h-8 w-8 animate-spin text-[var(--indice-brand-action)]" />
                <p className="mt-4 font-medium">Preparando tu autorización…</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Estamos verificando el asistente, tu empresa y los permisos solicitados.</p>
              </div>
            ) : null}

            {context ? (
              <div className="space-y-7">
                {isLocalPreview ? (
                  <p role="status" className="rounded-xl border border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] px-4 py-3 text-sm text-[var(--indice-brand-text)]">
                    Vista previa local con datos de ejemplo. La autorización está desactivada.
                  </p>
                ) : null}
                <div className="grid min-w-0 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <aside className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Solicitud de acceso</p>
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--indice-brand-soft)] text-[var(--indice-brand-text)]"><Bot className="h-5 w-5" /></span>
                      <div className="min-w-0"><p className="truncate font-medium">{context.clientName}</p><p className="text-xs text-slate-500 dark:text-slate-400">Asistente externo</p></div>
                    </div>
                    <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                      <IdentityRow icon={<Building2 />} label="Empresa" value={companyName ?? 'Empresa activa'} />
                      <IdentityRow icon={<UserRound />} label="Cuenta" value={context.userName} />
                    </div>
                    <div className="rounded-xl border border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] px-3 py-2 text-sm text-[var(--indice-brand-text)]">
                      Acceso por <span className="font-medium">{context.expiresInDays} días</span>
                    </div>
                  </aside>

                  <div className="min-w-0 space-y-4">
                    <div>
                      <h2 className="text-xl font-medium">¿En qué podrá ayudarte?</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Revisa la información y las acciones solicitadas antes de continuar.</p>
                    </div>
                    <PermissionBlock icon={<Eye />} title="Información que podrá consultar" scopes={informationScopes} tone="blue" />
                    {requestedActions.length ? (
                      <PermissionBlock icon={<Check />} title="Acciones que podrá preparar" scopes={requestedActions} tone="amber" />
                    ) : null}
                  </div>
                </div>

                <div className="grid min-w-0 gap-4 border-y border-slate-200 py-5 dark:border-slate-700 sm:grid-cols-3">
                  <TrustItem title="Sin contraseñas" description="ChatGPT nunca recibe tu contraseña de Índice." />
                  <TrustItem title="Permisos vigentes" description="Si pierdes un permiso, el asistente también." />
                  <TrustItem title="Acceso revocable" description="Puedes cerrarlo desde Conectar IA." />
                </div>

                {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{error}</p> : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Autorizar no permite acciones fuera de tus permisos actuales.</p>
                  <div className="flex min-w-0 flex-col-reverse gap-3 sm:flex-row">
                    <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={submitting || isLocalPreview} onClick={() => void decide(false)}>Cancelar</Button>
                    <Button type="button" className="min-h-11 h-auto rounded-xl bg-[var(--indice-brand-action)] px-6 py-2.5 text-center text-[var(--indice-brand-shell-foreground)] hover:bg-[var(--indice-brand-action-hover)] sm:whitespace-nowrap" disabled={submitting || isLocalPreview} onClick={() => void decide(true)}>
                      {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      {submitting ? 'Conectando…' : `Autorizar${companyName ? ` para ${companyName}` : ''}`}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {error && !context ? (
              <div className="mx-auto max-w-2xl py-4 text-center" role="alert">
                <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${capacityError ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'}`}>
                  {capacityError ? <Bot className="h-7 w-7" /> : <LockKeyhole className="h-7 w-7" />}
                </span>
                <h2 className="mt-5 text-2xl font-medium">{capacityError ? 'No hay espacio para una conexión nueva' : 'No pudimos preparar la autorización'}</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {capacityError
                    ? `La cuenta alcanzó el límite de conexiones activas${companyName ? ` en ${companyName}` : ''}. Cierra una conexión que ya no utilices y vuelve a comprobar.`
                    : error}
                </p>
                {capacityError ? (
                  <div className="mx-auto mt-5 flex max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-700 dark:bg-slate-800/60">
                    <Building2 className="h-5 w-5 shrink-0 text-[var(--indice-brand-action)]" />
                    <div><p className="text-xs text-slate-500 dark:text-slate-400">Empresa que estás conectando</p><p className="font-medium">{companyName ?? 'Empresa activa'}</p></div>
                  </div>
                ) : null}
                <div className="mt-7 flex flex-col-reverse justify-center gap-3 sm:flex-row">
                  {capacityError ? (
                    <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => window.open('/home-panel/integrations', '_blank', 'noopener,noreferrer')}>Administrar conexiones</Button>
                  ) : null}
                  <Button type="button" className="h-11 rounded-xl bg-[var(--indice-brand-action)] px-6 text-[var(--indice-brand-shell-foreground)] hover:bg-[var(--indice-brand-action-hover)]" onClick={() => window.location.reload()}>
                    <RefreshCw className="h-4 w-4" /> Volver a comprobar
                  </Button>
                </div>
                <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">Tu solicitud permanece abierta mientras administras las conexiones.</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function PermissionBlock({ icon, scopes, title, tone }: { icon: ReactNode; scopes: string[]; title: string; tone: 'blue' | 'amber' }) {
  const colors = tone === 'blue'
    ? 'border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] text-[var(--indice-brand-text)]'
    : 'border-amber-200 bg-amber-50/70 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200';
  const itemColors = tone === 'blue'
    ? 'border-[var(--indice-brand-border)]/80 bg-white/85 dark:bg-slate-900'
    : 'border-amber-200/90 bg-white/80 dark:border-amber-900/60 dark:bg-slate-900';
  return (
    <section className={`min-w-0 rounded-2xl border p-5 ${colors}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2 text-base font-medium">{icon}<span>{title}</span></h3>
        <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full border border-current/15 bg-white/70 px-2 text-xs font-medium dark:bg-slate-900">{scopes.length}</span>
      </div>
      <ul className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2">
        {scopes.map((scope) => (
          <li key={scope} className={`flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${itemColors}`}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" aria-hidden="true" />
            <span className="min-w-0 break-words font-medium leading-5">{scopeLabels[scope] ?? scope}</span>
          </li>
        ))}
      </ul>
      {tone === 'amber' ? <p className="mt-4 text-xs leading-5 opacity-80">Cada cambio seguirá requiriendo tu confirmación antes de ejecutarse.</p> : null}
    </section>
  );
}

function TrustItem({ description, title }: { description: string; title: string }) {
  return <div className="flex gap-3"><CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">{description}</p></div></div>;
}

function ConnectionStep({ label, state }: { label: string; state: 'complete' | 'current' | 'upcoming' }) {
  return (
    <li className={`flex min-w-0 items-center gap-1.5 text-xs sm:gap-2 sm:text-sm ${state === 'upcoming' ? 'text-slate-400' : 'text-[var(--indice-brand-text)]'}`} aria-current={state === 'current' ? 'step' : undefined}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${state === 'complete' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' : state === 'current' ? 'border-[var(--indice-brand-action)] bg-[var(--indice-brand-action)] text-white' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}>
        {state === 'complete' ? <Check className="h-4 w-4" /> : state === 'current' ? '2' : '3'}
      </span>
      <span className="min-w-0 truncate font-medium">{label}</span>
      {state !== 'upcoming' ? <ArrowRight className="ml-auto hidden h-4 w-4 opacity-40 sm:block" /> : null}
    </li>
  );
}

function IdentityRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex items-start gap-2 py-2"><span className="mt-0.5 text-slate-400">{icon}</span><div className="min-w-0"><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p><p className="truncate text-sm font-medium">{value}</p></div></div>;
}
