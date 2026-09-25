import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Database,
  Download,
  LayoutDashboard,
  Map as MapIcon,
  Network,
  Printer,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import {
  getIndiceFilterControlClassName,
  IndiceFilterBar,
  IndiceFilterField,
  IndiceFilterSelect,
  IndiceTitleBar,
  IndiceWorkspaceNavigation,
} from '../../../components/frontend-os';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import { useLanguage } from '../../../shared/context';
import { AnalyticsDocumentPreviewModal, type AnalyticsDocumentMode } from '../components/AnalyticsDocumentPreviewModal';
import { useCompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import {
  DiagnosisMapView,
  DiagnosisSectorView,
  ExecutiveSourcesView,
  formatFindingValue,
  getFindingCopy,
} from './DiagnosisWorkspaceViews';
import { CompactDiagnosisOverview } from './CompactDiagnosisOverview';
import { CrossKpiWorkspace } from './CrossKpiWorkspace';
import {
  compactDiagnosisTranslations,
  type CompactDiagnosisCopy,
} from './compactDiagnosisTranslations';
import { diagnosisTranslations, type DiagnosisCopy } from './diagnosisTranslations';
import {
  diagnosisWorkspaceTranslations,
  type DiagnosisViewId,
  type DiagnosisWorkspaceCopy,
} from './diagnosisWorkspaceTranslations';
import { executivePanelApi } from './executivePanelApi';
import { ProductPortfolioMatrix } from './ProductPortfolioMatrix';
import { productPortfolioTranslations, type ProductPortfolioCopy } from './productPortfolioTranslations';
import {
  BusinessHealthMatrixView,
  InventoryIntelligenceMatrixView,
  ProductProfitabilityMatrixView,
} from './DecisionMatrixViews';
import { decisionMatrixTranslations, type DecisionMatrixCopy } from './decisionMatrixTranslations';
import type {
  ExecutiveDiagnosisKind,
  ExecutiveDiagnosisSectorId,
  ExecutiveKpiResponse,
  ExecutivePanelFilters,
  ExecutivePanelPeriod,
  ExecutiveUnitRow,
} from './types';

const initialFilters: ExecutivePanelFilters = {
  unitId: '', businessId: '', period: 'monthly', from: '', to: '',
};

const diagnosisViews: DiagnosisViewId[] = ['overview', 'sectors', 'map', 'health', 'portfolio', 'profitability', 'inventory', 'patterns', 'sources'];
const diagnosisSectors: ExecutiveDiagnosisSectorId[] = ['people', 'processes', 'products', 'finance'];
const periods: ExecutivePanelPeriod[] = ['monthly', 'bimonthly', 'quarterly', 'semester', 'annual', 'custom'];

type DiagnosisWorkspaceState = {
  [key: string]: unknown;
  activeView: DiagnosisViewId;
  selectedSectorId: ExecutiveDiagnosisSectorId;
  unitId: string;
  businessId: string;
  period: ExecutivePanelPeriod;
  from: string;
  to: string;
};

const workspaceDefaults: DiagnosisWorkspaceState = {
  activeView: 'overview', selectedSectorId: 'people', unitId: '', businessId: '', period: 'monthly', from: '', to: '',
};

type KPIsProps = { onNavigate?: (page?: string) => void };

export default function KPIs({ onNavigate }: KPIsProps) {
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage.code;
  const copy = diagnosisTranslations[locale] ?? diagnosisTranslations['es-MX'];
  const workspaceCopy = diagnosisWorkspaceTranslations[locale] ?? diagnosisWorkspaceTranslations['es-MX'];
  const compactCopy = compactDiagnosisTranslations[locale] ?? compactDiagnosisTranslations['es-MX'];
  const portfolioCopy = productPortfolioTranslations[locale] ?? productPortfolioTranslations['es-MX'];
  const matrixCopy = decisionMatrixTranslations[locale] ?? decisionMatrixTranslations['es-MX'];
  const { identity: companyPrintIdentity, isReady: isCompanyPrintIdentityReady } = useCompanyPrintIdentity();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const [filters, setFilters] = useState<ExecutivePanelFilters>(initialFilters);
  const [activeView, setActiveView] = useState<DiagnosisViewId>('overview');
  const [selectedSectorId, setSelectedSectorId] = useState<ExecutiveDiagnosisSectorId>('people');
  const [data, setData] = useState<ExecutiveKpiResponse | null>(null);
  const [organizationRows, setOrganizationRows] = useState<ExecutiveUnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentMode, setDocumentMode] = useState<AnalyticsDocumentMode | null>(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    let active = true;
    executivePanelApi.organizationOptions()
      .then((response) => {
        if (active && response.contractVersion === 'organization-options/1.0' && Array.isArray(response.items)) {
          setOrganizationRows(response.items);
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const workspaceState = useMemo<DiagnosisWorkspaceState>(() => ({
    activeView,
    selectedSectorId,
    unitId: filters.unitId,
    businessId: filters.businessId,
    period: filters.period,
    from: filters.from,
    to: filters.to,
  }), [activeView, filters.businessId, filters.from, filters.period, filters.to, filters.unitId, selectedSectorId]);

  useWorkspaceNavigationMemory({
    moduleKey: 'kpis',
    tabKey: 'diagnosis-workspace',
    state: workspaceState,
    defaults: workspaceDefaults,
    urlFields: {
      activeView: 'analysis', selectedSectorId: 'sector', unitId: 'unit', businessId: 'business',
      period: 'period', from: 'from', to: 'to',
    },
    onRestore: (restored) => {
      setActiveView(diagnosisViews.includes(restored.activeView) && restored.activeView !== 'sectors' ? restored.activeView : 'overview');
      setSelectedSectorId(diagnosisSectors.includes(restored.selectedSectorId) ? restored.selectedSectorId : 'people');
      setFilters((current) => ({
        ...current,
        unitId: typeof restored.unitId === 'string' ? restored.unitId : '',
        businessId: typeof restored.businessId === 'string' ? restored.businessId : '',
        period: periods.includes(restored.period) ? restored.period : 'monthly',
        from: typeof restored.from === 'string' ? restored.from : '',
        to: typeof restored.to === 'string' ? restored.to : '',
      }));
    },
  });

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError('');
    try {
      const response = await executivePanelApi.get(filters, preferredCurrency);
      if (!hasExecutiveDecisionContracts(response)) {
        throw new Error('The executive KPI response does not include domains/2.2, diagnosis/1.1, portfolio-bcg/1.0, and decision-matrices/1.0.');
      }
      if (requestSequence.current !== requestId) return;
      setData(response);
      setOrganizationRows((current) => current.length > 0 ? current : response.unitRows);
      setSelectedSectorId((current) => (
        response.diagnosis.sectors.some((sector) => sector.id === current)
          ? current
          : response.diagnosis.prioritySectorId
      ));
    } catch {
      if (requestSequence.current !== requestId) return;
      setData(null);
      setError(copy.error);
    } finally {
      if (requestSequence.current === requestId) setLoading(false);
    }
  }, [copy.error, filters, preferredCurrency]);

  useEffect(() => { void load(); }, [load]);

  const units = useMemo(() => uniqueOptions(organizationRows, 'unitId', 'unitName'), [organizationRows]);
  const businesses = useMemo(() => {
    const source = filters.unitId
      ? organizationRows.filter((row) => String(row.unitId ?? '') === filters.unitId)
      : organizationRows;
    return uniqueOptions(source, 'businessId', 'businessName');
  }, [filters.unitId, organizationRows]);

  useEffect(() => {
    if (organizationRows.length === 0) return;
    const unitIsValid = !filters.unitId || units.some((option) => option.value === filters.unitId);
    const businessIsValid = !filters.businessId || businesses.some((option) => option.value === filters.businessId);
    if (!unitIsValid || !businessIsValid) {
      setFilters((current) => ({
        ...current,
        unitId: unitIsValid ? current.unitId : '',
        businessId: unitIsValid && businessIsValid ? current.businessId : '',
      }));
    }
  }, [businesses, filters.businessId, filters.unitId, organizationRows.length, units]);

  const localizedScopeLabel = filters.businessId
    ? (businesses.find((option) => option.value === filters.businessId)?.label ?? copy.filters.allBusinesses)
    : filters.unitId
      ? (units.find((option) => option.value === filters.unitId)?.label ?? copy.filters.allUnits)
      : copy.filters.allUnits;

  const findingCount = data?.diagnosis.sectors.reduce((sum, sector) => sum + sector.findings.length, 0) ?? 0;
  const resultSummary = `${findingCount} ${workspaceCopy.resultUnits.findings} · ${data?.productPortfolio.eligibleProducts ?? 0} ${workspaceCopy.resultUnits.products}`;
  const hasActiveFilters = filters.unitId !== '' || filters.businessId !== '' || filters.period !== 'monthly' || filters.from !== '' || filters.to !== '';

  const changeFilter = <Key extends keyof ExecutivePanelFilters>(key: Key, value: ExecutivePanelFilters[Key]) => {
    setFilters((current) => {
      if (key === 'unitId') return { ...current, unitId: String(value), businessId: '' };
      if (key === 'period') {
        const period = value as ExecutivePanelPeriod;
        return {
          ...current,
          period,
          from: period === 'custom' ? (current.from || data?.range.from || '') : '',
          to: period === 'custom' ? (current.to || data?.range.to || '') : '',
        };
      }
      return { ...current, [key]: value };
    });
  };

  const resetFilters = () => setFilters(initialFilters);

  const navigationItems = useMemo(() => [
    { id: 'overview' as const, label: compactCopy.navigation.diagnosis, icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'patterns' as const, label: compactCopy.navigation.crossings, icon: <Network className="h-4 w-4" /> },
    { id: 'map' as const, label: compactCopy.navigation.swot, icon: <MapIcon className="h-4 w-4" /> },
    { id: 'sources' as const, label: compactCopy.navigation.sources, icon: <Database className="h-4 w-4" /> },
  ], [compactCopy.navigation]);
  const primaryNavigationValue: DiagnosisViewId = ['patterns', 'map', 'sources'].includes(activeView) ? activeView : 'overview';

  const activeReport = data
    ? buildActivePrintReport(data, activeView, selectedSectorId, copy, workspaceCopy, portfolioCopy, matrixCopy, locale)
    : null;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <IndiceTitleBar
        className="mb-0"
        tone="blue"
        icon="🧩"
        title={copy.title}
        subtitle={compactCopy.subtitle}
        actions={(
          <>
            <Button type="button" variant="outline" disabled={!data || loading} onClick={() => setDocumentMode('export')} className="h-11 rounded-xl border-blue-200 bg-white text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-blue-950/30">
              <Download className="h-4 w-4" />{workspaceCopy.actions.exportView}
            </Button>
            <Button type="button" variant="outline" disabled={!data || loading || !isCompanyPrintIdentityReady} onClick={() => setDocumentMode('print')} className="h-11 rounded-xl border-blue-200 bg-white text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-blue-950/30">
              <Printer className="h-4 w-4" />{workspaceCopy.actions.printView}
            </Button>
            <Button type="button" disabled={loading} onClick={() => void load()} className="h-11 rounded-xl bg-blue-600 text-white hover:bg-blue-700">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />{copy.actions.refresh}
            </Button>
          </>
        )}
      />

      <IndiceWorkspaceNavigation<DiagnosisViewId>
        ariaLabel={compactCopy.navigation.ariaLabel}
        items={navigationItems}
        onValueChange={setActiveView}
        tone="blue"
        value={primaryNavigationValue}
        variant="views"
      />

      <DiagnosisFilters
        businesses={businesses}
        copy={copy}
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        onChange={changeFilter}
        onReset={resetFilters}
        units={units}
        compactCopy={compactCopy}
        resultSummary={resultSummary}
      />

      {error ? (
        <section role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-sm dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span>
          <Button type="button" variant="outline" onClick={() => void load()} className="h-9 rounded-xl border-rose-200 bg-white text-rose-700">{copy.actions.retry}</Button>
        </section>
      ) : null}

      {!error ? (
        <ActiveDiagnosisView
          activeView={activeView}
          compactCopy={compactCopy}
          copy={copy}
          data={data}
          loading={loading}
          locale={locale}
          matrixCopy={matrixCopy}
          onNavigate={onNavigate}
          onSectorSelect={setSelectedSectorId}
          onViewChange={setActiveView}
          portfolioCopy={portfolioCopy}
          selectedSectorId={selectedSectorId}
          workspaceCopy={workspaceCopy}
        />
      ) : null}

      {data && activeReport ? (
        <AnalyticsDocumentPreviewModal
          quotationStyle={activeView !== 'overview' && activeView !== 'sectors'}
          company={companyPrintIdentity}
          fileName={`indice-${activeView}-${data.range.from}-${data.range.to}.html`}
          locale={locale}
          mode={documentMode}
          onClose={() => setDocumentMode(null)}
          onExportData={() => exportDiagnosisViewCsv(data, activeView, selectedSectorId, copy, workspaceCopy, portfolioCopy, matrixCopy, locale)}
          scopeItems={[
            { label: copy.context.period, value: `${data.range.from} / ${data.range.to}` },
            { label: copy.context.scope, value: localizedScopeLabel },
            { label: copy.context.currency, value: data.domains.preferredCurrency },
            { label: copy.context.contract, value: `diagnosis/${data.diagnosis.contractVersion} · portfolio-bcg/${data.productPortfolio.contractVersion}` },
          ]}
          title={activeReport.title}
        >
          <ActiveDiagnosisView
            activeView={activeView}
            compactCopy={compactCopy}
            copy={copy}
            data={data}
            loading={false}
            locale={locale}
            matrixCopy={matrixCopy}
            onSectorSelect={() => undefined}
            onViewChange={() => undefined}
            portfolioCopy={portfolioCopy}
            selectedSectorId={selectedSectorId}
            workspaceCopy={workspaceCopy}
          />
        </AnalyticsDocumentPreviewModal>
      ) : null}
    </div>
  );
}

function DiagnosisFilters({ businesses, compactCopy, copy, filters, hasActiveFilters, onChange, onReset, resultSummary, units }: {
  businesses: Array<{ label: string; value: string }>;
  compactCopy: CompactDiagnosisCopy;
  copy: DiagnosisCopy;
  filters: ExecutivePanelFilters;
  hasActiveFilters: boolean;
  onChange: <Key extends keyof ExecutivePanelFilters>(key: Key, value: ExecutivePanelFilters[Key]) => void;
  onReset: () => void;
  resultSummary: string;
  units: Array<{ label: string; value: string }>;
}) {
  return (
    <IndiceFilterBar
      title={compactCopy.scope}
      className="p-4"
      gridClassName="lg:grid-cols-3"
      summary={(
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span aria-live="polite">{resultSummary}</span>
          <Button type="button" variant="ghost" disabled={!hasActiveFilters} onClick={onReset} className="h-9 rounded-xl px-2 text-slate-600 dark:text-slate-300"><RotateCcw className="h-4 w-4" />{compactCopy.clearFilters}</Button>
        </div>
      )}
    >
      <IndiceFilterSelect label={copy.filters.unit} value={filters.unitId || 'all'} onValueChange={(value) => onChange('unitId', value === 'all' ? '' : value)} options={[{ label: copy.filters.allUnits, value: 'all' }, ...units]} tone="blue" />
      <IndiceFilterSelect label={copy.filters.business} value={filters.businessId || 'all'} onValueChange={(value) => onChange('businessId', value === 'all' ? '' : value)} options={[{ label: copy.filters.allBusinesses, value: 'all' }, ...businesses]} tone="blue" />
      <IndiceFilterSelect label={copy.filters.period} value={filters.period} onValueChange={(value) => onChange('period', value as ExecutivePanelPeriod)} options={periods.map((period) => ({ label: copy.periods[period], value: period }))} tone="blue" />
      {filters.period === 'custom' ? (
        <>
          <DateFilter label={copy.filters.from} value={filters.from} onChange={(value) => onChange('from', value)} />
          <DateFilter label={copy.filters.to} value={filters.to} onChange={(value) => onChange('to', value)} />
        </>
      ) : null}
    </IndiceFilterBar>
  );
}

function DateFilter({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return <IndiceFilterField label={label}><input type="date" value={value} onChange={(event) => onChange(event.target.value)} className={getIndiceFilterControlClassName('blue')} /></IndiceFilterField>;
}

function ActiveDiagnosisView({ activeView, compactCopy, copy, data, loading, locale, matrixCopy, onNavigate, onSectorSelect, onViewChange, portfolioCopy, selectedSectorId, workspaceCopy }: {
  activeView: DiagnosisViewId;
  compactCopy: CompactDiagnosisCopy;
  copy: DiagnosisCopy;
  data: ExecutiveKpiResponse | null;
  loading: boolean;
  locale: string;
  matrixCopy: DecisionMatrixCopy;
  onNavigate?: (page?: string) => void;
  onSectorSelect: (sectorId: ExecutiveDiagnosisSectorId) => void;
  onViewChange: (view: DiagnosisViewId) => void;
  portfolioCopy: ProductPortfolioCopy;
  selectedSectorId: ExecutiveDiagnosisSectorId;
  workspaceCopy: DiagnosisWorkspaceCopy;
}) {
  switch (activeView) {
    case 'sectors':
      return <DiagnosisSectorView copy={copy} data={data} loading={loading} locale={locale} onNavigate={onNavigate} onSectorSelect={onSectorSelect} selectedSectorId={selectedSectorId} workspaceCopy={workspaceCopy} />;
    case 'map':
      return <DiagnosisMapView copy={copy} data={data} loading={loading} locale={locale} onNavigate={onNavigate} workspaceCopy={workspaceCopy} />;
    case 'health':
      return <AdvancedAnalysisShell compactCopy={compactCopy} onBack={() => onViewChange('overview')}><BusinessHealthMatrixView copy={matrixCopy} currency={data?.decisionMatrices.preferredCurrency ?? 'MXN'} data={data?.decisionMatrices.businessHealth ?? null} loading={loading} locale={locale} onOpen={onNavigate ? () => onNavigate('processes-tasks') : undefined} /></AdvancedAnalysisShell>;
    case 'portfolio':
      return <AdvancedAnalysisShell compactCopy={compactCopy} onBack={() => onViewChange('overview')}><div role="tabpanel"><ProductPortfolioMatrix copy={portfolioCopy} portfolio={data?.productPortfolio ?? null} loading={loading} locale={locale} onOpenSales={onNavigate ? () => onNavigate('sales') : undefined} openSalesLabel={workspaceCopy.actions.reviewSales} /></div></AdvancedAnalysisShell>;
    case 'profitability':
      return <AdvancedAnalysisShell compactCopy={compactCopy} onBack={() => onViewChange('overview')}><ProductProfitabilityMatrixView copy={matrixCopy} currency={data?.decisionMatrices.preferredCurrency ?? 'MXN'} data={data?.decisionMatrices.productProfitability ?? null} loading={loading} locale={locale} onOpen={onNavigate ? () => onNavigate('sales') : undefined} stockLabels={portfolioCopy.stock} /></AdvancedAnalysisShell>;
    case 'inventory':
      return <AdvancedAnalysisShell compactCopy={compactCopy} onBack={() => onViewChange('overview')}><InventoryIntelligenceMatrixView copy={matrixCopy} currency={data?.decisionMatrices.preferredCurrency ?? 'MXN'} data={data?.decisionMatrices.inventoryIntelligence ?? null} loading={loading} locale={locale} onOpen={onNavigate ? () => onNavigate('inventory') : undefined} stockLabels={portfolioCopy.stock} /></AdvancedAnalysisShell>;
    case 'patterns':
      return <CrossKpiWorkspace compactCopy={compactCopy} copy={copy} data={data} loading={loading} locale={locale} onNavigate={onNavigate} workspaceCopy={workspaceCopy} />;
    case 'sources':
      return <ExecutiveSourcesView copy={copy} data={data} loading={loading} onNavigate={onNavigate} workspaceCopy={workspaceCopy} />;
    default:
      return <CompactDiagnosisOverview compactCopy={compactCopy} copy={copy} data={data} loading={loading} locale={locale} onNavigate={onNavigate} onSectorSelect={onSectorSelect} onViewChange={onViewChange} workspaceCopy={workspaceCopy} />;
  }
}

function AdvancedAnalysisShell({ children, compactCopy, onBack }: { children: ReactNode; compactCopy: CompactDiagnosisCopy; onBack: () => void }) {
  return (
    <div className="space-y-3">
      <Button type="button" variant="ghost" onClick={onBack} className="h-9 rounded-xl px-2 text-blue-700 dark:text-blue-300">
        <RotateCcw className="h-4 w-4" />{compactCopy.tools.back}
      </Button>
      {children}
    </div>
  );
}

function uniqueOptions(rows: ExecutiveUnitRow[], idKey: 'unitId' | 'businessId', labelKey: 'unitName' | 'businessName') {
  const options = new Map<string, string>();
  rows.forEach((row) => { const id = row[idKey]; const label = row[labelKey]; if (id != null && label) options.set(String(id), label); });
  return [...options].map(([value, label]) => ({ value, label }));
}

function hasExecutiveDecisionContracts(response: ExecutiveKpiResponse) {
  const domains = (response as Partial<ExecutiveKpiResponse>).domains;
  const diagnosis = (response as Partial<ExecutiveKpiResponse>).diagnosis;
  const productPortfolio = (response as Partial<ExecutiveKpiResponse>).productPortfolio;
  const decisionMatrices = (response as Partial<ExecutiveKpiResponse>).decisionMatrices;
  return Boolean(
    domains
    && domains.contractVersion === '2.2'
    && Array.isArray(domains.items)
    && domains.items.every((domain) => domain
      && typeof domain.ownerModule === 'string'
      && typeof domain.sourceContract === 'string'
      && typeof domain.actionRoute === 'string'
      && Array.isArray(domain.metrics))
    && ['processTasks', 'expenses', 'pettyCash', 'receivables', 'inventory', 'sales', 'pointOfSale']
      .every((domainId) => domains.items.some((domain) => domain.id === domainId))
    && diagnosis
    && diagnosis.contractVersion === '1.1'
    && typeof diagnosis.coveragePercent === 'number'
    && Array.isArray(diagnosis.sectors)
    && Array.isArray(diagnosis.crossSectorFindings)
    && diagnosis.sectors.every((sector) => sector && typeof sector.id === 'string' && (typeof sector.score === 'number' || sector.score === null) && Array.isArray(sector.findings))
    && productPortfolio
    && productPortfolio.contractVersion === '1.0'
    && productPortfolio.methodology
    && productPortfolio.methodology.externalMarketDataIncluded === false
    && Array.isArray(productPortfolio.quadrants)
    && Array.isArray(productPortfolio.items)
    && productPortfolio.dataQuality
    && typeof productPortfolio.dataQuality.decisionReady === 'boolean'
    && productPortfolio.items.every((item) => item && typeof item.productId === 'number' && typeof item.productName === 'string' && typeof item.quadrant === 'string' && typeof item.currentRevenue === 'number' && (typeof item.growthPercent === 'number' || item.growthPercent === null))
    && decisionMatrices
    && decisionMatrices.contractVersion === '1.0'
    && Array.isArray(decisionMatrices.businessHealth?.items)
    && Array.isArray(decisionMatrices.productProfitability?.items)
    && Array.isArray(decisionMatrices.inventoryIntelligence?.items)
    && typeof decisionMatrices.businessHealth?.dataQuality?.decisionReady === 'boolean'
    && typeof decisionMatrices.productProfitability?.dataQuality?.decisionReady === 'boolean'
    && typeof decisionMatrices.inventoryIntelligence?.dataQuality?.decisionReady === 'boolean',
  );
}

function buildActivePrintReport(
  data: ExecutiveKpiResponse,
  activeView: DiagnosisViewId,
  selectedSectorId: ExecutiveDiagnosisSectorId,
  copy: DiagnosisCopy,
  workspaceCopy: DiagnosisWorkspaceCopy,
  portfolioCopy: ProductPortfolioCopy,
  matrixCopy: DecisionMatrixCopy,
  locale: string,
) {
  const title = workspaceCopy.navigation.items[activeView];
  if (activeView === 'sources') {
    return {
      title,
      subtitle: data.domains.dataQuality.note,
      metrics: [
        { label: copy.source, value: String(data.domains.items.length) },
        { label: workspaceCopy.context.ready, value: String(data.domains.items.filter((domain) => domain.dataQuality.decisionReady).length) },
        { label: workspaceCopy.context.dataQuality, value: data.domains.dataQuality.decisionReady ? workspaceCopy.context.ready : workspaceCopy.context.review },
      ],
      tables: [{
        title,
        emptyLabel: copy.unavailable,
        headers: [copy.source, copy.context.contract, workspaceCopy.context.ready, workspaceCopy.context.dataQuality],
        rows: data.domains.items.map((domain) => [
          workspaceCopy.modules[domain.ownerModule] ?? domain.label,
          domain.sourceContract,
          `${domain.metrics.filter((metric) => metric.available).length} / ${domain.metrics.length}`,
          domain.dataQuality.issues.join(' | ') || workspaceCopy.context.ready,
        ]),
      }],
    };
  }
  if (activeView === 'health') {
    const matrix = data.decisionMatrices.businessHealth;
    return {
      title: matrixCopy.health.title,
      subtitle: matrixCopy.health.subtitle,
      metrics: [
        { label: matrixCopy.common.ready, value: String(matrix.items.filter((item) => item.decisionReady).length) },
        { label: matrixCopy.health.quadrants.engine.title, value: String(matrix.items.filter((item) => item.quadrant === 'engine').length) },
        { label: matrixCopy.health.quadrants.priority_intervention.title, value: String(matrix.items.filter((item) => item.quadrant === 'priority_intervention').length) },
      ],
      tables: [{
        title: matrixCopy.health.title,
        emptyLabel: matrixCopy.health.noData,
        headers: [matrixCopy.common.unit, matrixCopy.common.business, matrixCopy.health.metrics.margin, matrixCopy.health.metrics.execution, matrixCopy.common.reading, matrixCopy.common.recommendation],
        rows: matrix.items.map((item) => [item.unitName, item.businessName, `${item.operatingMarginPercent}%`, `${item.executionScore}%`, matrixCopy.health.quadrants[item.quadrant].title, matrixCopy.health.quadrants[item.quadrant].action]),
      }],
    };
  }

  if (activeView === 'profitability') {
    const matrix = data.decisionMatrices.productProfitability;
    return {
      title: matrixCopy.profitability.title,
      subtitle: matrixCopy.profitability.subtitle,
      metrics: [
        { label: matrixCopy.common.ready, value: String(matrix.items.filter((item) => item.decisionReady).length) },
        { label: matrixCopy.profitability.quadrants.winner.title, value: String(matrix.items.filter((item) => item.quadrant === 'winner').length) },
        { label: matrixCopy.common.unclassified, value: String(matrix.items.filter((item) => !item.decisionReady).length) },
      ],
      tables: [{
        title: matrixCopy.profitability.title,
        emptyLabel: matrixCopy.profitability.noData,
        headers: [portfolioCopy.columns.product, matrixCopy.profitability.metrics.revenue, matrixCopy.profitability.metrics.margin, matrixCopy.profitability.metrics.velocity, matrixCopy.common.reading, matrixCopy.common.recommendation],
        rows: matrix.items.map((item) => [item.productName, formatPortfolioMoney(item.revenue, data.decisionMatrices.preferredCurrency, locale), item.contributionMarginPercent === null ? matrixCopy.common.unclassified : `${item.contributionMarginPercent}%`, String(item.salesVelocityPerDay), matrixCopy.profitability.quadrants[item.quadrant].title, matrixCopy.profitability.quadrants[item.quadrant].action]),
      }],
    };
  }

  if (activeView === 'inventory') {
    const matrix = data.decisionMatrices.inventoryIntelligence;
    return {
      title: matrixCopy.inventory.title,
      subtitle: matrixCopy.inventory.subtitle,
      metrics: [
        { label: matrixCopy.common.ready, value: String(matrix.items.filter((item) => item.decisionReady).length) },
        { label: matrixCopy.inventory.quadrants.stockout_risk.title, value: String(matrix.items.filter((item) => item.quadrant === 'stockout_risk').length) },
        { label: matrixCopy.inventory.quadrants.overstock.title, value: String(matrix.items.filter((item) => item.quadrant === 'overstock').length) },
      ],
      tables: [{
        title: matrixCopy.inventory.title,
        emptyLabel: matrixCopy.inventory.noData,
        headers: [portfolioCopy.columns.product, matrixCopy.inventory.metrics.velocity, matrixCopy.inventory.metrics.available, matrixCopy.inventory.metrics.coverage, matrixCopy.common.reading, matrixCopy.common.recommendation],
        rows: matrix.items.map((item) => [item.productName, String(item.salesVelocityPerDay), item.availableQuantity === null ? matrixCopy.common.unclassified : String(item.availableQuantity), item.stockCoverageDays === null ? matrixCopy.common.unclassified : String(item.stockCoverageDays), matrixCopy.inventory.quadrants[item.quadrant].title, matrixCopy.inventory.quadrants[item.quadrant].action]),
      }],
    };
  }

  if (activeView === 'portfolio') {
    return {
      title: portfolioCopy.reportTitle,
      subtitle: portfolioCopy.subtitle,
      metrics: [
        { label: portfolioCopy.summary.revenue, value: formatPortfolioMoney(data.productPortfolio.totalRevenue, data.productPortfolio.preferredCurrency, locale) },
        { label: portfolioCopy.summary.eligible, value: String(data.productPortfolio.eligibleProducts) },
        { label: portfolioCopy.summary.classified, value: `${data.productPortfolio.classifiedProducts} / ${data.productPortfolio.eligibleProducts}` },
        { label: portfolioCopy.summary.comparison, value: `${data.productPortfolio.comparisonRange.from} / ${data.productPortfolio.comparisonRange.to}` },
      ],
      tables: [{
        title: portfolioCopy.reportTitle,
        emptyLabel: portfolioCopy.noProducts,
        headers: [portfolioCopy.columns.product, portfolioCopy.columns.quadrant, portfolioCopy.metrics.currentRevenue, portfolioCopy.metrics.growth, portfolioCopy.columns.action],
        rows: data.productPortfolio.items.map((item) => [
          item.productName,
          portfolioCopy.quadrants[item.quadrant].title,
          formatPortfolioMoney(item.currentRevenue, data.productPortfolio.preferredCurrency, locale),
          item.growthPercent === null ? portfolioCopy.unavailable : `${item.growthPercent}%`,
          portfolioCopy.quadrants[item.quadrant].action,
        ]),
      }],
    };
  }

  if (activeView === 'sectors') {
    const sector = data.diagnosis.sectors.find((item) => item.id === selectedSectorId) ?? data.diagnosis.sectors[0];
    return {
      title: `${workspaceCopy.sectors.title} · ${sector ? copy.sectors[sector.id] : ''}`,
      subtitle: workspaceCopy.sectors.subtitle,
      metrics: sector ? [
        { label: workspaceCopy.summary.sectors, value: sector.score === null ? copy.overview.noScore : `${Math.round(sector.score)} / 100`, detail: maturityLabel(sector.score, workspaceCopy) },
        { label: copy.overview.coverage, value: `${sector.coveragePercent}%` },
        { label: workspaceCopy.summary.readiness, value: sector.decisionReady ? copy.overview.ready : copy.overview.review },
        { label: workspaceCopy.resultUnits.findings, value: String(sector.findings.length) },
      ] : [],
      tables: sector ? [findingTable(sector.findings, copy.sectors[sector.id], data, copy, locale)] : [],
    };
  }

  if (activeView === 'map') {
    const findings = data.diagnosis.sectors.flatMap((sector) => sector.findings);
    const kinds: ExecutiveDiagnosisKind[] = ['strength', 'symptom', 'opportunity', 'data_gap'];
    return {
      title: copy.mapTitle,
      subtitle: copy.mapSubtitle,
      metrics: kinds.map((kind) => ({ label: copy.kinds[kind], value: String(findings.filter((finding) => finding.kind === kind).length) })),
      tables: [findingTable(findings, copy.mapTitle, data, copy, locale)],
    };
  }

  if (activeView === 'patterns') {
    return {
      title: copy.crossTitle,
      subtitle: copy.crossSubtitle,
      metrics: [
        { label: workspaceCopy.resultUnits.findings, value: String(data.diagnosis.crossSectorFindings.length) },
        { label: copy.statuses.critical, value: String(data.diagnosis.crossSectorFindings.filter((item) => item.severity === 'critical').length) },
        { label: copy.statuses.watch, value: String(data.diagnosis.crossSectorFindings.filter((item) => item.severity === 'watch').length) },
      ],
      tables: [{
        title: copy.crossTitle,
        emptyLabel: copy.noFindings,
        headers: [copy.crossTitle, copy.sectorsTitle, copy.recommendedAction],
        rows: data.diagnosis.crossSectorFindings.map((finding) => {
          const itemCopy = copy.cross[finding.code] ?? { title: finding.code, action: copy.overview.review };
          return [itemCopy.title, finding.sectorIds.map((sector) => copy.sectors[sector]).join(' · '), itemCopy.action];
        }),
      }],
    };
  }

  return {
    title: `${copy.reportTitle} · ${title}`,
    subtitle: workspaceCopy.summary.subtitle,
    metrics: [
      { label: copy.overview.score, value: data.diagnosis.score === null ? copy.overview.noScore : `${Math.round(data.diagnosis.score)} / 100`, detail: maturityLabel(data.diagnosis.score, workspaceCopy) },
      { label: copy.overview.coverage, value: `${data.diagnosis.coveragePercent}%` },
      { label: copy.overview.priority, value: copy.sectors[data.diagnosis.prioritySectorId] },
      { label: workspaceCopy.summary.readiness, value: data.diagnosis.decisionReady ? copy.overview.ready : copy.overview.review },
      ...data.diagnosis.sectors.map((sector) => ({
        label: copy.sectors[sector.id],
        value: sector.score === null ? copy.overview.noScore : `${Math.round(sector.score)} / 100`,
        detail: `${maturityLabel(sector.score, workspaceCopy)} · ${copy.overview.coverage} ${sector.coveragePercent}%`,
      })),
    ],
    tables: [],
  };
}

function findingTable(findings: ExecutiveKpiResponse['diagnosis']['sectors'][number]['findings'], title: string, data: ExecutiveKpiResponse, copy: DiagnosisCopy, locale: string) {
  return {
    title,
    emptyLabel: copy.noFindings,
    headers: [copy.evidence, copy.current, copy.recommendedAction],
    rows: findings.map((finding) => [
      getFindingCopy(copy, finding.code).title,
      formatFindingValue(finding, data.domains.preferredCurrency, locale, copy),
      getFindingCopy(copy, finding.code).action,
    ]),
  };
}

function exportDiagnosisViewCsv(data: ExecutiveKpiResponse, activeView: DiagnosisViewId, selectedSectorId: ExecutiveDiagnosisSectorId, copy: DiagnosisCopy, workspaceCopy: DiagnosisWorkspaceCopy, portfolioCopy: ProductPortfolioCopy, matrixCopy: DecisionMatrixCopy, locale: string) {
  let rows: string[][];
  if (activeView === 'sources') {
    rows = [
      ['domain_id', 'owner_module', 'source_contract', 'action_route', 'status', 'available_metrics', 'total_metrics', 'invalid_records', 'issues'],
      ...data.domains.items.map((domain) => [
        domain.id, domain.ownerModule, domain.sourceContract, domain.actionRoute, domain.status,
        String(domain.metrics.filter((metric) => metric.available).length), String(domain.metrics.length),
        String(domain.dataQuality.invalidRecords), domain.dataQuality.issues.join(' | '),
      ]),
    ];
  } else if (activeView === 'health') {
    rows = [
      ['unit', 'business', 'revenue', 'operating_profit', 'operating_margin_percent', 'execution_score', 'task_completion_rate', 'attendance_rate', 'overdue_tasks', 'overdue_receivables', 'quadrant', 'decision_ready', 'recommended_action'],
      ...data.decisionMatrices.businessHealth.items.map((item) => [
        item.unitName, item.businessName, String(item.revenue), String(item.operatingProfit), String(item.operatingMarginPercent), String(item.executionScore), String(item.taskCompletionRate), String(item.attendanceRate), String(item.overdueTasks), String(item.overdueReceivables), matrixCopy.health.quadrants[item.quadrant].title, String(item.decisionReady), matrixCopy.health.quadrants[item.quadrant].action,
      ]),
    ];
  } else if (activeView === 'profitability') {
    rows = [
      ['product', 'sku', 'category', 'revenue', 'cost', 'contribution_margin', 'contribution_margin_percent', 'units_sold', 'sales_velocity_per_day', 'available_quantity', 'quadrant', 'decision_ready', 'recommended_action'],
      ...data.decisionMatrices.productProfitability.items.map((item) => [
        item.productName, item.sku, item.category, String(item.revenue), item.cost === null ? '' : String(item.cost), item.contributionMargin === null ? '' : String(item.contributionMargin), item.contributionMarginPercent === null ? '' : String(item.contributionMarginPercent), String(item.unitsSold), String(item.salesVelocityPerDay), item.availableQuantity === null ? '' : String(item.availableQuantity), matrixCopy.profitability.quadrants[item.quadrant].title, String(item.decisionReady), matrixCopy.profitability.quadrants[item.quadrant].action,
      ]),
    ];
  } else if (activeView === 'inventory') {
    rows = [
      ['product', 'sku', 'category', 'revenue', 'units_sold', 'sales_velocity_per_day', 'available_quantity', 'minimum_quantity', 'stock_coverage_days', 'stock_status', 'quadrant', 'decision_ready', 'recommended_action'],
      ...data.decisionMatrices.inventoryIntelligence.items.map((item) => [
        item.productName, item.sku, item.category, String(item.revenue), String(item.unitsSold), String(item.salesVelocityPerDay), item.availableQuantity === null ? '' : String(item.availableQuantity), item.minimumQuantity === null ? '' : String(item.minimumQuantity), item.stockCoverageDays === null ? '' : String(item.stockCoverageDays), item.stockStatus, matrixCopy.inventory.quadrants[item.quadrant].title, String(item.decisionReady), matrixCopy.inventory.quadrants[item.quadrant].action,
      ]),
    ];
  } else if (activeView === 'portfolio') {
    rows = [
      ['product', 'sku', 'category', 'quadrant', 'current_revenue', 'previous_revenue', 'growth_percent', 'relative_category_share_percent', 'portfolio_share_percent', 'stock_status', 'recommended_action'],
      ...data.productPortfolio.items.map((item) => [
        item.productName, item.sku, item.category, portfolioCopy.quadrants[item.quadrant].title,
        String(item.currentRevenue), String(item.previousRevenue), item.growthPercent === null ? portfolioCopy.unavailable : String(item.growthPercent),
        String(item.relativeCategorySharePercent), String(item.portfolioSharePercent), portfolioCopy.stock[item.stockStatus], portfolioCopy.quadrants[item.quadrant].action,
      ]),
    ];
  } else if (activeView === 'patterns') {
    rows = [
      ['pattern_code', 'status', 'sectors', 'recommended_action', 'owner_module'],
      ...data.diagnosis.crossSectorFindings.map((finding) => [
        finding.code, copy.statuses[finding.severity], finding.sectorIds.map((sector) => copy.sectors[sector]).join(' | '),
        copy.cross[finding.code]?.action ?? copy.overview.review, finding.ownerModule,
      ]),
    ];
  } else if (activeView === 'overview') {
    rows = [
      ['metric', 'value', 'maturity_level', 'status', 'coverage_percent'],
      ['overall_score', data.diagnosis.score === null ? copy.overview.noScore : String(data.diagnosis.score), maturityLabel(data.diagnosis.score, workspaceCopy), copy.statuses[data.diagnosis.status], String(data.diagnosis.coveragePercent)],
      ...data.diagnosis.sectors.map((sector) => [copy.sectors[sector.id], sector.score === null ? copy.overview.noScore : String(sector.score), maturityLabel(sector.score, workspaceCopy), copy.statuses[sector.status], String(sector.coveragePercent)]),
    ];
  } else {
    const sectors = activeView === 'sectors'
      ? data.diagnosis.sectors.filter((sector) => sector.id === selectedSectorId)
      : data.diagnosis.sectors;
    rows = [
      ['sector', 'finding_code', 'kind', 'status', 'value', 'unit', 'coverage_percent', 'recommended_action', 'owner_module'],
      ...sectors.flatMap((sector) => sector.findings.map((finding) => [
        copy.sectors[sector.id], finding.code, copy.kinds[finding.kind], copy.statuses[finding.severity],
        finding.value === null ? copy.unavailable : String(finding.value), finding.unit, String(sector.coveragePercent),
        getFindingCopy(copy, finding.code).action, finding.ownerModule,
      ])),
    ];
  }
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `indice-${activeView}-${data.range.from}-${data.range.to}-${locale}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatPortfolioMoney(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

function maturityLabel(score: number | null, copy: DiagnosisWorkspaceCopy) {
  if (score === null) return copy.maturity.noScore;
  const index = Math.min(copy.maturity.stages.length - 1, Math.floor(Math.max(0, Math.min(100, score)) / 20));
  return copy.maturity.stages[index] ?? copy.maturity.noScore;
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
