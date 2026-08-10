import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  BookOpenCheck,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  FileClock,
  Gift,
  HardDrive,
  Handshake,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  Mail,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { IndiceBrandLogo } from '../Auth/components/IndiceBrandLogo';
import AccountCreationModal from './AccountCreationModal';
import CompanyAccountDrawer from './CompanyAccountDrawer';
import ConsultingAdminTab from './ConsultingAdminTab';
import {
  platformAdminApi,
  type BenefitPayload,
  type CourtesyCodeCatalog,
  type CourtesyCodePayload,
  type PlatformAdminContext,
  type PlatformAccountCreatePayload,
  type PlatformAccountCreateResult,
  type PlatformAudit,
  type PlatformBilling,
  type PlatformCatalog,
  type PlatformCatalogPrice,
  type PlatformCatalogProduct,
  type PlatformCompanyDetail,
  type PlatformCompanySummary,
  type PlatformInvoice,
  type PlatformModule,
  type PlatformModules,
  type PlatformOverview,
} from '../api/platformAdmin';

type AdminTab = 'overview' | 'customers' | 'billing' | 'catalog' | 'modules' | 'consulting' | 'courtesy' | 'audit';
type Revocation = { kind: 'benefit' | 'courtesy'; reference: string } | null;
type ModuleAvailabilityChange = { module: PlatformModule; active: boolean } | null;

const initialCourtesy: CourtesyCodePayload = {
  label: '',
  allowed_email: '',
  product_codes: [],
  included_extra_seats: 0,
  access_days: 30,
  permanent: false,
  max_redemptions: 1,
  reason: '',
  campaign_code: '',
};

const initialBenefit: BenefitPayload = {
  benefit_type: 'PRODUCT',
  product_code: '',
  quantity: 1,
  source_type: 'COURTESY',
  reason: '',
  campaign_code: '',
};

const controlClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#177D66] focus:ring-2 focus:ring-[#177D66]/10 disabled:bg-slate-100 disabled:text-slate-400';
const tableHeadClass = 'whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-slate-500';
const tableCellClass = 'px-4 py-3 align-middle text-sm text-slate-700';

const tabs: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
  { id: 'customers', label: 'Clientes', icon: Building2 },
  { id: 'billing', label: 'Facturación', icon: CreditCard },
  { id: 'catalog', label: 'Productos y precios', icon: CircleDollarSign },
  { id: 'modules', label: 'Módulos', icon: Boxes },
  { id: 'consulting', label: 'Consultorías', icon: Handshake },
  { id: 'courtesy', label: 'Cortesías', icon: Gift },
  { id: 'audit', label: 'Auditoría', icon: ClipboardList },
];

const offerLabels: Record<string, string> = {
  basic_1: 'Un módulo',
  basic_2: 'Dos módulos',
  basic_3: 'Tres módulos',
  basic_all: 'Cuatro o más módulos',
  extra_seat: 'Usuario adicional',
  storage_block: 'Almacenamiento adicional',
};

export default function PlatformAdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [context, setContext] = useState<PlatformAdminContext | null>(null);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [billing, setBilling] = useState<PlatformBilling | null>(null);
  const [catalog, setCatalog] = useState<PlatformCatalog | null>(null);
  const [moduleRegistry, setModuleRegistry] = useState<PlatformModules | null>(null);
  const [auditLog, setAuditLog] = useState<PlatformAudit | null>(null);
  const [courtesyCatalog, setCourtesyCatalog] = useState<CourtesyCodeCatalog | null>(null);
  const [selected, setSelected] = useState<PlatformCompanyDetail | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [benefit, setBenefit] = useState<BenefitPayload>(initialBenefit);
  const [courtesy, setCourtesy] = useState<CourtesyCodePayload>(initialCourtesy);
  const [createdCourtesyCode, setCreatedCourtesyCode] = useState('');
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [revocation, setRevocation] = useState<Revocation>(null);
  const [revocationReason, setRevocationReason] = useState('Fin de cortesía o promoción');
  const [moduleChange, setModuleChange] = useState<ModuleAvailabilityChange>(null);
  const [moduleChangeReason, setModuleChangeReason] = useState('Disponibilidad global administrada desde el panel root');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [access, overviewData, billingData, catalogData, modulesData, auditData, courtesyData] = await Promise.all([
        platformAdminApi.getContext(),
        platformAdminApi.getOverview(),
        platformAdminApi.getBilling(),
        platformAdminApi.getCatalog(),
        platformAdminApi.getModules(),
        platformAdminApi.getAudit(),
        platformAdminApi.getCourtesyCodes(),
      ]);
      setContext(access);
      setOverview(overviewData);
      setBilling(billingData);
      setCatalog(catalogData);
      setModuleRegistry(modulesData);
      setAuditLog(auditData);
      setCourtesyCatalog(courtesyData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la operación de plataforma.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const companies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (overview?.companies ?? []).filter((company) => {
      const matchesQuery = !normalizedQuery || [company.name, company.owner_email, String(company.id)]
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
      const state = company.billing_status || company.lifecycle_state || 'legacy';
      const matchesStatus = statusFilter === 'all' || state.toLowerCase() === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [overview, query, statusFilter]);

  const pagedCompanies = useMemo(() => {
    const start = (page - 1) * pageSize;
    return companies.slice(start, start + pageSize);
  }, [companies, page, pageSize]);

  const activeCatalogProducts = useMemo(() => {
    const activeVersion = catalog?.versions.find((version) => version.status === 'ACTIVE') || catalog?.versions[0];
    return (catalog?.products ?? [])
      .filter((product) => product.active && (!activeVersion || product.catalog_version_id === activeVersion.id))
      .sort((left, right) => left.sort_order - right.sort_order);
  }, [catalog]);

  useEffect(() => { setPage(1); }, [query, statusFilter, pageSize]);

  const openCompany = async (company: PlatformCompanySummary | number) => {
    setError('');
    try {
      setSelected(await platformAdminApi.getCompany(typeof company === 'number' ? company : company.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la cuenta.');
    }
  };

  const refreshOverviewAndCompany = async () => {
    const overviewData = await platformAdminApi.getOverview();
    setOverview(overviewData);
    if (selected) setSelected(await platformAdminApi.getCompany(selected.id));
  };

  const createCompanyAccount = async (payload: PlatformAccountCreatePayload): Promise<PlatformAccountCreateResult> => {
    const created = await platformAdminApi.createCompanyAccount(payload);
    const [overviewData, courtesyData, auditData] = await Promise.all([
      platformAdminApi.getOverview(),
      platformAdminApi.getCourtesyCodes(),
      platformAdminApi.getAudit(),
    ]);
    setOverview(overviewData);
    setCourtesyCatalog(courtesyData);
    setAuditLog(auditData);
    return created;
  };

  const grantProductAccess = async (productCode: string) => {
    if (!selected || saving) return;
    setSaving(true);
    setError('');
    try {
      await platformAdminApi.grantBenefit(selected.id, {
        benefit_type: 'PRODUCT',
        product_code: productCode,
        quantity: 1,
        source_type: 'SUPPORT',
        reason: 'Acceso de módulo administrado desde la cuenta Root.',
        campaign_code: 'ROOT-ACCESS',
      });
      await refreshOverviewAndCompany();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo habilitar el módulo.');
    } finally {
      setSaving(false);
    }
  };

  const submitBenefit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || saving) return;
    setSaving(true);
    setError('');
    try {
      await platformAdminApi.grantBenefit(selected.id, {
        ...benefit,
        product_code: benefit.benefit_type === 'PRODUCT' ? benefit.product_code?.trim() : undefined,
        quantity: benefit.benefit_type === 'PRODUCT' ? 1 : Number(benefit.quantity || 1),
        reason: benefit.reason.trim(),
        campaign_code: benefit.campaign_code?.trim() || undefined,
        ends_at: benefit.ends_at ? new Date(benefit.ends_at).toISOString() : undefined,
      });
      setBenefit(initialBenefit);
      await refreshOverviewAndCompany();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo otorgar el beneficio.');
    } finally {
      setSaving(false);
    }
  };

  const submitCourtesyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const created = await platformAdminApi.createCourtesyCode({
        ...courtesy,
        label: courtesy.label.trim(),
        allowed_email: courtesy.allowed_email?.trim().toLowerCase() || undefined,
        access_days: courtesy.permanent ? undefined : Number(courtesy.access_days || 30),
        included_extra_seats: Number(courtesy.included_extra_seats || 0),
        max_redemptions: Number(courtesy.max_redemptions || 1),
        reason: courtesy.reason.trim(),
        campaign_code: courtesy.campaign_code?.trim() || undefined,
      });
      setCreatedCourtesyCode(created.code || '');
      setCourtesy(initialCourtesy);
      setCourtesyCatalog(await platformAdminApi.getCourtesyCodes());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo generar el código de cortesía.');
    } finally {
      setSaving(false);
    }
  };

  const confirmRevocation = async () => {
    if (!revocation || saving || !revocationReason.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (revocation.kind === 'benefit') {
        if (!selected) return;
        await platformAdminApi.revokeBenefit(selected.id, revocation.reference, revocationReason.trim());
        await refreshOverviewAndCompany();
      } else {
        await platformAdminApi.revokeCourtesyCode(revocation.reference, revocationReason.trim());
        setCourtesyCatalog(await platformAdminApi.getCourtesyCodes());
      }
      setRevocation(null);
      setRevocationReason('Fin de cortesía o promoción');
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'No se pudo completar la revocación.');
    } finally {
      setSaving(false);
    }
  };

  const confirmModuleAvailability = async () => {
    if (!moduleChange || saving || moduleChangeReason.trim().length < 3) return;
    setSaving(true);
    setError('');
    try {
      await platformAdminApi.updateModuleAvailability(
        moduleChange.module.id,
        moduleChange.active,
        moduleChangeReason.trim(),
      );
      setModuleRegistry(await platformAdminApi.getModules());
      setModuleChange(null);
      setModuleChangeReason('Disponibilidad global administrada desde el panel root');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo cambiar la disponibilidad global del módulo.');
    } finally {
      setSaving(false);
    }
  };

  const environment = environmentLabel();
  const totals = overview?.totals;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#222831]">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <IndiceBrandLogo alt="Índice" className="h-9 w-28 shrink-0" imageClassName="w-[130px]" />
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-medium text-slate-900">Administración de plataforma</h1>
                <span className={`hidden rounded-full px-2 py-1 text-[11px] font-medium sm:inline-flex ${environment.className}`}>{environment.label}</span>
              </div>
              <p className="hidden text-xs text-slate-500 md:block">Clientes, catálogo, accesos y operación comercial</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void loadAll()} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50" aria-label="Actualizar información">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={() => navigate('/dashboard')} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Volver al ERP</span>
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-4 lg:px-6" aria-label="Secciones de administración">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition ${active ? 'border-[#177D66] text-[#177D66]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                <Icon className="h-4 w-4" />{tab.label}
              </button>
            );
          })}
        </nav>
        <div className="grid h-1 grid-cols-4" aria-hidden="true"><span className="bg-[#59C3A5]" /><span className="bg-[#F7C845]" /><span className="bg-[#FF6B63]" /><span className="bg-[#2563EB]" /></div>
      </header>

      <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 lg:px-6 lg:py-6">
        {error ? <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div> : null}
        {loading && !overview ? <LoadingState /> : null}

        {!loading || overview ? (
          <>
            {activeTab === 'overview' ? (
              <OverviewTab totals={totals} companies={companies} billing={billing} onOpenCompany={openCompany} onNavigate={setActiveTab} />
            ) : null}
            {activeTab === 'customers' ? (
              <CustomersTab companies={companies} pagedCompanies={pagedCompanies} query={query} statusFilter={statusFilter} page={page} pageSize={pageSize} canCreate={Boolean(context?.can_manage_accounts)} onCreate={() => setCreateAccountOpen(true)} onQuery={setQuery} onStatus={setStatusFilter} onPage={setPage} onPageSize={setPageSize} onOpenCompany={openCompany} />
            ) : null}
            {activeTab === 'billing' ? <BillingTab data={billing} onOpenCompany={openCompany} /> : null}
            {activeTab === 'catalog' ? <CatalogTab data={catalog} /> : null}
            {activeTab === 'modules' ? <ModulesTab data={moduleRegistry} canManage={Boolean(context?.can_manage_modules)} saving={saving} onChange={setModuleChange} /> : null}
            {activeTab === 'consulting' ? <ConsultingAdminTab canManage={Boolean(context?.can_manage_consulting)} /> : null}
            {activeTab === 'courtesy' ? (
              <CourtesyTab context={context} catalog={courtesyCatalog} value={courtesy} createdCode={createdCourtesyCode} saving={saving} onChange={setCourtesy} onSubmit={submitCourtesyCode} onRevoke={(reference) => setRevocation({ kind: 'courtesy', reference })} />
            ) : null}
            {activeTab === 'audit' ? <AuditTab data={auditLog} /> : null}
          </>
        ) : null}
      </div>

      {selected ? (
        <CompanyAccountDrawer company={selected} context={context} catalogProducts={activeCatalogProducts} benefit={benefit} saving={saving} onClose={() => setSelected(null)} onBenefit={setBenefit} onSubmitBenefit={submitBenefit} onGrantProduct={(productCode) => void grantProductAccess(productCode)} onRevokeBenefit={(reference) => setRevocation({ kind: 'benefit', reference })} />
      ) : null}
      {createAccountOpen ? (
        <AccountCreationModal
          products={activeCatalogProducts}
          onClose={() => setCreateAccountOpen(false)}
          onCreate={createCompanyAccount}
          onOpenAccount={(companyId) => {
            setCreateAccountOpen(false);
            setActiveTab('customers');
            void openCompany(companyId);
          }}
        />
      ) : null}
      {revocation ? (
        <ConfirmModal reason={revocationReason} saving={saving} onReason={setRevocationReason} onCancel={() => setRevocation(null)} onConfirm={() => void confirmRevocation()} />
      ) : null}
      {moduleChange ? (
        <ModuleAvailabilityModal
          change={moduleChange}
          reason={moduleChangeReason}
          saving={saving}
          onReason={setModuleChangeReason}
          onCancel={() => setModuleChange(null)}
          onConfirm={() => void confirmModuleAvailability()}
        />
      ) : null}
    </main>
  );
}

function OverviewTab({ totals, companies, billing, onOpenCompany, onNavigate }: {
  totals?: PlatformOverview['totals'];
  companies: PlatformCompanySummary[];
  billing: PlatformBilling | null;
  onOpenCompany: (company: PlatformCompanySummary | number) => void;
  onNavigate: (tab: AdminTab) => void;
}) {
  const attention = totals?.attention_required ?? 0;
  const trials = totals?.trials_ending_soon ?? 0;
  return (
    <div className="space-y-5">
      <PageIntro eyebrow="Operación central" title="Pulso comercial de Índice" description="Una vista para seguir clientes, ingresos, vencimientos y accesos sin entrar a cada cuenta." />
      {attention > 0 || trials > 0 ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-amber-900"><CircleAlert className="h-5 w-5" /><span>{attention > 0 ? `${attention} cuenta(s) requieren atención de pago.` : ''} {trials > 0 ? `${trials} prueba(s) terminan en los próximos 7 días.` : ''}</span></div>
          <button type="button" onClick={() => onNavigate('customers')} className="text-left text-sm font-medium text-amber-900 underline-offset-4 hover:underline">Revisar clientes</button>
        </section>
      ) : null}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={CircleDollarSign} label="Ingreso mensual estimado" value={formatMoney(totals?.monthly_recurring_cents, totals?.currency)} accent="mint" />
        <Metric icon={CreditCard} label="Cobrado últimos 30 días" value={formatMoney(totals?.paid_last_30_days_cents, totals?.currency)} accent="blue" />
        <Metric icon={BadgeCheck} label="Suscripciones activas" value={String(totals?.active_subscriptions ?? 0)} accent="mint" />
        <Metric icon={Sparkles} label="Pruebas activas" value={String(totals?.trialing_subscriptions ?? 0)} accent="gold" />
        <Metric icon={Building2} label="Cuentas registradas" value={String(totals?.companies ?? 0)} accent="coral" />
      </section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.75fr)]">
        <Panel title="Clientes y suscripciones" description="Tarifa, módulos, usuarios y estado comercial actual." action={<button type="button" onClick={() => onNavigate('customers')} className="text-sm font-medium text-[#177D66]">Ver todos</button>}>
          <CustomersTable companies={companies.slice(0, 8)} onOpenCompany={onOpenCompany} compact />
        </Panel>
        <Panel title="Facturación reciente" description="Últimos movimientos sincronizados con Stripe." action={<button type="button" onClick={() => onNavigate('billing')} className="text-sm font-medium text-[#177D66]">Ver facturación</button>}>
          <div className="divide-y divide-slate-100">
            {(billing?.invoices ?? []).slice(0, 6).map((invoice) => (
              <button key={invoice.invoice_id} type="button" onClick={() => invoice.company_id && onOpenCompany(invoice.company_id)} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition hover:bg-slate-50">
                <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{invoice.company_name || 'Cuenta sin asociar'}</p><p className="mt-0.5 text-xs text-slate-500">{formatDate(invoice.updated_at)} · {statusLabel(invoice.status)}</p></div>
                <p className="shrink-0 text-sm font-medium text-slate-900">{formatMoney(invoice.amount_paid_cents || invoice.amount_due_cents, invoice.currency)}</p>
              </button>
            ))}
            {!billing?.invoices.length ? <EmptyRow icon={CreditCard} text="Aún no hay facturas sincronizadas." /> : null}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function CustomersTab({ companies, pagedCompanies, query, statusFilter, page, pageSize, canCreate, onCreate, onQuery, onStatus, onPage, onPageSize, onOpenCompany }: {
  companies: PlatformCompanySummary[];
  pagedCompanies: PlatformCompanySummary[];
  query: string;
  statusFilter: string;
  page: number;
  pageSize: number;
  canCreate: boolean;
  onCreate: () => void;
  onQuery: (value: string) => void;
  onStatus: (value: string) => void;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  onOpenCompany: (company: PlatformCompanySummary | number) => void;
}) {
  const pages = Math.max(1, Math.ceil(companies.length / pageSize));
  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Clientes"
        title="Cuentas, contratos y acceso"
        description="Crea empresas, entrega accesos de demostración y administra planes y módulos desde un solo lugar."
        icon={Building2}
        action={canCreate ? <button type="button" onClick={onCreate} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8]"><Plus className="h-4 w-4" /> Agregar cuenta</button> : null}
      />
      <Panel title="Directorio comercial" description={`${companies.length} cuenta(s) coinciden con los filtros.`}>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative w-full max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => onQuery(event.target.value)} className={`${controlClass} pl-10`} placeholder="Buscar empresa, correo o ID" /></label>
          <div className="flex gap-2">
            <select value={statusFilter} onChange={(event) => onStatus(event.target.value)} className={`${controlClass} min-w-40`} aria-label="Filtrar por estado"><option value="all">Todos los estados</option><option value="trialing">En prueba</option><option value="active">Activa</option><option value="past_due">Pago pendiente</option><option value="canceled">Cancelada</option><option value="legacy">Legacy</option></select>
            <select value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))} className={`${controlClass} w-24`} aria-label="Filas por página">{[10, 25, 50, 100, 200].map((size) => <option key={size} value={size}>{size}</option>)}</select>
          </div>
        </div>
        <CustomersTable companies={pagedCompanies} onOpenCompany={onOpenCompany} />
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>Página {page} de {pages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 disabled:opacity-40" aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></button><button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 disabled:opacity-40" aria-label="Página siguiente"><ChevronRight className="h-4 w-4" /></button></div>
        </div>
      </Panel>
    </div>
  );
}

function CustomersTable({ companies, onOpenCompany, compact = false }: { companies: PlatformCompanySummary[]; onOpenCompany: (company: PlatformCompanySummary | number) => void; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] border-collapse">
        <thead className="bg-slate-50"><tr><th className={tableHeadClass}>Cliente</th><th className={tableHeadClass}>Estado</th><th className={tableHeadClass}>Plan y módulos</th><th className={tableHeadClass}>Tarifa</th><th className={tableHeadClass}>Usuarios</th><th className={tableHeadClass}>Próximo evento</th><th className={tableHeadClass}>Pago</th><th className={`${tableHeadClass} text-right`}>Acción</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {companies.map((company) => (
            <tr key={company.id} className="transition hover:bg-slate-50/80">
              <td className={tableCellClass}><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8f5f2] text-sm font-medium text-[#177D66]">{initials(company.name)}</span><div className="min-w-0"><p className="max-w-52 truncate font-medium text-slate-900">{company.name}</p><p className="mt-0.5 max-w-52 truncate text-xs text-slate-500">{company.owner_email || `Company #${company.id}`}</p></div></div></td>
              <td className={tableCellClass}><StatusBadge status={company.billing_status || company.lifecycle_state || 'legacy'} /></td>
              <td className={tableCellClass}><p className="font-medium text-slate-800">{offerLabels[company.offer_code || ''] || company.offer_code || 'Sin plan'}</p><div className="mt-1 flex max-w-64 flex-wrap gap-1">{(company.product_names ?? []).slice(0, compact ? 2 : 3).map((name) => <span key={name} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{name}</span>)}{(company.product_names?.length ?? 0) > (compact ? 2 : 3) ? <span className="text-[11px] text-slate-500">+{(company.product_names?.length ?? 0) - (compact ? 2 : 3)}</span> : null}</div></td>
              <td className={tableCellClass}><p className="font-medium text-slate-900">{formatMoney(company.recurring_amount_cents, company.currency)}</p><p className="mt-0.5 text-xs text-slate-500">{company.billing_interval === 'YEAR' ? 'anual' : company.billing_status ? 'mensual' : 'sin contrato'}</p></td>
              <td className={tableCellClass}><p className="font-medium text-slate-800">{company.active_members} / {(company.included_seats || 0) + (company.purchased_extra_seats || 0)}</p><p className="mt-0.5 text-xs text-slate-500">activos / disponibles</p></td>
              <td className={tableCellClass}><p className="text-sm text-slate-700">{company.billing_status === 'trialing' ? 'Fin de prueba' : company.current_period_ends_at ? 'Renovación' : 'Sin fecha'}</p><p className="mt-0.5 text-xs text-slate-500">{formatDate(company.billing_status === 'trialing' ? company.trial_ends_at : company.current_period_ends_at)}</p></td>
              <td className={tableCellClass}><StatusBadge status={company.last_invoice_status || company.last_payment_status || 'sin movimientos'} subtle /></td>
              <td className={`${tableCellClass} text-right`}><button type="button" onClick={() => onOpenCompany(company)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-[#143675] transition hover:border-[#143675]/30 hover:bg-blue-50">Ver cuenta <ChevronRight className="h-3.5 w-3.5" /></button></td>
            </tr>
          ))}
          {!companies.length ? <tr><td colSpan={8}><EmptyRow icon={Building2} text="No hay cuentas que coincidan con los filtros." /></td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function BillingTab({ data, onOpenCompany }: { data: PlatformBilling | null; onOpenCompany: (company: number) => void }) {
  const totals = data?.totals;
  return (
    <div className="space-y-5">
      <PageIntro eyebrow="Facturación" title="Cobros y documentos" description="Stripe conserva la autoridad de pago; aquí consultas el estado operativo sincronizado." />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={CircleDollarSign} label="Total cobrado" value={formatMoney(totals?.paid_cents, totals?.currency)} accent="mint" /><Metric icon={FileClock} label="Saldo abierto" value={formatMoney(totals?.open_cents, totals?.currency)} accent="gold" /><Metric icon={CircleAlert} label="Documentos con atención" value={String(totals?.failed ?? 0)} accent="coral" /><Metric icon={CreditCard} label="Facturas sincronizadas" value={String(totals?.invoices ?? 0)} accent="blue" /></section>
      <Panel title="Historial de facturación" description="Importes cobrados, pendientes y enlaces oficiales de Stripe.">
        <div className="overflow-x-auto"><table className="w-full min-w-[980px]"><thead className="bg-slate-50"><tr><th className={tableHeadClass}>Cliente</th><th className={tableHeadClass}>Factura</th><th className={tableHeadClass}>Estado</th><th className={tableHeadClass}>Importe</th><th className={tableHeadClass}>Pagado</th><th className={tableHeadClass}>Periodo</th><th className={`${tableHeadClass} text-right`}>Documentos</th></tr></thead><tbody className="divide-y divide-slate-100">{(data?.invoices ?? []).map((invoice) => <InvoiceRow key={invoice.invoice_id} invoice={invoice} onOpenCompany={onOpenCompany} />)}{!data?.invoices.length ? <tr><td colSpan={7}><EmptyRow icon={CreditCard} text="Aún no hay facturas sincronizadas en este entorno." /></td></tr> : null}</tbody></table></div>
      </Panel>
    </div>
  );
}

function InvoiceRow({ invoice, onOpenCompany }: { invoice: PlatformInvoice; onOpenCompany: (company: number) => void }) {
  return <tr className="hover:bg-slate-50/80"><td className={tableCellClass}>{invoice.company_id ? <button type="button" onClick={() => onOpenCompany(invoice.company_id!)} className="text-left"><p className="font-medium text-slate-900">{invoice.company_name || `Company #${invoice.company_id}`}</p><p className="mt-0.5 text-xs text-slate-500">{invoice.owner_email || 'Sin correo propietario'}</p></button> : 'Sin asociar'}</td><td className={tableCellClass}><span className="font-mono text-xs text-slate-600">{shortId(invoice.invoice_id)}</span></td><td className={tableCellClass}><StatusBadge status={invoice.status || 'unknown'} /></td><td className={tableCellClass}>{formatMoney(invoice.amount_due_cents, invoice.currency)}</td><td className={tableCellClass}>{formatMoney(invoice.amount_paid_cents, invoice.currency)}</td><td className={tableCellClass}><p>{formatDate(invoice.period_starts_at)}</p><p className="text-xs text-slate-500">a {formatDate(invoice.period_ends_at)}</p></td><td className={`${tableCellClass} text-right`}><div className="inline-flex gap-2">{invoice.hosted_invoice_url ? <a href={invoice.hosted_invoice_url} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200" aria-label="Abrir factura"><ExternalLink className="h-4 w-4" /></a> : null}{invoice.invoice_pdf_url ? <a href={invoice.invoice_pdf_url} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200" aria-label="Descargar PDF"><Download className="h-4 w-4" /></a> : null}</div></td></tr>;
}

function CatalogTab({ data }: { data: PlatformCatalog | null }) {
  const activeVersion = data?.versions.find((version) => version.status === 'ACTIVE') || data?.versions[0];
  const prices = (data?.prices ?? []).filter((price) => !activeVersion || price.catalog_version_id === activeVersion.id);
  const products = (data?.products ?? []).filter((product) => !activeVersion || product.catalog_version_id === activeVersion.id);
  return (
    <div className="space-y-5">
      <PageIntro eyebrow="Catálogo comercial" title="Productos y precios" description="Cada tarifa es versionada para proteger contratos e historial. Esta pantalla es de consulta segura." action={<span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-[#143675]"><ShieldCheck className="h-4 w-4" /> Sólo lectura</span>} />
      <section className="grid gap-3 md:grid-cols-3"><Metric icon={Database} label="Versión activa" value={activeVersion?.version_code || 'Sin versión'} accent="blue" /><Metric icon={PackageCheck} label="Productos activos" value={String(products.filter((product) => product.active).length)} accent="mint" /><Metric icon={CircleDollarSign} label="Precios configurados" value={String(prices.length)} accent="gold" /></section>
      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Productos del catálogo" description="Paquetes base y complementos disponibles en la versión activa."><div className="divide-y divide-slate-100">{products.map((product) => <div key={product.id} className="px-5 py-4"><div className="flex items-center justify-between gap-3"><div><p className="font-medium text-slate-900">{product.display_name}</p><p className="mt-1 font-mono text-xs text-slate-500">{product.product_code}</p></div><StatusBadge status={product.active ? 'active' : 'inactive'} /></div><div className="mt-2 flex flex-wrap gap-1">{product.capabilities.map((capability) => <span key={capability} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{capability}</span>)}</div></div>)}{!products.length ? <EmptyRow icon={PackageCheck} text="No hay productos en esta versión." /> : null}</div></Panel>
        <Panel title="Tarifas vigentes" description="Importes de catálogo antes de impuestos; Stripe Price ID se mantiene enlazado."><div className="overflow-x-auto"><table className="w-full min-w-[720px]"><thead className="bg-slate-50"><tr><th className={tableHeadClass}>Concepto</th><th className={tableHeadClass}>Tipo</th><th className={tableHeadClass}>Periodicidad</th><th className={tableHeadClass}>Importe</th><th className={tableHeadClass}>Stripe</th><th className={tableHeadClass}>Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{prices.map((price) => <PriceRow key={price.id} price={price} />)}</tbody></table></div></Panel>
      </section>
      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-[#143675]">Los cambios futuros deben publicarse como una nueva versión de catálogo. Así, los clientes conservan su tarifa de lealtad y las facturas históricas no cambian.</div>
    </div>
  );
}

function PriceRow({ price }: { price: PlatformCatalogPrice }) {
  return <tr className="hover:bg-slate-50/80"><td className={tableCellClass}><p className="font-medium text-slate-900">{offerLabels[price.billable_code] || price.billable_code}</p><p className="font-mono text-[11px] text-slate-500">{price.billable_code}</p></td><td className={tableCellClass}>{price.price_type}</td><td className={tableCellClass}>{price.billing_interval === 'YEAR' ? 'Anual' : 'Mensual'}</td><td className={`${tableCellClass} font-medium text-slate-900`}>{formatMoney(price.unit_amount_cents, price.currency)}</td><td className={tableCellClass}><span className="font-mono text-[11px] text-slate-500">{price.external_price_id ? shortId(price.external_price_id) : 'Pendiente'}</span></td><td className={tableCellClass}><StatusBadge status={price.status} /></td></tr>;
}

function ModulesTab({ data, canManage, saving, onChange }: { data: PlatformModules | null; canManage: boolean; saving: boolean; onChange: (change: ModuleAvailabilityChange) => void }) {
  const grouped = ['basic', 'complementary', 'ai'].map((category) => ({ category, modules: (data?.modules ?? []).filter((module) => module.category === category) }));
  return (
    <div className="space-y-5">
      <PageIntro eyebrow="Registro de producto" title="Módulos de Índice" description="Disponibilidad global, acceso y etapa de cada módulo. Al desactivar uno deja de mostrarse y de autorizarse para todas las empresas." action={<span className="inline-flex items-center gap-2 rounded-full bg-[#e8f5f2] px-3 py-1.5 text-xs font-medium text-[#177D66]"><Activity className="h-4 w-4" /> {(data?.modules ?? []).filter((module) => module.is_active).length} activos</span>} />
      {!canManage ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Tu autoridad permite consultar el registro, pero no cambiar la disponibilidad global.</div> : null}
      {grouped.map((group) => <ModuleGroup key={group.category} category={group.category} modules={group.modules} canManage={canManage} saving={saving} onChange={onChange} />)}
    </div>
  );
}

function ModuleGroup({ category, modules, canManage, saving, onChange }: { category: string; modules: PlatformModule[]; canManage: boolean; saving: boolean; onChange: (change: ModuleAvailabilityChange) => void }) {
  const labels: Record<string, string> = { basic: 'Módulos básicos', complementary: 'Módulos complementarios', ai: 'Inteligencia artificial' };
  const colors: Record<string, string> = { basic: 'border-[#59C3A5]/40 bg-[#f5fbf9]', complementary: 'border-slate-200 bg-white', ai: 'border-[#F7C845]/50 bg-[#fffdf5]' };
  return <section><div className="mb-3 flex items-end justify-between"><div><h2 className="text-lg font-medium text-slate-900">{labels[category] || category}</h2><p className="mt-1 text-sm text-slate-500">{modules.length} módulo(s) registrados</p></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{modules.map((module) => { const protectedCore = module.is_core; return <article key={module.id} className={`rounded-2xl border p-4 transition ${module.is_active ? colors[category] || colors.complementary : 'border-slate-200 bg-slate-50 opacity-80'}`}><div className="flex items-start justify-between gap-3"><span className={`grid h-11 w-11 place-items-center rounded-xl border border-white bg-white text-xl shadow-sm ${module.is_active ? '' : 'grayscale'}`}>{moduleEmoji(module)}</span><StatusBadge status={module.lifecycle_status} subtle /></div><h3 className="mt-4 font-medium text-slate-900">{module.name}</h3><p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{module.description || 'Descripción operativa pendiente.'}</p><div className="mt-4 flex flex-wrap gap-1.5"><MiniTag>{module.access_model}</MiniTag><MiniTag>{module.assignment_enabled ? 'Asignable' : 'Sin asignación'}</MiniTag>{module.is_core ? <MiniTag>Core estructural</MiniTag> : null}</div><div className="mt-4 flex items-center justify-between border-t border-slate-200/70 pt-3 text-xs"><span className="min-w-0 truncate font-mono text-slate-500">{module.slug}</span><StatusBadge status={module.is_active ? 'active' : 'inactive'} subtle /></div><button type="button" disabled={!canManage || saving || protectedCore} title={protectedCore ? 'Panel Inicial es estructural y no puede desactivarse globalmente.' : undefined} onClick={() => onChange({ module, active: !module.is_active })} className={`mt-3 h-11 w-full rounded-xl border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${protectedCore ? 'border-slate-200 bg-slate-100 text-slate-500' : module.is_active ? 'border-red-200 bg-white text-red-600 hover:bg-red-50' : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'}`}>{protectedCore ? 'Protegido' : module.is_active ? 'Desactivar para todos' : 'Activar para todos'}</button></article>; })}</div></section>;
}

function CourtesyTab({ context, catalog, value, createdCode, saving, onChange, onSubmit, onRevoke }: {
  context: PlatformAdminContext | null;
  catalog: CourtesyCodeCatalog | null;
  value: CourtesyCodePayload;
  createdCode: string;
  saving: boolean;
  onChange: (value: CourtesyCodePayload) => void;
  onSubmit: (event: FormEvent) => void;
  onRevoke: (reference: string) => void;
}) {
  if (!context?.can_manage_benefits) return <PermissionState />;
  return <div className="space-y-5"><PageIntro eyebrow="Cortesías" title="Accesos comerciales controlados" description="Genera códigos auditables que omiten Stripe y define exactamente qué acceso recibe cada cuenta." /><section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]"><Panel title="Nueva cortesía" description="El código claro se muestra una sola vez después de generarlo."><form onSubmit={onSubmit} className="space-y-4 p-5">{createdCode ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-medium text-emerald-800">Código generado. Cópialo ahora.</p><div className="mt-2 flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-white px-3 py-2 text-sm">{createdCode}</code><button type="button" onClick={() => void navigator.clipboard.writeText(createdCode)} className="rounded-xl bg-[#177D66] px-3 text-sm font-medium text-white">Copiar</button></div></div> : null}<div className="grid gap-3 sm:grid-cols-2"><Field label="Nombre interno"><input required value={value.label} onChange={(event) => onChange({ ...value, label: event.target.value })} className={controlClass} placeholder="Cliente piloto agosto" /></Field><Field label="Correo autorizado"><input type="email" value={value.allowed_email || ''} onChange={(event) => onChange({ ...value, allowed_email: event.target.value })} className={controlClass} placeholder="Opcional, recomendado" /></Field></div><fieldset className="rounded-2xl border border-slate-200 p-4"><legend className="px-1 text-sm font-medium text-slate-700">Módulos incluidos</legend><p className="mb-3 text-xs text-slate-500">Sin selección concede todos los módulos básicos.</p><div className="grid gap-2 sm:grid-cols-2">{catalog?.products.map((product) => { const checked = value.product_codes.includes(product.code); return <label key={product.code} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm ${checked ? 'border-[#59C3A5] bg-[#f5fbf9]' : 'border-slate-200'}`}><input type="checkbox" checked={checked} onChange={() => onChange({ ...value, product_codes: checked ? value.product_codes.filter((code) => code !== product.code) : [...value.product_codes, product.code] })} />{product.name}</label>; })}</div></fieldset><div className="grid gap-3 sm:grid-cols-3"><Field label="Usuarios extra"><input min={0} max={500} type="number" value={value.included_extra_seats} onChange={(event) => onChange({ ...value, included_extra_seats: Number(event.target.value) })} className={controlClass} /></Field><Field label="Usos máximos"><input min={1} max={1000} type="number" value={value.max_redemptions} onChange={(event) => onChange({ ...value, max_redemptions: Number(event.target.value) })} className={controlClass} /></Field><Field label="Días de acceso"><input disabled={value.permanent} min={1} max={3650} type="number" value={value.access_days || 30} onChange={(event) => onChange({ ...value, access_days: Number(event.target.value) })} className={controlClass} /></Field></div><label className="flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={value.permanent} onChange={(event) => onChange({ ...value, permanent: event.target.checked })} /> Acceso permanente</label><Field label="Motivo"><textarea required minLength={5} value={value.reason} onChange={(event) => onChange({ ...value, reason: event.target.value })} className={`${controlClass} min-h-20 resize-y py-2`} placeholder="Justificación comercial, soporte o piloto" /></Field><Field label="Campaña"><input value={value.campaign_code || ''} onChange={(event) => onChange({ ...value, campaign_code: event.target.value })} className={controlClass} placeholder="Opcional" /></Field><button disabled={saving} className="h-11 w-full rounded-xl bg-[#177D66] text-sm font-medium text-white disabled:opacity-50">{saving ? 'Generando...' : 'Generar código seguro'}</button></form></Panel><Panel title="Códigos emitidos" description="Vigencia, redenciones y restricción de correo."><div className="max-h-[760px] divide-y divide-slate-100 overflow-y-auto">{catalog?.codes.map((item) => <article key={item.reference} className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-slate-900">{item.label}</p><p className="mt-1 text-xs text-slate-500">{item.allowed_email || 'Sin correo restringido'}</p></div><StatusBadge status={item.status} /></div><p className="mt-3 text-sm text-slate-600">{item.all_basic_products ? 'Todos los módulos básicos' : item.product_codes.join(', ')}</p><div className="mt-2 flex flex-wrap gap-2"><MiniTag>{item.redemption_count}/{item.max_redemptions} usos</MiniTag><MiniTag>{item.permanent ? 'Permanente' : `${item.access_days} días`}</MiniTag><MiniTag>{item.included_extra_seats} usuarios extra</MiniTag></div><p className="mt-3 text-sm text-slate-500">{item.reason}</p>{item.status === 'ACTIVE' ? <button type="button" disabled={saving} onClick={() => onRevoke(item.reference)} className="mt-3 text-xs font-medium text-red-600">Revocar código</button> : null}</article>)}{!catalog?.codes.length ? <EmptyRow icon={KeyRound} text="Aún no hay códigos emitidos." /> : null}</div></Panel></section></div>;
}

function AuditTab({ data }: { data: PlatformAudit | null }) {
  return <div className="space-y-5"><PageIntro eyebrow="Auditoría" title="Trazabilidad de plataforma" description="Eventos comerciales y administrativos con actor, resultado y referencia técnica." /><Panel title="Eventos recientes" description={`${data?.events.length ?? 0} eventos cargados.`}><div className="overflow-x-auto"><table className="w-full min-w-[980px]"><thead className="bg-slate-50"><tr><th className={tableHeadClass}>Fecha</th><th className={tableHeadClass}>Evento</th><th className={tableHeadClass}>Resultado</th><th className={tableHeadClass}>Cliente</th><th className={tableHeadClass}>Actor</th><th className={tableHeadClass}>Referencia</th></tr></thead><tbody className="divide-y divide-slate-100">{(data?.events ?? []).map((event) => <tr key={event.id} className="hover:bg-slate-50/80"><td className={tableCellClass}>{formatDateTime(event.occurred_at)}</td><td className={tableCellClass}><p className="font-medium text-slate-900">{humanize(event.action)}</p><p className="text-xs text-slate-500">{humanize(event.category)}</p></td><td className={tableCellClass}><StatusBadge status={event.outcome} /></td><td className={tableCellClass}>{event.company_name || (event.company_id ? `Company #${event.company_id}` : 'Sistema')}</td><td className={tableCellClass}>{event.actor_email || (event.actor_user_id ? `User #${event.actor_user_id}` : 'Automático')}</td><td className={tableCellClass}><span className="font-mono text-[11px] text-slate-500">{shortId(event.request_id || event.stripe_event_id || event.stripe_object_id || `event-${event.id}`)}</span></td></tr>)}{!data?.events.length ? <tr><td colSpan={6}><EmptyRow icon={ClipboardList} text="Aún no hay eventos de auditoría." /></td></tr> : null}</tbody></table></div></Panel></div>;
}

function CompanyDrawer({ company, context, catalogProducts, benefit, saving, onClose, onBenefit, onSubmitBenefit, onGrantProduct, onRevokeBenefit }: { company: PlatformCompanyDetail; context: PlatformAdminContext | null; catalogProducts: PlatformCatalogProduct[]; benefit: BenefitPayload; saving: boolean; onClose: () => void; onBenefit: (value: BenefitPayload) => void; onSubmitBenefit: (event: FormEvent) => void; onGrantProduct: (productCode: string) => void; onRevokeBenefit: (reference: string) => void }) {
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={`Detalle de ${company.name}`}><section className="flex h-full w-full max-w-3xl flex-col bg-[#f7f9fc] shadow-2xl"><div className="border-b border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e8f5f2] font-medium text-[#177D66]">{initials(company.name)}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-xl font-medium text-slate-900">{company.name}</h2><StatusBadge status={company.billing_status || company.lifecycle_state || 'legacy'} /></div><p className="mt-1 truncate text-sm text-slate-500">{company.owner_email || 'Propietario pendiente'} · Company #{company.id}</p></div></div><button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500" aria-label="Cerrar"><X className="h-5 w-5" /></button></div></div><div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5"><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><SmallMetric label="Plan" value={offerLabels[company.offer_code || ''] || company.offer_code || 'Sin plan'} /><SmallMetric label="Estado de acceso" value={humanize(company.access_mode || company.lifecycle_state || 'legacy')} /><SmallMetric label="Usuarios" value={`${company.seat_usage.active ?? 0} / ${(company.seat_usage.included ?? 0) + (company.seat_usage.purchased_extra ?? 0) + (company.seat_usage.courtesy_extra ?? 0)}`} /><SmallMetric label="Próxima renovación" value={formatDate(company.billing_status === 'trialing' ? company.trial_ends_at : company.current_period_ends_at)} /></section><Panel title="Productos contratados" description="Selección asociada a la suscripción más reciente."><div className="flex flex-wrap gap-2 p-5">{company.products.map((product) => <span key={product.code} className="inline-flex items-center gap-2 rounded-xl border border-[#59C3A5]/40 bg-[#f5fbf9] px-3 py-2 text-sm text-[#177D66]"><PackageCheck className="h-4 w-4" />{product.name}</span>)}{!company.products.length ? <p className="text-sm text-slate-500">Esta cuenta todavía no tiene productos de catálogo asociados.</p> : null}</div></Panel><section className="grid gap-4 lg:grid-cols-2"><Panel title="Usuarios de la cuenta" description={`${company.members.length} membresía(s) registradas.`}><div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">{company.members.map((member) => <div key={member.membership_id} className="flex items-center justify-between gap-3 px-5 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900">{member.name || member.email}</p><p className="truncate text-xs text-slate-500">{member.email}</p></div><div className="text-right"><p className="text-xs font-medium text-slate-700">{humanize(member.role || 'user')}</p><StatusBadge status={member.status || 'active'} subtle /></div></div>)}</div></Panel><Panel title="Facturas recientes" description="Últimos documentos asociados a la compañía."><div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">{company.invoices.map((invoice) => <div key={invoice.invoice_id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="text-sm font-medium text-slate-900">{formatMoney(invoice.amount_due_cents, invoice.currency)}</p><p className="text-xs text-slate-500">{formatDate(invoice.period_ends_at)}</p></div><div className="flex items-center gap-2"><StatusBadge status={invoice.status || 'unknown'} />{invoice.hosted_invoice_url ? <a href={invoice.hosted_invoice_url} target="_blank" rel="noreferrer" aria-label="Abrir factura"><ExternalLink className="h-4 w-4 text-slate-500" /></a> : null}</div></div>)}{!company.invoices.length ? <EmptyRow icon={CreditCard} text="Sin facturas sincronizadas." /> : null}</div></Panel></section>{company.storage_usage?.metered ? <Panel title="Almacenamiento" description="Uso medido y capacidad asignada a la cuenta."><div className="grid grid-cols-3 gap-3 p-5"><SmallMetric label="Usado" value={`${toGigabytes(company.storage_usage.used_bytes + company.storage_usage.reserved_bytes)} GB`} /><SmallMetric label="Límite" value={`${toGigabytes(company.storage_usage.limit_bytes)} GB`} /><SmallMetric label="Bloques extra" value={String(company.storage_usage.purchased_blocks + company.storage_usage.benefit_blocks)} /></div></Panel> : null}{context?.can_manage_benefits ? <Panel title="Otorgar beneficio" description="Separado de la suscripción y registrado en auditoría."><form onSubmit={onSubmitBenefit} className="space-y-3 p-5"><div className="grid gap-3 sm:grid-cols-2"><Field label="Tipo"><select value={benefit.benefit_type} onChange={(event) => onBenefit({ ...benefit, benefit_type: event.target.value as BenefitPayload['benefit_type'] })} className={controlClass}><option value="PRODUCT">Módulo</option><option value="SEAT">Usuarios</option><option value="STORAGE">Almacenamiento</option></select></Field><Field label="Origen"><select value={benefit.source_type} onChange={(event) => onBenefit({ ...benefit, source_type: event.target.value as BenefitPayload['source_type'] })} className={controlClass}><option value="COURTESY">Cortesía</option><option value="PROMOTION">Promoción</option><option value="SUPPORT">Soporte</option><option value="TEST">Prueba</option></select></Field></div>{benefit.benefit_type === 'PRODUCT' ? <Field label="Código de producto"><input required value={benefit.product_code} onChange={(event) => onBenefit({ ...benefit, product_code: event.target.value })} className={controlClass} placeholder="hr, process_tasks..." /></Field> : <Field label="Cantidad"><input required min={1} type="number" value={benefit.quantity} onChange={(event) => onBenefit({ ...benefit, quantity: Number(event.target.value) })} className={controlClass} /></Field>}<Field label="Motivo"><textarea required minLength={5} value={benefit.reason} onChange={(event) => onBenefit({ ...benefit, reason: event.target.value })} className={`${controlClass} min-h-20 resize-y py-2`} /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Campaña"><input value={benefit.campaign_code} onChange={(event) => onBenefit({ ...benefit, campaign_code: event.target.value })} className={controlClass} /></Field><Field label="Vigencia hasta"><input type="datetime-local" value={benefit.ends_at || ''} onChange={(event) => onBenefit({ ...benefit, ends_at: event.target.value })} className={controlClass} /></Field></div><button disabled={saving} className="h-11 w-full rounded-xl bg-[#143675] text-sm font-medium text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Otorgar beneficio'}</button></form></Panel> : null}<Panel title="Historial de beneficios" description="Cortesías, promociones y apoyos activos o revocados."><div className="divide-y divide-slate-100">{company.benefits.map((item) => <article key={item.reference} className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-slate-900">{item.benefit_type === 'PRODUCT' ? item.product_code : `${item.quantity} ${item.benefit_type === 'SEAT' ? 'usuario(s)' : 'bloque(s)'}`}</p><p className="mt-1 text-xs text-slate-500">{humanize(item.source_type)} · {item.campaign_code || 'Sin campaña'}</p></div><StatusBadge status={item.status} /></div><p className="mt-3 text-sm text-slate-600">{item.reason}</p>{item.status === 'ACTIVE' && context?.can_manage_benefits ? <button type="button" disabled={saving} onClick={() => onRevokeBenefit(item.reference)} className="mt-3 text-xs font-medium text-red-600">Revocar beneficio</button> : null}</article>)}{!company.benefits.length ? <EmptyRow icon={Gift} text="Esta cuenta no tiene beneficios." /> : null}</div></Panel></div></section></div>;
}

function ModuleAvailabilityModal({ change, reason, saving, onReason, onCancel, onConfirm }: { change: NonNullable<ModuleAvailabilityChange>; reason: string; saving: boolean; onReason: (value: string) => void; onCancel: () => void; onConfirm: () => void }) {
  const activating = change.active;
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 p-4" role="alertdialog" aria-modal="true" aria-labelledby="module-status-title"><section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl"><span className={`grid h-11 w-11 place-items-center rounded-xl ${activating ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{activating ? <Activity className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}</span><h2 id="module-status-title" className="mt-4 text-lg font-medium text-slate-900">{activating ? 'Activar módulo para todos' : 'Desactivar módulo para todos'}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{activating ? <><strong className="font-medium text-slate-900">{change.module.name}</strong> volverá a aparecer y a autorizarse según el plan y los permisos de cada empresa.</> : <><strong className="font-medium text-slate-900">{change.module.name}</strong> dejará de verse y su acceso será bloqueado inmediatamente para todos los usuarios. Sus datos y asignaciones se conservarán para una futura reactivación.</>}</p><div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${activating ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{activating ? 'El módulo conservará las asignaciones que tenía antes de ser desactivado.' : 'Este cambio es global y afecta también a empresas que ya tienen el módulo contratado o asignado.'}</div><Field label="Motivo de auditoría"><textarea autoFocus value={reason} onChange={(event) => onReason(event.target.value)} className={`${controlClass} mt-4 min-h-24 resize-y py-2`} /></Field><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onCancel} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700">Cancelar</button><button type="button" disabled={saving || reason.trim().length < 3} onClick={onConfirm} className={`h-11 rounded-xl px-4 text-sm font-medium text-white disabled:opacity-50 ${activating ? 'bg-emerald-600' : 'bg-red-600'}`}>{saving ? 'Aplicando...' : activating ? 'Activar globalmente' : 'Desactivar globalmente'}</button></div></section></div>;
}

function ConfirmModal({ reason, saving, onReason, onCancel, onConfirm }: { reason: string; saving: boolean; onReason: (value: string) => void; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 p-4" role="alertdialog" aria-modal="true" aria-labelledby="revoke-title"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl"><span className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600"><CircleAlert className="h-5 w-5" /></span><h2 id="revoke-title" className="mt-4 text-lg font-medium text-slate-900">Confirmar revocación</h2><p className="mt-1 text-sm text-slate-500">La acción quedará registrada en auditoría. Indica el motivo.</p><Field label="Motivo"><textarea autoFocus value={reason} onChange={(event) => onReason(event.target.value)} className={`${controlClass} mt-4 min-h-24 resize-y py-2`} /></Field><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onCancel} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700">Cancelar</button><button type="button" disabled={saving || reason.trim().length < 3} onClick={onConfirm} className="h-10 rounded-xl bg-red-600 px-4 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Revocando...' : 'Revocar'}</button></div></section></div>;
}

function PageIntro({ eyebrow, title, description, action, icon: Icon = LayoutDashboard }: { eyebrow: string; title: string; description: string; action?: ReactNode; icon?: typeof LayoutDashboard }) { return <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-white via-blue-50/60 to-emerald-50/50 p-5 shadow-[0_18px_45px_-38px_rgba(37,99,235,0.65)]"><span className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-[#59C3A5]/10" aria-hidden="true" /><div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-blue-100 bg-white text-[#2563EB] shadow-sm"><Icon className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#177D66]">{eyebrow}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p></div></div>{action}</div></section>; }
function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) { return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_-38px_rgba(15,23,42,0.55)]"><div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4"><div><h3 className="font-medium text-slate-900">{title}</h3>{description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}</div>{action}</div>{children}</section>; }
function Metric({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: string; accent: 'mint' | 'blue' | 'gold' | 'coral' }) { const accents = { mint: 'bg-[#e8f5f2] text-[#177D66]', blue: 'bg-blue-50 text-[#143675]', gold: 'bg-amber-50 text-amber-700', coral: 'bg-red-50 text-[#d84f49]' }; return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_35px_-32px_rgba(15,23,42,0.7)]"><div className="flex items-center gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${accents[accent]}`}><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate text-xs text-slate-500">{label}</p><p className="mt-0.5 truncate text-xl font-medium tracking-tight text-slate-950">{value}</p></div></div></article>; }
function SmallMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-medium text-slate-900">{value}</p></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>; }
function MiniTag({ children }: { children: ReactNode }) { return <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{children}</span>; }
function StatusBadge({ status, subtle = false }: { status: string; subtle?: boolean }) { const normalized = status.toLowerCase(); const positive = ['active', 'paid', 'success', 'trialing', 'released'].includes(normalized); const warning = ['open', 'pending', 'past_due', 'trial', 'draft', 'grace'].includes(normalized); const negative = ['failed', 'unpaid', 'canceled', 'cancelled', 'revoked', 'inactive', 'uncollectible', 'void'].includes(normalized); const tone = positive ? 'bg-emerald-50 text-emerald-700' : warning ? 'bg-amber-50 text-amber-700' : negative ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'; return <span className={`inline-flex max-w-36 items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${tone} ${subtle ? 'bg-opacity-70' : ''}`} title={status}>{statusLabel(status)}</span>; }
function EmptyRow({ icon: Icon, text }: { icon: typeof Users; text: string }) { return <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center text-sm text-slate-500"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-400"><Icon className="h-5 w-5" /></span>{text}</div>; }
function LoadingState() { return <div className="flex min-h-[45vh] items-center justify-center gap-3 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin text-[#177D66]" /> Cargando operación de plataforma...</div>; }
function PermissionState() { return <div className="grid min-h-[45vh] place-items-center"><div className="text-center"><ShieldCheck className="mx-auto h-10 w-10 text-slate-400" /><h2 className="mt-3 text-lg font-medium">Acceso de consulta</h2><p className="mt-1 text-sm text-slate-500">Tu rol no permite administrar beneficios.</p></div></div>; }

function formatMoney(value?: number | null, currency = 'USD') { if (value === null || value === undefined) return '—'; return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(value / 100); }
function formatDate(value?: string | null) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(date); }
function formatDateTime(value?: string | null) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date); }
function statusLabel(value?: string | null) { if (!value) return 'Sin estado'; const labels: Record<string, string> = { active: 'Activa', trialing: 'En prueba', paid: 'Pagada', open: 'Abierta', past_due: 'Pago pendiente', unpaid: 'Sin pagar', canceled: 'Cancelada', cancelled: 'Cancelada', revoked: 'Revocada', success: 'Correcto', failed: 'Fallido', released: 'Publicado', legacy: 'Legacy', inactive: 'Inactivo', unknown: 'Desconocido', 'sin movimientos': 'Sin movimientos' }; return labels[value.toLowerCase()] || humanize(value); }
function humanize(value: string) { return value.replace(/_/g, ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase()); }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'IN'; }
function shortId(value?: string | null) { if (!value) return '—'; return value.length > 22 ? `${value.slice(0, 10)}…${value.slice(-7)}` : value; }
function toGigabytes(bytes: number) { return Number((bytes / (1024 ** 3)).toFixed(1)); }
function moduleEmoji(module: PlatformModule) { if (module.icon && /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(module.icon)) return module.icon; const slug = module.slug.toLowerCase(); if (slug.includes('human') || slug.includes('resource')) return '👥'; if (slug.includes('process') || slug.includes('task')) return '✅'; if (slug.includes('expense')) return '💸'; if (slug.includes('petty') || slug.includes('cash')) return '💰'; if (slug.includes('sale')) return '💼'; if (slug.includes('point') || slug.includes('pos')) return '🛒'; if (slug.includes('inventory')) return '📦'; if (slug.includes('receiv')) return '📒'; if (module.category === 'ai') return '🤖'; return '🧩'; }
function environmentLabel() { const hostname = window.location.hostname; if (hostname === 'localhost' || hostname === '127.0.0.1') return { label: 'Local', className: 'bg-blue-50 text-[#143675]' }; if (hostname.includes('apptest')) return { label: 'Pruebas', className: 'bg-amber-50 text-amber-700' }; return { label: 'Producción', className: 'bg-emerald-50 text-emerald-700' }; }
