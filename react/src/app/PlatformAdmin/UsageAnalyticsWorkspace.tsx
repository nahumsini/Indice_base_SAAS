import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  Building2,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  Globe2,
  MousePointerClick,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { IndiceTitleBar } from '../components/frontend-os';
import {
  platformAdminApi,
  type PlatformAnalytics,
  type PlatformAnalyticsPage,
  type PlatformAudit,
} from '../api/platformAdmin';

type WorkspaceTab = 'summary' | 'app' | 'web' | 'technical';

const tabs: Array<{ id: WorkspaceTab; es: string; en: string; icon: typeof Activity }> = [
  { id: 'summary', es: 'Resumen', en: 'Overview', icon: ChartNoAxesColumnIncreasing },
  { id: 'app', es: 'Uso de plataforma', en: 'Platform usage', icon: Activity },
  { id: 'web', es: 'Sitio web', en: 'Website', icon: Globe2 },
  { id: 'technical', es: 'Auditoría técnica', en: 'Technical audit', icon: ClipboardList },
];

const routeLabels: Record<string, { es: string; en: string }> = {
  dashboard: { es: 'Panel principal', en: 'Dashboard' },
  'home-panel': { es: 'Panel inicial', en: 'Home panel' },
  'human-resources': { es: 'Recursos Humanos', en: 'Human Resources' },
  'processes-tasks': { es: 'Procesos y tareas', en: 'Processes and tasks' },
  expenses: { es: 'Gastos', en: 'Expenses' },
  'petty-cash': { es: 'Caja Chica', en: 'Petty Cash' },
  'point-of-sale': { es: 'Punto de Venta', en: 'Point of Sale' },
  sales: { es: 'Ventas', en: 'Sales' },
  receivables: { es: 'Cartera', en: 'Receivables' },
  kpis: { es: 'KPIs', en: 'KPIs' },
  inventory: { es: 'Inventarios', en: 'Inventory' },
  maintenance: { es: 'Mantenimiento', en: 'Maintenance' },
  '/': { es: 'Inicio web', en: 'Website home' },
  '/index.php': { es: 'Inicio web', en: 'Website home' },
  '/modulos.php': { es: 'Módulos web', en: 'Website modules' },
  '/planes.php': { es: 'Planes', en: 'Plans' },
  '/contacto.php': { es: 'Contacto', en: 'Contact' },
  '/registro.php': { es: 'Registro', en: 'Registration' },
};

const formatDuration = (seconds: number, english: boolean) => {
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hours = seconds / 3600;
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} h`;
};

const formatDateTime = (value: string, english: boolean) => new Intl.DateTimeFormat(
  english ? 'en-CA' : 'es-MX',
  { dateStyle: 'medium', timeStyle: 'short' },
).format(new Date(value));

const routeLabel = (route: string, english: boolean) => (
  routeLabels[route]?.[english ? 'en' : 'es']
  ?? route.replace(/^\//, '').replace(/\.php$/, '').replace(/[-_]/g, ' ')
  ?? route
);

const averageSeconds = (row: PlatformAnalyticsPage) => (
  row.sessions > 0 ? Math.round(row.active_seconds / row.sessions) : 0
);

export function UsageAnalyticsWorkspace({
  english,
  audit,
}: {
  english: boolean;
  audit: PlatformAudit | null;
}) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('summary');
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [companyId, setCompanyId] = useState('');
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAnalytics(await platformAdminApi.getAnalytics(days, companyId ? Number(companyId) : undefined));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : (english ? 'Usage analytics could not be loaded.' : 'No se pudo cargar la analítica de uso.'));
    } finally {
      setLoading(false);
    }
  }, [companyId, days, english]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(() => (analytics?.trend ?? []).map((row) => ({
    ...row,
    label: new Intl.DateTimeFormat(english ? 'en-CA' : 'es-MX', { month: 'short', day: 'numeric' })
      .format(new Date(`${row.date}T12:00:00Z`)),
  })), [analytics?.trend, english]);

  const selectedCompany = analytics?.company_options.find((company) => String(company.id) === companyId);

  return (
    <div className="space-y-5">
      <IndiceTitleBar
        tone="blue"
        icon={<ChartNoAxesColumnIncreasing className="h-5 w-5" />}
        eyebrow={english ? 'Product observability' : 'Observabilidad de producto'}
        title={english ? 'Usage and traceability' : 'Uso y trazabilidad'}
        subtitle={english
          ? 'Understand adoption, active attention and website demand without mixing product analytics with the legal audit trail.'
          : 'Entiende adopción, atención activa y demanda web sin mezclar analítica de producto con la auditoría legal.'}
        actions={(
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-medium text-blue-800 transition hover:bg-blue-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {english ? 'Refresh' : 'Actualizar'}
          </button>
        )}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition ${selected ? 'bg-[#2563EB] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <Icon className="h-4 w-4" />
                {english ? tab.en : tab.es}
              </button>
            );
          })}
        </div>
      </section>

      {activeTab !== 'technical' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_240px_240px] lg:items-end">
            <div>
              <h2 className="font-medium text-slate-950">{english ? 'Analysis scope' : 'Alcance del análisis'}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedCompany
                  ? (english ? `Platform activity for ${selectedCompany.name}; website metrics remain global.` : `Actividad de ${selectedCompany.name}; las métricas web permanecen globales.`)
                  : (english ? 'All customer accounts and global website traffic.' : 'Todas las cuentas cliente y el tráfico global del sitio web.')}
              </p>
            </div>
            <label className="text-sm font-medium text-slate-700">
              {english ? 'Period' : 'Periodo'}
              <select value={days} onChange={(event) => setDays(Number(event.target.value) as 7 | 30 | 90)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                <option value={7}>{english ? 'Last 7 days' : 'Últimos 7 días'}</option>
                <option value={30}>{english ? 'Last 30 days' : 'Últimos 30 días'}</option>
                <option value={90}>{english ? 'Last 90 days' : 'Últimos 90 días'}</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              {english ? 'Customer account' : 'Cuenta cliente'}
              <select value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                <option value="">{english ? 'All accounts' : 'Todas las cuentas'}</option>
                {(analytics?.company_options ?? []).map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
            </label>
          </div>
        </section>
      ) : null}

      {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div> : null}

      {activeTab === 'summary' ? <SummaryView analytics={analytics} chartData={chartData} english={english} loading={loading} onOpen={setActiveTab} /> : null}
      {activeTab === 'app' ? <PlatformUsageView analytics={analytics} english={english} loading={loading} /> : null}
      {activeTab === 'web' ? <WebsiteUsageView analytics={analytics} english={english} loading={loading} /> : null}
      {activeTab === 'technical' ? <TechnicalAuditView audit={audit} english={english} /> : null}
    </div>
  );
}

function SummaryView({
  analytics,
  chartData,
  english,
  loading,
  onOpen,
}: {
  analytics: PlatformAnalytics | null;
  chartData: Array<Record<string, string | number>>;
  english: boolean;
  loading: boolean;
  onOpen: (tab: WorkspaceTab) => void;
}) {
  const app = analytics?.app;
  const web = analytics?.web;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard icon={Users} tone="blue" label={english ? 'Active platform users' : 'Usuarios activos en plataforma'} value={loading ? '—' : String(app?.active_users ?? 0)} helper={english ? 'Unique authenticated users' : 'Usuarios autenticados únicos'} onClick={() => onOpen('app')} />
        <InsightCard icon={Clock3} tone="mint" label={english ? 'Active platform time' : 'Tiempo activo en plataforma'} value={loading ? '—' : formatDuration(app?.active_seconds ?? 0, english)} helper={english ? 'Visible, focused window only' : 'Solo ventana visible y enfocada'} onClick={() => onOpen('app')} />
        <InsightCard icon={Globe2} tone="gold" label={english ? 'Website visitors' : 'Visitantes del sitio web'} value={loading ? '—' : String(web?.visitors ?? 0)} helper={english ? 'Anonymous unique visitors' : 'Visitantes anónimos únicos'} onClick={() => onOpen('web')} />
        <InsightCard icon={MousePointerClick} tone="coral" label={english ? 'Website conversions' : 'Conversiones del sitio'} value={loading ? '—' : String(web?.conversions ?? 0)} helper={english ? 'Completed lead submissions' : 'Envíos de prospecto completados'} onClick={() => onOpen('web')} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
        <Card title={english ? 'Daily adoption' : 'Adopción diaria'} description={english ? 'Active product users compared with anonymous website visitors.' : 'Usuarios activos del producto comparados con visitantes anónimos del sitio.'}>
          {chartData.length ? (
            <div className="h-[310px] px-2 pb-3 pt-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -20, right: 12 }}>
                  <defs>
                    <linearGradient id="platformUsers" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} /><stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} /></linearGradient>
                    <linearGradient id="webVisitors" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#59C3A5" stopOpacity={0.3} /><stop offset="95%" stopColor="#59C3A5" stopOpacity={0.02} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="app_users" name={english ? 'Platform users' : 'Usuarios plataforma'} stroke="#2563EB" fill="url(#platformUsers)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="web_visitors" name={english ? 'Website visitors' : 'Visitantes web'} stroke="#177D66" fill="url(#webVisitors)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState text={english ? 'Collection has started. The trend will appear after the first observations.' : 'La medición ya comenzó. La tendencia aparecerá después de las primeras observaciones.'} />}
        </Card>
        <Card title={english ? 'Measurement quality' : 'Calidad de la medición'} description={english ? 'What the dashboard means—and what it does not capture.' : 'Qué significa el tablero y qué no se captura.'}>
          <div className="space-y-4 p-5 text-sm text-slate-600">
            <QualityItem title={english ? 'Active attention' : 'Atención activa'} text={english ? 'Time counts only while the tab is visible and the browser has focus.' : 'El tiempo cuenta únicamente cuando la pestaña está visible y el navegador tiene el foco.'} />
            <QualityItem title={english ? 'Privacy by design' : 'Privacidad por diseño'} text={english ? 'No form content, customer records, passwords or complete URLs are stored.' : 'No se guardan formularios, registros de clientes, contraseñas ni URLs completas.'} />
            <QualityItem title={english ? 'Honest baseline' : 'Línea base honesta'} text={analytics?.data_since ? (english ? `Data available since ${analytics.data_since}.` : `Datos disponibles desde ${analytics.data_since}.`) : (english ? 'There is no historical usage before activation.' : 'No existe histórico de uso anterior a la activación.')} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function PlatformUsageView({ analytics, english, loading }: { analytics: PlatformAnalytics | null; english: boolean; loading: boolean }) {
  const app = analytics?.app;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard icon={Users} tone="blue" label={english ? 'Active users' : 'Usuarios activos'} value={loading ? '—' : String(app?.active_users ?? 0)} helper={english ? 'Unique users in the period' : 'Usuarios únicos del periodo'} />
        <InsightCard icon={Activity} tone="mint" label={english ? 'Sessions' : 'Sesiones'} value={loading ? '—' : String(app?.sessions ?? 0)} helper={english ? 'Operational visits' : 'Visitas operativas'} />
        <InsightCard icon={Building2} tone="gold" label={english ? 'Accounts with activity' : 'Cuentas con actividad'} value={loading ? '—' : String(app?.active_companies ?? 0)} helper={english ? 'Customer companies using Índice' : 'Empresas cliente usando Índice'} />
        <InsightCard icon={Eye} tone="coral" label={english ? 'Module views' : 'Vistas de módulos'} value={loading ? '—' : String(app?.views ?? 0)} helper={english ? 'Navigation entries' : 'Entradas de navegación'} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <AttentionTable rows={analytics?.app_pages ?? []} english={english} title={english ? 'Modules receiving attention' : 'Módulos con mayor atención'} />
        <Card title={english ? 'Adoption by customer' : 'Adopción por cliente'} description={english ? 'Use this list to identify accounts that need onboarding or follow-up.' : 'Usa esta lista para detectar cuentas que requieren onboarding o seguimiento.'}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3 font-medium">{english ? 'Customer' : 'Cliente'}</th><th className="px-4 py-3 font-medium">{english ? 'Users' : 'Usuarios'}</th><th className="px-4 py-3 font-medium">{english ? 'Sessions' : 'Sesiones'}</th><th className="px-4 py-3 font-medium">{english ? 'Active time' : 'Tiempo activo'}</th><th className="px-5 py-3 font-medium">{english ? 'Last activity' : 'Última actividad'}</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(analytics?.companies ?? []).map((company) => <tr key={company.company_id}><td className="px-5 py-4 font-medium text-slate-900">{company.company_name}</td><td className="px-4 py-4 text-slate-600">{company.active_users}</td><td className="px-4 py-4 text-slate-600">{company.sessions}</td><td className="px-4 py-4 text-slate-600">{formatDuration(company.active_seconds, english)}</td><td className="px-5 py-4 text-slate-600">{formatDateTime(company.last_seen_at, english)}</td></tr>)}
              </tbody>
            </table>
            {!analytics?.companies.length ? <EmptyState text={english ? 'No customer usage has been measured in this period.' : 'No se ha medido uso de clientes en este periodo.'} /> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function WebsiteUsageView({ analytics, english, loading }: { analytics: PlatformAnalytics | null; english: boolean; loading: boolean }) {
  const web = analytics?.web;
  const receiving = analytics?.web_connector.receiving_data;
  const configured = analytics?.web_connector.configured;
  return (
    <div className="space-y-5">
      <section className={`flex flex-col gap-4 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${receiving ? 'border-emerald-200 bg-emerald-50' : configured ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-start gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${receiving ? 'bg-emerald-100 text-emerald-700' : configured ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}><Globe2 className="h-5 w-5" /></span>
          <div><h2 className="font-medium text-slate-950">{receiving ? (english ? 'Website connected and receiving data' : 'Sitio web conectado y recibiendo datos') : configured ? (english ? 'Connector configured; waiting for traffic' : 'Conector configurado; esperando tráfico') : (english ? 'Connector ready; deployment key pending' : 'Conector listo; falta la llave de despliegue')}</h2><p className="mt-1 text-sm text-slate-600">{english ? 'Traffic is anonymous. Campaign source, visited page, active time and lead conversion are measured.' : 'El tráfico es anónimo. Se mide origen de campaña, página visitada, tiempo activo y conversión a prospecto.'}</p></div>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${receiving ? 'bg-emerald-100 text-emerald-800' : configured ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>{receiving ? (english ? 'Receiving' : 'Recibiendo') : configured ? (english ? 'Configured' : 'Configurado') : (english ? 'Pending activation' : 'Pendiente de activar')}</span>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard icon={Users} tone="blue" label={english ? 'Unique visitors' : 'Visitantes únicos'} value={loading ? '—' : String(web?.visitors ?? 0)} helper={english ? 'Anonymous browser references' : 'Referencias anónimas de navegador'} />
        <InsightCard icon={Activity} tone="mint" label={english ? 'Sessions' : 'Sesiones'} value={loading ? '—' : String(web?.sessions ?? 0)} helper={english ? 'Website visits' : 'Visitas al sitio'} />
        <InsightCard icon={Clock3} tone="gold" label={english ? 'Active reading time' : 'Tiempo activo de lectura'} value={loading ? '—' : formatDuration(web?.active_seconds ?? 0, english)} helper={english ? 'Visible and focused only' : 'Solo visible y con foco'} />
        <InsightCard icon={MousePointerClick} tone="coral" label={english ? 'Lead conversions' : 'Conversiones a prospecto'} value={loading ? '—' : String(web?.conversions ?? 0)} helper={english ? 'Successful submissions' : 'Envíos exitosos'} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <AttentionTable rows={analytics?.web_pages ?? []} english={english} title={english ? 'Content receiving attention' : 'Contenido con mayor atención'} />
        <Card title={english ? 'Acquisition sources' : 'Fuentes de adquisición'} description={english ? 'Know which channels bring qualified traffic.' : 'Identifica qué canales atraen tráfico con intención.'}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3 font-medium">{english ? 'Source' : 'Fuente'}</th><th className="px-4 py-3 font-medium">{english ? 'Medium' : 'Medio'}</th><th className="px-4 py-3 font-medium">{english ? 'Visitors' : 'Visitantes'}</th><th className="px-5 py-3 font-medium">{english ? 'Conversions' : 'Conversiones'}</th></tr></thead><tbody className="divide-y divide-slate-100">{(analytics?.web_sources ?? []).map((source) => <tr key={`${source.source}-${source.medium}`}><td className="px-5 py-4 font-medium text-slate-900">{source.source}</td><td className="px-4 py-4 text-slate-600">{source.medium}</td><td className="px-4 py-4 text-slate-600">{source.visitors}</td><td className="px-5 py-4 text-slate-600">{source.conversions}</td></tr>)}</tbody></table>
            {!analytics?.web_sources.length ? <EmptyState text={english ? 'Sources will appear when the website begins sending observations.' : 'Las fuentes aparecerán cuando el sitio comience a enviar observaciones.'} /> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function TechnicalAuditView({ audit, english }: { audit: PlatformAudit | null; english: boolean }) {
  return (
    <Card title={english ? 'Immutable technical trail' : 'Trazabilidad técnica inmutable'} description={english ? `${audit?.events.length ?? 0} recent security, commercial and administrative events.` : `${audit?.events.length ?? 0} eventos recientes de seguridad, operación comercial y administración.`}>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{[english ? 'Date' : 'Fecha', english ? 'Event' : 'Evento', english ? 'Outcome' : 'Resultado', english ? 'Customer' : 'Cliente', english ? 'Actor' : 'Actor', english ? 'Reference' : 'Referencia'].map((label) => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{(audit?.events ?? []).map((event) => <tr key={event.id} className="hover:bg-slate-50"><td className="px-5 py-4 text-slate-600">{formatDateTime(event.occurred_at, english)}</td><td className="px-5 py-4"><p className="font-medium text-slate-900">{event.action.replace(/_/g, ' ').toLowerCase()}</p><p className="mt-1 text-xs text-slate-500">{event.category.replace(/_/g, ' ').toLowerCase()}</p></td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${event.outcome.toUpperCase() === 'SUCCESS' || event.outcome.toUpperCase() === 'CORRECTO' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{event.outcome}</span></td><td className="px-5 py-4 text-slate-600">{event.company_name || (event.company_id ? `#${event.company_id}` : (english ? 'System' : 'Sistema'))}</td><td className="px-5 py-4 text-slate-600">{event.actor_email || (english ? 'Automatic' : 'Automático')}</td><td className="px-5 py-4 font-mono text-xs text-slate-500">{(event.request_id || event.stripe_event_id || event.stripe_object_id || `event-${event.id}`).slice(0, 18)}</td></tr>)}</tbody></table>{!audit?.events.length ? <EmptyState text={english ? 'No technical audit events yet.' : 'Aún no hay eventos de auditoría técnica.'} /> : null}</div>
    </Card>
  );
}

function AttentionTable({ rows, english, title }: { rows: PlatformAnalyticsPage[]; english: boolean; title: string }) {
  return (
    <Card title={title} description={english ? 'Ranked by active visible time, not by passive page loading.' : 'Ordenado por tiempo activo visible, no por cargas pasivas de página.'}>
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3 font-medium">{english ? 'Area' : 'Área'}</th><th className="px-4 py-3 font-medium">{english ? 'Users' : 'Usuarios'}</th><th className="px-4 py-3 font-medium">{english ? 'Views' : 'Vistas'}</th><th className="px-5 py-3 font-medium">{english ? 'Average active time' : 'Tiempo activo promedio'}</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={`${row.route}-${row.section}`}><td className="px-5 py-4"><p className="font-medium capitalize text-slate-900">{routeLabel(row.route, english)}</p>{row.section ? <p className="mt-1 text-xs capitalize text-slate-500">{row.section.replace(/-/g, ' ')}</p> : null}</td><td className="px-4 py-4 text-slate-600">{row.users || row.sessions}</td><td className="px-4 py-4 text-slate-600">{row.views}</td><td className="px-5 py-4 text-slate-600">{formatDuration(averageSeconds(row), english)}</td></tr>)}</tbody></table>{!rows.length ? <EmptyState text={english ? 'No usage has been measured for this period.' : 'No se ha medido actividad durante este periodo.'} /> : null}</div>
    </Card>
  );
}

function InsightCard({ icon: Icon, tone, label, value, helper, onClick }: { icon: typeof Users; tone: 'blue' | 'mint' | 'gold' | 'coral'; label: string; value: string; helper: string; onClick?: () => void }) {
  const tones = { blue: 'bg-blue-50 text-blue-700', mint: 'bg-emerald-50 text-emerald-700', gold: 'bg-amber-50 text-amber-700', coral: 'bg-red-50 text-red-600' };
  const content = <><div className="flex items-start justify-between gap-3"><span className={`grid h-11 w-11 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span><span className="text-2xl font-medium tracking-tight text-slate-950">{value}</span></div><p className="mt-4 text-sm font-medium text-slate-800">{label}</p><p className="mt-1 text-xs text-slate-500">{helper}</p></>;
  const className = `rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm ${onClick ? 'transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md' : ''}`;
  return onClick ? <button type="button" onClick={onClick} className={className}>{content}</button> : <article className={className}>{content}</article>;
}

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><header className="border-b border-slate-100 px-5 py-4"><h2 className="font-medium text-slate-950">{title}</h2>{description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}</header>{children}</section>;
}

function QualityItem({ title, text }: { title: string; text: string }) {
  return <div className="flex items-start gap-3"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><CheckCircle2 className="h-4 w-4" /></span><div><p className="font-medium text-slate-900">{title}</p><p className="mt-1 leading-5 text-slate-500">{text}</p></div></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="grid min-h-40 place-items-center px-6 py-10 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-400"><ShieldCheck className="h-5 w-5" /></span><p className="mt-3 max-w-md text-sm text-slate-500">{text}</p></div></div>;
}
