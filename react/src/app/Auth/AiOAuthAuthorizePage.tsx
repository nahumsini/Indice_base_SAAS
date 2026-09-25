import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bot, Check, Eye, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
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
  const [submitting, setSubmitting] = useState(false);
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

  useEffect(() => {
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
        setError(failure instanceof Error ? failure.message : 'No pudimos preparar esta conexión.');
      }
    };
    void load();
    return () => { active = false; };
  }, [location.pathname, location.search, navigate]);

  const decide = async (approved: boolean) => {
    try {
      setSubmitting(true);
      setError('');
      const result = await aiOAuthApi.decide(query, approved);
      window.location.assign(result.redirectUrl);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No pudimos completar la conexión.');
      setSubmitting(false);
    }
  };

  const informationScopes = context?.scopes.filter((scope) => !actionScopes.has(scope)) ?? [];
  const requestedActions = context?.scopes.filter((scope) => actionScopes.has(scope)) ?? [];

  return (
    <main className="min-h-screen bg-[var(--indice-background)] px-4 py-6 text-slate-950 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 flex items-center justify-between">
          <IndiceBrandLogo alt="Índice" className="h-12 w-40" imageClassName="w-[188px]" />
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--indice-brand-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--indice-brand-text)] shadow-sm">
            <LockKeyhole className="h-4 w-4" /> Conexión protegida
          </span>
        </header>

        <section className="overflow-hidden rounded-3xl border border-[var(--indice-brand-border)] bg-white shadow-xl">
          <div className="border-b border-[var(--indice-brand-border)] bg-[var(--indice-brand-action)] px-6 py-7 text-[var(--indice-brand-shell-foreground)] sm:px-8">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Bot className="h-6 w-6" /></span>
              <div>
                <p className="text-sm font-semibold text-[var(--indice-brand-shell-muted)]">Conectar un asistente con Índice</p>
                <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Tú decides qué información puede utilizar</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--indice-brand-shell-muted)]">Índice conservará el control de tu empresa y validará tus permisos en cada consulta.</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {!context && !error ? (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-[var(--indice-brand-action)]" />
                <p className="mt-4 font-medium">Preparando la conexión segura…</p>
              </div>
            ) : null}

            {context ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Asistente que solicita acceso</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <div><p className="text-lg font-semibold">{context.clientName}</p><p className="text-sm text-slate-600">Empresa: {session?.company.name}</p></div>
                    <span className="rounded-full bg-[var(--indice-brand-soft)] px-3 py-1 text-sm font-medium text-[var(--indice-brand-text)]">{context.expiresInDays} días</span>
                  </div>
                </div>

                <PermissionBlock icon={<Eye />} title="Podrá responder preguntas sobre" scopes={informationScopes} tone="blue" />
                {requestedActions.length ? (
                  <PermissionBlock icon={<Check />} title="También podrá ayudarte a registrar" scopes={requestedActions} tone="amber" />
                ) : null}

                <div className="grid gap-3 sm:grid-cols-3">
                  <TrustItem title="Sin contraseñas" description="ChatGPT nunca recibe tu contraseña de Índice." />
                  <TrustItem title="Permisos vigentes" description="Si pierdes un permiso, el asistente también." />
                  <TrustItem title="Acceso revocable" description="Puedes cerrarlo desde Conectar IA." />
                </div>

                {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={submitting} onClick={() => void decide(false)}>Cancelar</Button>
                  <Button type="button" className="h-11 rounded-xl bg-[var(--indice-brand-action)] px-6 text-[var(--indice-brand-shell-foreground)] hover:bg-[var(--indice-brand-action-hover)]" disabled={submitting} onClick={() => void decide(true)}>
                    {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    {submitting ? 'Conectando…' : 'Autorizar conexión'}
                  </Button>
                </div>
              </div>
            ) : null}

            {error && !context ? (
              <div className="min-h-64 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
                <p className="font-semibold">Esta conexión no es válida</p><p className="mt-2 text-sm">{error}</p>
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
    : 'border-amber-200 bg-amber-50/70 text-amber-800';
  return (
    <section className={`rounded-2xl border p-5 ${colors}`}>
      <h2 className="flex items-center gap-2 font-semibold">{icon}{title}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {scopes.map((scope) => <span key={scope} className="rounded-full border border-current/15 bg-white px-3 py-1.5 text-sm font-medium">{scopeLabels[scope] ?? scope}</span>)}
      </div>
    </section>
  );
}

function TrustItem({ description, title }: { description: string; title: string }) {
  return <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{description}</p></div>;
}
