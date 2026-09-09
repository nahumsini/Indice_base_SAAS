import {
  useOperationsCopy,
  getOperationsCopy,
  operationsText,
  operationsNumber,
  operationsStatus,
  type OperationsCopy,
  type OperationsLocale,
} from "./OperationsTranslations";
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

const getTabs = (copy: OperationsCopy): Array<{ id: WorkspaceTab; es: string; en: string; icon: typeof Activity }> => [
  { id: 'summary', es: copy.overview, en: copy.overview, icon: ChartNoAxesColumnIncreasing },
  { id: 'app', es: copy.platformUsage, en: copy.platformUsage, icon: Activity },
  { id: 'web', es: copy.website, en: copy.website, icon: Globe2 },
  { id: 'technical', es: copy.technicalAudit, en: copy.technicalAudit, icon: ClipboardList },
];

const getRouteLabels = (copy: OperationsCopy): Record<string, { es: string; en: string }> => ({
  dashboard: { es: copy.dashboard, en: copy.dashboard },
  'home-panel': { es: copy.homePanel, en: copy.homePanel },
  'human-resources': { es: copy.humanResources, en: copy.humanResources },
  'processes-tasks': { es: copy.processesAndTasks, en: copy.processesAndTasks },
  expenses: { es: copy.expenses, en: copy.expenses },
  'petty-cash': { es: copy.pettyCash, en: copy.pettyCash },
  'point-of-sale': { es: copy.pointOfSale, en: copy.pointOfSale },
  sales: { es: copy.sales, en: copy.sales },
  receivables: { es: copy.receivables, en: copy.receivables },
  kpis: { es: copy.kpis, en: copy.kpis },
  inventory: { es: copy.inventory, en: copy.inventory },
  maintenance: { es: copy.maintenance, en: copy.maintenance },
  '/': { es: copy.websiteHome, en: copy.websiteHome },
  '/index.php': { es: copy.websiteHome, en: copy.websiteHome },
  '/modulos.php': { es: copy.websiteModules, en: copy.websiteModules },
  '/planes.php': { es: copy.plans, en: copy.plans },
  '/contacto.php': { es: copy.contact, en: copy.contact },
  '/registro.php': { es: copy.registration, en: copy.registration },
});

const formatDuration = (locale: OperationsLocale, seconds: number, _english?: boolean) => {
  const unit = seconds < 60 ? "second" : seconds < 3600 ? "minute" : "hour";
  const value = seconds < 60 ? seconds : seconds < 3600 ? Math.round(seconds / 60) : seconds / 3600;
  return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "short", maximumFractionDigits: unit === "hour" && value < 10 ? 1 : 0 }).format(value);
};

const formatDateTime = (locale: OperationsLocale, value: string, english: boolean) => new Intl.DateTimeFormat(
  locale,
  { dateStyle: 'medium', timeStyle: 'short' },
).format(new Date(value));

const routeLabel = (locale: OperationsLocale, route: string, english: boolean) => (
  getRouteLabels(getOperationsCopy(locale))[route]?.en
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
  const { copy, locale } = useOperationsCopy();
  const tabs = getTabs(copy);
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
      setError(failure instanceof Error ? failure.message : (copy.usageAnalyticsCouldNotBeLoaded));
    } finally {
      setLoading(false);
    }
  }, [companyId, days, copy]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(() => (analytics?.trend ?? []).map((row) => ({
    ...row,
    label: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
      .format(new Date(`${row.date}T12:00:00Z`)),
  })), [analytics?.trend, locale]);

  const selectedCompany = analytics?.company_options.find((company) => String(company.id) === companyId);

  return (
    <div className="space-y-5">
      <IndiceTitleBar
        tone="blue"
        icon={<ChartNoAxesColumnIncreasing className="h-5 w-5" />}
        eyebrow={copy.productObservability}
        title={copy.usageAndTraceability}
        subtitle={copy.understandAdoptionActiveAttentionAndWebsiteDemand}
        actions={(
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-medium text-blue-800 transition hover:bg-blue-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {copy.refresh}
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
                {tab.en}
              </button>
            );
          })}
        </div>
      </section>

      {activeTab !== 'technical' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_240px_240px] lg:items-end">
            <div>
              <h2 className="font-medium text-slate-950">{copy.analysisScope}
            </h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedCompany
                  ? (operationsText(copy.platformActivityForValueWebsiteMetricsRemain, { value0: selectedCompany.name }, locale))
                  : (copy.allCustomerAccountsAndGlobalWebsiteTraffic)}
              </p>
            </div>
            <label className="text-sm font-medium text-slate-700">
              {copy.period}
              <select value={days} onChange={(event) => setDays(Number(event.target.value) as 7 | 30 | 90)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                <option value={7}>{copy.lastDays}
            </option>
                <option value={30}>{copy.lastDays31}</option>
                <option value={90}>{copy.lastDays32}</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              {copy.customerAccount}
              <select value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                <option value="">{copy.allAccounts}
            </option>
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
  const { copy, locale } = useOperationsCopy();
  const app = analytics?.app;
  const web = analytics?.web;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard icon={Users} tone="blue" label={copy.activePlatformUsers} value={loading ? '—' : operationsNumber(app?.active_users ?? 0, locale)} helper={copy.uniqueAuthenticatedUsers} onClick={() => onOpen('app')} />
        <InsightCard icon={Clock3} tone="mint" label={copy.activePlatformTime} value={loading ? '—' : formatDuration(locale, app?.active_seconds ?? 0, english)} helper={copy.visibleFocusedWindowOnly} onClick={() => onOpen('app')} />
        <InsightCard icon={Globe2} tone="gold" label={copy.websiteVisitors} value={loading ? '—' : operationsNumber(web?.visitors ?? 0, locale)} helper={copy.anonymousUniqueVisitors} onClick={() => onOpen('web')} />
        <InsightCard icon={MousePointerClick} tone="coral" label={copy.websiteConversions} value={loading ? '—' : operationsNumber(web?.conversions ?? 0, locale)} helper={copy.completedLeadSubmissions} onClick={() => onOpen('web')} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
        <Card title={copy.dailyAdoption} description={copy.activeProductUsersComparedWithAnonymousWebsite}>
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
                  <YAxis tickFormatter={(value) => operationsNumber(Number(value), locale)} allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => operationsNumber(Number(value), locale)} />
                  <Area type="monotone" dataKey="app_users" name={copy.platformUsers} stroke="#2563EB" fill="url(#platformUsers)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="web_visitors" name={copy.websiteVisitors} stroke="#177D66" fill="url(#webVisitors)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState text={copy.collectionHasStartedTheTrendWillAppear} />}
        </Card>
        <Card title={copy.measurementQuality} description={copy.whatTheDashboardMeansAndWhatIt}>
          <div className="space-y-4 p-5 text-sm text-slate-600">
            <QualityItem title={copy.activeAttention} text={copy.timeCountsOnlyWhileTheTabIs} />
            <QualityItem title={copy.privacyByDesign} text={copy.noFormContentCustomerRecordsPasswordsOr} />
            <QualityItem title={copy.honestBaseline} text={analytics?.data_since ? (operationsText(copy.dataAvailableSinceValue, { value0: analytics.data_since }, locale)) : (copy.thereIsNoHistoricalUsageBeforeActivation)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function PlatformUsageView({ analytics, english, loading }: { analytics: PlatformAnalytics | null; english: boolean; loading: boolean }) {
  const { copy, locale } = useOperationsCopy();
  const app = analytics?.app;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard icon={Users} tone="blue" label={copy.activeUsers} value={loading ? '—' : operationsNumber(app?.active_users ?? 0, locale)} helper={copy.uniqueUsersInThePeriod} />
        <InsightCard icon={Activity} tone="mint" label={copy.sessions} value={loading ? '—' : operationsNumber(app?.sessions ?? 0, locale)} helper={copy.operationalVisits} />
        <InsightCard icon={Building2} tone="gold" label={copy.accountsWithActivity} value={loading ? '—' : operationsNumber(app?.active_companies ?? 0, locale)} helper={copy.customerCompaniesUsingNdice} />
        <InsightCard icon={Eye} tone="coral" label={copy.moduleViews} value={loading ? '—' : operationsNumber(app?.views ?? 0, locale)} helper={copy.navigationEntries} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <AttentionTable rows={analytics?.app_pages ?? []} english={english} title={copy.modulesReceivingAttention} />
        <Card title={copy.adoptionByCustomer} description={copy.useThisListToIdentifyAccountsThat}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3 font-medium">{copy.customer}
            </th><th className="px-4 py-3 font-medium">{copy.users}
            </th><th className="px-4 py-3 font-medium">{copy.sessions}
            </th><th className="px-4 py-3 font-medium">{copy.activeTime}
            </th><th className="px-5 py-3 font-medium">{copy.lastActivity}
            </th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(analytics?.companies ?? []).map((company) => <tr key={company.company_id}><td className="px-5 py-4 font-medium text-slate-900">{company.company_name}</td><td className="px-4 py-4 text-slate-600">{operationsNumber(company.active_users, locale)}</td><td className="px-4 py-4 text-slate-600">{operationsNumber(company.sessions, locale)}</td><td className="px-4 py-4 text-slate-600">{formatDuration(locale, company.active_seconds, english)}</td><td className="px-5 py-4 text-slate-600">{formatDateTime(locale, company.last_seen_at, english)}</td></tr>)}
              </tbody>
            </table>
            {!analytics?.companies.length ? <EmptyState text={copy.noCustomerUsageHasBeenMeasuredIn} /> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function WebsiteUsageView({ analytics, english, loading }: { analytics: PlatformAnalytics | null; english: boolean; loading: boolean }) {
  const { copy, locale } = useOperationsCopy();
  const web = analytics?.web;
  const receiving = analytics?.web_connector.receiving_data;
  const configured = analytics?.web_connector.configured;
  return (
    <div className="space-y-5">
      <section className={`flex flex-col gap-4 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${receiving ? 'border-emerald-200 bg-emerald-50' : configured ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-start gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${receiving ? 'bg-emerald-100 text-emerald-700' : configured ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}><Globe2 className="h-5 w-5" /></span>
          <div><h2 className="font-medium text-slate-950">{receiving ? (copy.websiteConnectedAndReceivingData) : configured ? (copy.connectorConfiguredWaitingForTraffic) : (copy.connectorReadyDeploymentKeyPending)}</h2><p className="mt-1 text-sm text-slate-600">{copy.trafficIsAnonymousCampaignSourceVisitedPage}
            </p></div>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${receiving ? 'bg-emerald-100 text-emerald-800' : configured ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>{receiving ? (copy.receiving) : configured ? (copy.configured) : (copy.pendingActivation)}</span>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard icon={Users} tone="blue" label={copy.uniqueVisitors} value={loading ? '—' : operationsNumber(web?.visitors ?? 0, locale)} helper={copy.anonymousBrowserReferences} />
        <InsightCard icon={Activity} tone="mint" label={copy.sessions} value={loading ? '—' : operationsNumber(web?.sessions ?? 0, locale)} helper={copy.websiteVisits} />
        <InsightCard icon={Clock3} tone="gold" label={copy.activeReadingTime} value={loading ? '—' : formatDuration(locale, web?.active_seconds ?? 0, english)} helper={copy.visibleAndFocusedOnly} />
        <InsightCard icon={MousePointerClick} tone="coral" label={copy.leadConversions} value={loading ? '—' : operationsNumber(web?.conversions ?? 0, locale)} helper={copy.successfulSubmissions} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <AttentionTable rows={analytics?.web_pages ?? []} english={english} title={copy.contentReceivingAttention} />
        <Card title={copy.acquisitionSources} description={copy.knowWhichChannelsBringQualifiedTraffic}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3 font-medium">{copy.source}
            </th><th className="px-4 py-3 font-medium">{copy.medium}
            </th><th className="px-4 py-3 font-medium">{copy.visitors}
            </th><th className="px-5 py-3 font-medium">{copy.conversions}
            </th></tr></thead><tbody className="divide-y divide-slate-100">{(analytics?.web_sources ?? []).map((source) => <tr key={`${source.source}-${source.medium}`}><td className="px-5 py-4 font-medium text-slate-900">{source.source}</td><td className="px-4 py-4 text-slate-600">{source.medium}</td><td className="px-4 py-4 text-slate-600">{source.visitors}</td><td className="px-5 py-4 text-slate-600">{source.conversions}</td></tr>)}</tbody></table>
            {!analytics?.web_sources.length ? <EmptyState text={copy.sourcesWillAppearWhenTheWebsiteBegins} /> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function TechnicalAuditView({ audit, english }: { audit: PlatformAudit | null; english: boolean }) {
  const { copy, locale } = useOperationsCopy();
  return (
    <Card title={copy.immutableTechnicalTrail} description={operationsText(copy.valueRecentSecurityCommercialAndAdministrativeEvents, { value0: audit?.events.length ?? 0 }, locale)}>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{[copy.date, copy.event, copy.outcome, copy.customer, copy.actor, copy.reference].map((label) => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{(audit?.events ?? []).map((event) => <tr key={event.id} className="hover:bg-slate-50"><td className="px-5 py-4 text-slate-600">{formatDateTime(locale, event.occurred_at, english)}</td><td className="px-5 py-4"><p className="font-medium text-slate-900">{event.action.replace(/_/g, ' ').toLowerCase()}</p><p className="mt-1 text-xs text-slate-500">{event.category.replace(/_/g, ' ').toLowerCase()}</p></td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${event.outcome.toUpperCase() === 'SUCCESS' || event.outcome.toUpperCase() === 'CORRECTO' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{operationsStatus(event.outcome, locale)}</span></td><td className="px-5 py-4 text-slate-600">{event.company_name || (event.company_id ? `#${event.company_id}` : (copy.system))}</td><td className="px-5 py-4 text-slate-600">{event.actor_email || (copy.automatic)}</td><td className="px-5 py-4 font-mono text-xs text-slate-500">{(event.request_id || event.stripe_event_id || event.stripe_object_id || `event-${event.id}`).slice(0, 18)}</td></tr>)}</tbody></table>{!audit?.events.length ? <EmptyState text={copy.noTechnicalAuditEventsYet} /> : null}</div>
    </Card>
  );
}

function AttentionTable({ rows, english, title }: { rows: PlatformAnalyticsPage[]; english: boolean; title: string }) {
  const { copy, locale } = useOperationsCopy();
  return (
    <Card title={title} description={copy.rankedByActiveVisibleTimeNotBy}>
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3 font-medium">{copy.area}
            </th><th className="px-4 py-3 font-medium">{copy.users}
            </th><th className="px-4 py-3 font-medium">{copy.views}
            </th><th className="px-5 py-3 font-medium">{copy.averageActiveTime}
            </th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={`${row.route}-${row.section}`}><td className="px-5 py-4"><p className="font-medium capitalize text-slate-900">{routeLabel(locale, row.route, english)}</p>{row.section ? <p className="mt-1 text-xs capitalize text-slate-500">{row.section.replace(/-/g, ' ')}</p> : null}</td><td className="px-4 py-4 text-slate-600">{operationsNumber(row.users || row.sessions, locale)}</td><td className="px-4 py-4 text-slate-600">{operationsNumber(row.views, locale)}</td><td className="px-5 py-4 text-slate-600">{formatDuration(locale, averageSeconds(row), english)}</td></tr>)}</tbody></table>{!rows.length ? <EmptyState text={copy.noUsageHasBeenMeasuredForThis} /> : null}</div>
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
