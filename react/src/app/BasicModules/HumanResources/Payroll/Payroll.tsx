import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  CreditCard,
  Download,
  Globe2,
  Info,
  Landmark,
  LoaderCircle,
  MapPinned,
  PlayCircle,
  Printer,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../components/SuccessToast';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  DialogClose,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { ApiClientError, buildApiUrl } from '../../../lib/apiClient';
import { useLocalStorageState } from '../../../hooks/useLocalStorageState';
import { dashboardApi, type BackendBusiness, type BackendUnit } from '../../../api/dashboard';
import {
  humanResourcesApi,
  type PayrollColombiaConfig,
  type PayrollColombiaEmployeeProfile,
  type PayrollColombiaNovelty,
  type PayrollColombiaNoveltyCode,
  type PayrollLineItem,
  type PayrollGovernmentReportingSnapshot,
  type PayrollGovernmentReportingSnapshotsResponse,
  type PayrollManualItemPayload,
  type PayrollOverviewResponse,
  type PayrollPreferences,
  type PayrollRunDetailResponse,
  type PayrollRunLine,
  type PayrollRunSummary,
} from '../../../api/humanResources';
import { useLanguage } from '../../../shared/context';
import {
  convertBusinessCurrencyAmount,
  createBusinessDailyExchangeRateSettings,
  defaultBusinessCurrency,
  formatBusinessCurrencyAmount,
  hrExchangeRateSettingsStorageKey,
  hrPreferredCurrencyStorageKey,
  isBusinessCurrencyCode,
  normalizeBusinessCurrencyCode,
  normalizeBusinessExchangeRateSettings,
  type BusinessExchangeRatesPerUsd,
} from '../../shared/businessCurrency';
import { usePayrollTranslations } from './hooks/usePayrollTranslations';
import type { PayrollTranslations } from './translations';
import {
  PayrollRunPrintPortal,
} from './PayrollRunPrintPortal';
import type { PayrollRunPdfDocumentProps } from './PayrollRunPdfDocument';
import { SelectField, DateField } from './components/PayrollFormFields';
import { DetailMetric } from './components/DetailMetric';
import { PayrollHeaderBar } from './components/PayrollHeaderBar';
import { PayrollOperationsPanel } from './components/PayrollOperationsPanel';
import { PayrollRunActionsMenu } from './components/PayrollRunActionsMenu';
import { PayrollSetupGuide } from './components/PayrollSetupGuide';
import {
  filterPayrollItemsByJurisdiction,
  groupPayrollEntitiesByJurisdiction,
  resolveJurisdictionProvinceLabel,
  resolveRunJurisdiction,
} from './utils/payrollGrouping';

const PAYROLL_PRINT_REPORT_ID_PREFIX = 'IDX-PR';
const payrollRateFieldKeys = [
  'isr_rate',
  'imss_user_rate',
  'infonavit_user_rate',
  'imss_employer_rate',
  'infonavit_employer_rate',
  'sar_employer_rate',
] as const;
const payrollRateProfileKeys = [
  'mexico',
  'canada',
  'usa',
  'colombia',
  'brazil',
  'custom',
] as const;

type PayrollRateFieldKey = (typeof payrollRateFieldKeys)[number];
type PayrollRateProfileKey = (typeof payrollRateProfileKeys)[number];
type PayrollRateEditorMode = 'preset' | 'advanced';
type PayrollRateValues = Pick<PayrollPreferences, PayrollRateFieldKey>;
type PayrollRateDrafts = Record<PayrollRateProfileKey, PayrollRateValues>;

type PayrollCopy = PayrollTranslations;

const pickPayrollRateValues = (preferences: PayrollPreferences): PayrollRateValues => ({
  isr_rate: preferences.isr_rate,
  imss_user_rate: preferences.imss_user_rate,
  infonavit_user_rate: preferences.infonavit_user_rate,
  imss_employer_rate: preferences.imss_employer_rate,
  infonavit_employer_rate: preferences.infonavit_employer_rate,
  sar_employer_rate: preferences.sar_employer_rate,
});

const applyPayrollRateValues = (
  preferences: PayrollPreferences,
  rates: PayrollRateValues,
): PayrollPreferences => ({
  ...preferences,
  ...rates,
});

const createPayrollRateDrafts = (preferences: PayrollPreferences): PayrollRateDrafts => {
  const baseRates = pickPayrollRateValues(preferences);

  return payrollRateProfileKeys.reduce((drafts, profileKey) => ({
    ...drafts,
    [profileKey]: { ...baseRates },
  }), {} as PayrollRateDrafts);
};

const formatRateInputPercent = (value: number) => {
  const percent = value * 100;
  if (Number.isInteger(percent)) {
    return String(percent);
  }

  return percent.toFixed(2).replace(/\.?0+$/, '');
};

const parseRateInputPercent = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.max(0, parsed / 100);
};

const defaultPayrollPreferences: PayrollPreferences = {
  grouping_mode: 'single',
  default_daily_hours: 8,
  pay_leave_days: true,
  weekly_start_day: 1,
  biweekly_first_day: 1,
  biweekly_second_day: 16,
  monthly_start_day: 1,
  isr_rate: 0.1,
  imss_user_rate: 0.04,
  infonavit_user_rate: 0.03,
  imss_employer_rate: 0.07,
  infonavit_employer_rate: 0.05,
  sar_employer_rate: 0.02,
};

const normalizePayrollPreferences = (preferences: PayrollPreferences): PayrollPreferences => ({
  ...defaultPayrollPreferences,
  ...preferences,
  weekly_start_day: preferences.weekly_start_day ?? defaultPayrollPreferences.weekly_start_day,
  biweekly_first_day: preferences.biweekly_first_day ?? defaultPayrollPreferences.biweekly_first_day,
  biweekly_second_day: preferences.biweekly_second_day ?? defaultPayrollPreferences.biweekly_second_day,
  monthly_start_day: preferences.monthly_start_day ?? defaultPayrollPreferences.monthly_start_day,
});

const payrollRateProfileFlags: Record<PayrollRateProfileKey, string> = {
  mexico: '🇲🇽',
  canada: '🇨🇦',
  usa: '🇺🇸',
  colombia: '🇨🇴',
  brazil: '🇧🇷',
  custom: '⚙️',
};

const formatCurrency = (value: number, locale: string, currency = 'USD') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const resolvePayrollCurrencyCode = (jurisdictionLabel: string) => {
  const normalizedLabel = jurisdictionLabel.toLowerCase();

  if (normalizedLabel.includes('mexico') || normalizedLabel.includes('méxico')) {
    return 'MXN';
  }
  if (
    normalizedLabel.includes('canada')
    || normalizedLabel.includes('ontario')
    || normalizedLabel.includes('quebec')
    || normalizedLabel.includes('québec')
  ) {
    return 'CAD';
  }
  if (
    normalizedLabel.includes('usa')
    || normalizedLabel.includes('united states')
    || normalizedLabel.includes('florida')
    || normalizedLabel.includes('texas')
  ) {
    return 'USD';
  }
  if (normalizedLabel.includes('colombia')) {
    return 'COP';
  }
  if (normalizedLabel.includes('brazil') || normalizedLabel.includes('brasil')) {
    return 'BRL';
  }

  return 'USD';
};

const getRunNativeTotals = (
  run: PayrollRunSummary,
  fallbackJurisdictionLabel = '',
) => {
  const apiTotals = run.native_totals_by_currency ?? {};
  const normalizedApiTotals = Object.entries(apiTotals)
    .map(([currencyCode, amount]) => [
      normalizeBusinessCurrencyCode(currencyCode, defaultBusinessCurrency),
      Number(amount),
    ] as const)
    .filter(([, amount]) => Number.isFinite(amount));

  if (normalizedApiTotals.length > 0) {
    return normalizedApiTotals;
  }

  const fallbackCurrency = normalizeBusinessCurrencyCode(
    run.currency_code || resolvePayrollCurrencyCode(fallbackJurisdictionLabel),
    defaultBusinessCurrency,
  );
  return [[fallbackCurrency, Number(run.net_amount) || 0] as const];
};

const getRunPreferredNetAmount = (
  run: PayrollRunSummary,
  preferredCurrency: string,
  exchangeRatesPerUsd: BusinessExchangeRatesPerUsd,
  fallbackJurisdictionLabel = '',
) => getRunNativeTotals(run, fallbackJurisdictionLabel).reduce(
  (total, [currencyCode, amount]) => total + convertBusinessCurrencyAmount(
    amount,
    currencyCode,
    preferredCurrency,
    exchangeRatesPerUsd,
  ),
  0,
);

const formatRunNativeBreakdown = (
  run: PayrollRunSummary,
  fallbackJurisdictionLabel = '',
) => getRunNativeTotals(run, fallbackJurisdictionLabel)
  .map(([currencyCode, amount]) => formatBusinessCurrencyAmount(amount, currencyCode, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }))
  .join(' / ');

const getPayrollLineItemDisplayLabel = (item: PayrollLineItem, copy: PayrollCopy) => {
  const labelByCode: Record<string, string> = {
    BASE_DAILY: copy.labels.periodSalary,
    BASE_HOURLY: copy.labels.regularHours,
    OVERTIME: copy.labels.overtime,
    LEAVE_PAY: copy.labels.paidLeaveAmount,
    ABSENCE_DEDUCTION: copy.labels.unpaidAttendanceDeduction,
  };

  return labelByCode[item.code] || item.label || item.code;
};

const getPayrollLineItemSourceLabel = (item: PayrollLineItem, copy: PayrollCopy) => {
  switch (item.source_type) {
    case 'manual':
      return copy.labels.sourceManual;
    case 'computed_tax':
      return copy.labels.sourceTax;
    case 'incentive':
      return copy.labels.sourceIncentive;
    case 'adjustment':
      return copy.labels.sourceAdjustment;
    case 'computed':
    default:
      return copy.labels.sourceComputed;
  }
};

const getPayrollLineItemSourceClassName = (item: PayrollLineItem) => {
  switch (item.source_type) {
    case 'manual':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200';
    case 'computed_tax':
      return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200';
    case 'incentive':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200';
    case 'adjustment':
      return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200';
    case 'computed':
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
};

const formatDate = (value: string, locale: string, fallback: string) => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

const toErrorMessage = (error: unknown, copy: PayrollCopy) => {
  if (error instanceof ApiClientError) {
    if (error.status === 404) {
      return copy.notFound;
    }
    if (error.status === 401) {
      return copy.unauthorized;
    }
    return error.message || copy.genericError;
  }
  return error instanceof Error ? error.message : copy.genericError;
};

type PayrollBusyKind =
  | 'refresh'
  | 'open-run'
  | 'save-preferences'
  | 'save-line'
  | 'process-run'
  | 'approve-run'
  | 'mark-paid'
  | 'cancel-run'
  | 'government-reporting'
  | 'download-csv'
  | 'download-pdf'
  | 'colombia-setup';

type PayrollBusyState = {
  kind: PayrollBusyKind;
  title: string;
  description: string;
};

type PayrollDialogNotice = {
  tone: 'success' | 'error';
  message: string;
};

type PayrollColombiaSetupContext = {
  run: PayrollRunSummary;
  line: PayrollRunLine;
};

type PayrollColombiaNoveltyForm = {
  novelty_code: PayrollColombiaNoveltyCode;
  novelty_label: string;
  start_date: string;
  end_date: string;
  days: number;
  hours: number;
  paid: boolean;
  affects_ibc: boolean;
  ibc_impact_amount: number;
};

const createPayrollPrintReportId = (runId: number) => (
  `${PAYROLL_PRINT_REPORT_ID_PREFIX}-${String(runId).padStart(4, '0')}`
);

const downloadFile = async (path: string, filename: string) => {
  const response = await fetch(buildApiUrl(path), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiClientError(response.statusText || 'Request failed', response.status);
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(objectUrl);
};

export default function Payroll() {
  const { currentLanguage } = useLanguage();
  const copy = usePayrollTranslations();
  const [storedPreferredCurrency, setStoredPreferredCurrency] = useLocalStorageState<string>(
    hrPreferredCurrencyStorageKey,
    defaultBusinessCurrency,
  );
  const [storedExchangeRateSettings, setStoredExchangeRateSettings] = useLocalStorageState<unknown>(
    hrExchangeRateSettingsStorageKey,
    createBusinessDailyExchangeRateSettings(),
  );
  const preferredCurrency = isBusinessCurrencyCode(storedPreferredCurrency)
    ? storedPreferredCurrency
    : defaultBusinessCurrency;
  const exchangeRateSettings = useMemo(
    () => normalizeBusinessExchangeRateSettings(storedExchangeRateSettings),
    [storedExchangeRateSettings],
  );
  const { metadata: exchangeRateMetadata, ratesPerUsd: exchangeRatesPerUsd } = exchangeRateSettings;

  const [overview, setOverview] = useState<PayrollOverviewResponse | null>(null);
  const [runs, setRuns] = useState<PayrollRunSummary[]>([]);
  const [jurisdictionsByRunId, setJurisdictionsByRunId] = useState<Record<number, string>>({});
  const [units, setUnits] = useState<BackendUnit[]>([]);
  const [businesses, setBusinesses] = useState<BackendBusiness[]>([]);
  const [selectedRunDetail, setSelectedRunDetail] = useState<PayrollRunDetailResponse | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [governmentReportingDetail, setGovernmentReportingDetail] = useState<PayrollGovernmentReportingSnapshotsResponse | null>(null);
  const [colombiaSetupContext, setColombiaSetupContext] = useState<PayrollColombiaSetupContext | null>(null);
  const [colombiaConfigForm, setColombiaConfigForm] = useState<Partial<PayrollColombiaConfig>>({});
  const [colombiaProfileForm, setColombiaProfileForm] = useState<Partial<PayrollColombiaEmployeeProfile>>({});
  const [colombiaNovelties, setColombiaNovelties] = useState<PayrollColombiaNovelty[]>([]);
  const [colombiaNoveltyForm, setColombiaNoveltyForm] = useState<PayrollColombiaNoveltyForm>({
    novelty_code: 'VSP' as PayrollColombiaNoveltyCode,
    novelty_label: '',
    start_date: '',
    end_date: '',
    days: 0,
    hours: 0,
    paid: false,
    affects_ibc: true,
    ibc_impact_amount: 0,
  });
  const [colombiaSetupNotice, setColombiaSetupNotice] = useState<PayrollDialogNotice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyState, setBusyState] = useState<PayrollBusyState | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isPreferencesDialogOpen, setIsPreferencesDialogOpen] = useState(false);
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [isGovernmentReportingDialogOpen, setIsGovernmentReportingDialogOpen] = useState(false);
  const [isColombiaSetupDialogOpen, setIsColombiaSetupDialogOpen] = useState(false);
  const [printJob, setPrintJob] = useState<PayrollRunPdfDocumentProps | null>(null);
  const [runDialogNotice, setRunDialogNotice] = useState<PayrollDialogNotice | null>(null);
  const [preferencesForm, setPreferencesForm] = useState<PayrollPreferences>(defaultPayrollPreferences);
  const [filters, setFilters] = useState({
    period_range: 'all_year',
    period_from: '',
    period_to: '',
    pay_period: '',
    grouping_mode: '',
    unit_id: '',
    business_id: '',
    status: '',
  });
  const [sortConfig, setSortConfig] = useState<{
    column: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [lineDraft, setLineDraft] = useState<{
    include_in_fiscal: boolean;
    notes: string;
    manual_items: PayrollManualItemPayload[];
  }>({
    include_in_fiscal: true,
    notes: '',
    manual_items: [],
  });

  const isSaving = busyState !== null;
  const activeBusyKind = busyState?.kind ?? null;
  const unitsById = useMemo(
    () => new Map(units.map((unit) => [String(unit.id), unit.name])),
    [units],
  );
  const businessesById = useMemo(
    () => new Map(businesses.map((business) => [String(business.id), business])),
    [businesses],
  );

  const sortedRuns = useMemo(() => {
    if (!sortConfig) {
      return runs;
    }

    const sortedArray = [...runs];
    sortedArray.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortConfig.column) {
        case 'period':
          aValue = new Date(a.period_start_date);
          bValue = new Date(b.period_start_date);
          break;
        case 'frequency':
          aValue = a.pay_period;
          bValue = b.pay_period;
          break;
        case 'payrollType':
          aValue = a.grouping_mode;
          bValue = b.grouping_mode;
          break;
        case 'employees':
          aValue = a.users_count;
          bValue = b.users_count;
          break;
        case 'totalAmount':
          aValue = a.net_amount;
          bValue = b.net_amount;
          break;
        case 'jurisdiction': {
          const aJurisdiction = jurisdictionsByRunId[a.id]?.trim() || (a.grouping_mode === 'single' ? 'Automatic' : 'No jurisdiction');
          const bJurisdiction = jurisdictionsByRunId[b.id]?.trim() || (b.grouping_mode === 'single' ? 'Automatic' : 'No jurisdiction');
          aValue = aJurisdiction;
          bValue = bJurisdiction;
          break;
        }
        case 'unit': {
          let aUnitLabel = '';
          let bUnitLabel = '';

          if (a.grouping_mode === 'unit') {
            aUnitLabel = a.grouping_label || '';
          } else if (a.grouping_mode === 'business' && a.grouping_key && businessesById.has(a.grouping_key)) {
            const matchedBusiness = businessesById.get(a.grouping_key);
            aUnitLabel = matchedBusiness?.unitId ? String(unitsById.get(String(matchedBusiness.unitId)) || '') : '';
          }

          if (b.grouping_mode === 'unit') {
            bUnitLabel = b.grouping_label || '';
          } else if (b.grouping_mode === 'business' && b.grouping_key && businessesById.has(b.grouping_key)) {
            const matchedBusiness = businessesById.get(b.grouping_key);
            bUnitLabel = matchedBusiness?.unitId ? String(unitsById.get(String(matchedBusiness.unitId)) || '') : '';
          }

          aValue = aUnitLabel;
          bValue = bUnitLabel;
          break;
        }
        case 'business': {
          let aBusinessLabel = '';
          let bBusinessLabel = '';

          if (a.grouping_mode === 'business') {
            aBusinessLabel = a.grouping_label || '';
          }

          if (b.grouping_mode === 'business') {
            bBusinessLabel = b.grouping_label || '';
          }

          aValue = aBusinessLabel;
          bValue = bBusinessLabel;
          break;
        }
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sortedArray;
  }, [runs, sortConfig, jurisdictionsByRunId, unitsById, businessesById]);

  const handleSortColumn = (column: string) => {
    setSortConfig((prevConfig) => {
      if (prevConfig?.column === column) {
        // Toggle direction if same column
        return {
          column,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      // Set new column with ascending direction
      return { column, direction: 'asc' };
    });
  };

  const SortIndicator = ({ column }: { column: string }) => {
    if (sortConfig?.column !== column) {
      return <span className="ml-1 text-slate-400 dark:text-slate-500">↑↓</span>;
    }
    return sortConfig.direction === 'asc' ? (
      <span className="ml-1 text-slate-600 dark:text-slate-300">↑</span>
    ) : (
      <span className="ml-1 text-slate-600 dark:text-slate-300">↓</span>
    );
  };

  const handleStatusChange = (run: PayrollRunSummary, newStatus: PayrollRunSummary['status']) => {
    if (run.status === newStatus) return;

    setRuns((currentRuns) => currentRuns.map((r) =>
      r.id === run.id ? { ...r, status: newStatus } : r
    ));
  };

  const loadPayroll = async (
    activeFilters = filters,
    options: { background?: boolean } = {},
  ) => {
    if (!options.background) {
      setIsLoading(true);
    }
    setErrorMessage('');

    try {
      const [overviewResponse, runsResponse, unitsResponse, businessesResponse] = await Promise.all([
        humanResourcesApi.getPayrollOverview(),
        humanResourcesApi.listPayrollRuns(activeFilters),
        dashboardApi.listUnits().catch(() => []),
        dashboardApi.listBusinesses().catch(() => []),
      ]);

      setOverview(overviewResponse);
      setPreferencesForm(normalizePayrollPreferences(overviewResponse.preferences));
      setRuns(runsResponse.items);
      setJurisdictionsByRunId({});
      setUnits(unitsResponse);
      setBusinesses(businessesResponse);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    } finally {
      if (!options.background) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadPayroll();
  }, []);

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => setSuccessMessage(''), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const selectedLine = useMemo(
    () => selectedRunDetail?.lines.find((line) => line.id === selectedLineId) ?? null,
    [selectedLineId, selectedRunDetail?.lines],
  );

  useEffect(() => {
    if (!selectedLine) {
      return;
    }
    setLineDraft({
      include_in_fiscal: selectedLine.include_in_fiscal,
      notes: selectedLine.notes || '',
      manual_items: selectedLine.items
        .filter((item) => item.source_type === 'manual')
        .map((item) => ({
          category: item.category,
          label: item.label,
          amount: item.amount,
        })),
    });
  }, [selectedLine]);

  const runBusyTask = async <T,>(
    nextBusyState: PayrollBusyState,
    task: () => Promise<T>,
    minimumDurationMs = 900,
  ) => {
    setBusyState(nextBusyState);
    setErrorMessage('');

    try {
      return await runWithMinimumDuration(task(), minimumDurationMs);
    } finally {
      setBusyState(null);
    }
  };

  const buildPrintJob = (detail: PayrollRunDetailResponse): PayrollRunPdfDocumentProps => ({
    detail,
    preferences: overview?.preferences ?? preferencesForm,
    title: `${copy.title} ${detail.run.grouping_label || copy.groupingModes[detail.run.grouping_mode]}`,
    subtitle: `${copy.labels.payPeriod}: ${formatDate(detail.run.period_start_date, currentLanguage.code, detail.run.period_start_date)} → ${formatDate(detail.run.period_end_date, currentLanguage.code, detail.run.period_end_date)}`,
    generatedAt: new Date(),
    reportId: createPayrollPrintReportId(detail.run.id),
    locale: currentLanguage.code,
    statusLabel: copy.statuses[detail.run.status],
    groupingLabel: detail.run.grouping_label || copy.groupingModes[detail.run.grouping_mode],
    payPeriodLabel: copy.frequencies[detail.run.pay_period],
    copy: copy.pdf,
  });

  const fetchRunDetail = async (runId: number) => {
    const detail = await humanResourcesApi.getPayrollRun(runId);
    setSelectedRunDetail(detail);
    setSelectedLineId((current) => (
      current && detail.lines.some((line) => line.id === current)
        ? current
        : detail.lines[0]?.id ?? null
    ));
    return detail;
  };

  const openRunDetail = async (runId: number) => {
    try {
      setRunDialogNotice(null);
      await runBusyTask({
        kind: 'open-run',
        title: copy.busy.openRunTitle,
        description: copy.busy.openRunDescription,
      }, async () => {
        await fetchRunDetail(runId);
        setIsRunDialogOpen(true);
      }, 700);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const openGovernmentReporting = async (runId: number) => {
    try {
      await runBusyTask({
        kind: 'government-reporting',
        title: 'Consultando PILA / DIAN',
        description: 'Leyendo snapshots gubernamentales auditables de la corrida.',
      }, async () => {
        const reportingDetail = await humanResourcesApi.listPayrollGovernmentReportingSnapshots(runId);
        setGovernmentReportingDetail(reportingDetail);
        setIsGovernmentReportingDialogOpen(true);
      }, 500);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const loadColombiaSetup = async (run: PayrollRunSummary, line: PayrollRunLine) => {
    const [config, profile, novelties] = await Promise.all([
      humanResourcesApi.getPayrollColombiaConfig(),
      humanResourcesApi.getPayrollColombiaEmployeeProfile(line.user_company_id),
      humanResourcesApi.listPayrollColombiaNovelties({
        user_company_id: line.user_company_id,
        period_from: run.period_start_date,
        period_to: run.period_end_date,
        status: 'all',
      }),
    ]);
    setColombiaSetupContext({ run, line });
    setColombiaConfigForm(config);
    setColombiaProfileForm(profile);
    setColombiaNovelties(novelties.items);
    setColombiaNoveltyForm({
      novelty_code: 'VSP',
      novelty_label: '',
      start_date: run.period_start_date,
      end_date: run.period_end_date,
      days: 0,
      hours: 0,
      paid: false,
      affects_ibc: true,
      ibc_impact_amount: 0,
    });
  };

  const openColombiaSetup = async (run: PayrollRunSummary, line: PayrollRunLine) => {
    try {
      setColombiaSetupNotice(null);
      await runBusyTask({
        kind: 'colombia-setup',
        title: 'Cargando Colombia',
        description: 'Leyendo configuración, perfil fiscal y novedades del colaborador.',
      }, async () => {
        await loadColombiaSetup(run, line);
        setIsColombiaSetupDialogOpen(true);
      }, 500);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const handleSaveColombiaSetup = async () => {
    if (!colombiaSetupContext) {
      return;
    }
    try {
      await runBusyTask({
        kind: 'colombia-setup',
        title: 'Guardando Colombia',
        description: 'Actualizando configuración y perfil fiscal Colombia.',
      }, async () => {
        const [config, profile] = await Promise.all([
          humanResourcesApi.updatePayrollColombiaConfig(colombiaConfigForm),
          humanResourcesApi.updatePayrollColombiaEmployeeProfile(
            colombiaSetupContext.line.user_company_id,
            colombiaProfileForm,
          ),
        ]);
        setColombiaConfigForm(config);
        setColombiaProfileForm(profile);
        setColombiaSetupNotice({
          tone: 'success',
          message: 'Configuración Colombia guardada. Sincroniza la corrida para aplicar cambios al cálculo.',
        });
      }, 500);
    } catch (error) {
      setColombiaSetupNotice({ tone: 'error', message: toErrorMessage(error, copy) });
    }
  };

  const handleCreateColombiaNovelty = async () => {
    if (!colombiaSetupContext) {
      return;
    }
    try {
      await runBusyTask({
        kind: 'colombia-setup',
        title: 'Guardando novedad',
        description: 'Registrando novedad Colombia para el colaborador.',
      }, async () => {
        await humanResourcesApi.createPayrollColombiaNovelty({
          user_company_id: colombiaSetupContext.line.user_company_id,
          novelty_code: colombiaNoveltyForm.novelty_code,
          novelty_label: colombiaNoveltyForm.novelty_label || undefined,
          start_date: colombiaNoveltyForm.start_date,
          end_date: colombiaNoveltyForm.end_date || null,
          days: colombiaNoveltyForm.days,
          hours: colombiaNoveltyForm.hours,
          paid: colombiaNoveltyForm.paid,
          affects_ibc: colombiaNoveltyForm.affects_ibc,
          ibc_impact_amount: colombiaNoveltyForm.ibc_impact_amount,
          source: 'manual',
          status: 'active',
        });
        const novelties = await humanResourcesApi.listPayrollColombiaNovelties({
          user_company_id: colombiaSetupContext.line.user_company_id,
          period_from: colombiaSetupContext.run.period_start_date,
          period_to: colombiaSetupContext.run.period_end_date,
          status: 'all',
        });
        setColombiaNovelties(novelties.items);
        setColombiaSetupNotice({
          tone: 'success',
          message: 'Novedad Colombia guardada. Sincroniza la corrida para recalcular esta línea.',
        });
      }, 500);
    } catch (error) {
      setColombiaSetupNotice({ tone: 'error', message: toErrorMessage(error, copy) });
    }
  };

  const refreshOpenRun = async (runId: number) => {
    await fetchRunDetail(runId);
  };

  const handleSavePreferences = async () => {
    try {
      await runBusyTask({
        kind: 'save-preferences',
        title: copy.busy.preferencesTitle,
        description: copy.busy.preferencesDescription,
      }, async () => {
        await humanResourcesApi.updatePayrollPreferences(preferencesForm);
        setIsPreferencesDialogOpen(false);
        setSuccessMessage(copy.success.preferences);
        await loadPayroll(filters, { background: true });
      });
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const handleSaveLine = async () => {
    if (!selectedRunDetail || !selectedLine) {
      return;
    }

    try {
      setRunDialogNotice(null);
      await runBusyTask({
        kind: 'save-line',
        title: copy.busy.saveLineTitle,
        description: copy.busy.saveLineDescription,
      }, async () => {
        await humanResourcesApi.updatePayrollRunLine(selectedRunDetail.run.id, selectedLine.id, lineDraft);
        setIsRunDialogOpen(false);
        setSelectedRunDetail(null);
        setSelectedLineId(null);
        setRunDialogNotice(null);
        setSuccessMessage(copy.success.lineSaved);
        await loadPayroll(filters, { background: true });
      });
    } catch (error) {
      setRunDialogNotice({
        tone: 'error',
        message: toErrorMessage(error, copy),
      });
    }
  };

  const handleRunAction = async (action: 'process' | 'approve' | 'pay' | 'cancel') => {
    if (!selectedRunDetail) {
      return;
    }

    try {
      const busyConfig = action === 'process'
        ? { kind: 'process-run' as const, title: copy.busy.processTitle, description: copy.busy.processDescription }
        : action === 'approve'
          ? { kind: 'approve-run' as const, title: copy.busy.approveTitle, description: copy.busy.approveDescription }
          : action === 'pay'
            ? { kind: 'mark-paid' as const, title: copy.busy.payTitle, description: copy.busy.payDescription }
            : { kind: 'cancel-run' as const, title: copy.busy.cancelTitle, description: copy.busy.cancelDescription };

      await runBusyTask(busyConfig, async () => {
        switch (action) {
          case 'process':
            await humanResourcesApi.processPayrollRun(selectedRunDetail.run.id);
            setSuccessMessage(copy.success.processed);
            break;
          case 'approve':
            await humanResourcesApi.approvePayrollRun(selectedRunDetail.run.id);
            setSuccessMessage(copy.success.approved);
            break;
          case 'pay':
            await humanResourcesApi.markPayrollRunPaid(selectedRunDetail.run.id);
            setSuccessMessage(copy.success.paid);
            break;
          case 'cancel':
            await humanResourcesApi.cancelPayrollRun(selectedRunDetail.run.id);
            setSuccessMessage(copy.success.cancelled);
            break;
        }

        await refreshOpenRun(selectedRunDetail.run.id);
        await loadPayroll(filters, { background: true });
      });
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  useEffect(() => {
    void loadPayroll(filters, { background: true });
  }, [filters]);

  const handleDownload = async (kind: 'csv' | 'pdf', run: PayrollRunSummary) => {
    try {
      if (kind === 'csv') {
        await runBusyTask({
          kind: 'download-csv',
          title: copy.busy.csvTitle,
          description: copy.busy.csvDescription,
        }, async () => {
          await downloadFile(
            `/api/v1/hr/payroll/runs/${run.id}/export.csv`,
            `payroll-run-${run.id}.csv`,
          );
        }, 650);
        return;
      }

      await runBusyTask({
        kind: 'download-pdf',
        title: copy.busy.pdfTitle,
        description: copy.busy.pdfDescription,
      }, async () => {
        const detail = selectedRunDetail?.run.id === run.id
          ? selectedRunDetail
          : await humanResourcesApi.getPayrollRun(run.id);

        setPrintJob(buildPrintJob(detail));
      }, 650);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const handleProcessRunFromTable = async (run: PayrollRunSummary) => {
    try {
      await runBusyTask({
        kind: 'process-run',
        title: copy.busy.processTitle,
        description: copy.busy.processDescription,
      }, async () => {
        await humanResourcesApi.processPayrollRun(run.id);
        setSuccessMessage(copy.success.processed);
        await loadPayroll(filters, { background: true });
        if (selectedRunDetail?.run.id === run.id) {
          await refreshOpenRun(run.id);
        }
      });
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const handlePayRunFromTable = async (run: PayrollRunSummary) => {
    try {
      await runBusyTask({
        kind: 'mark-paid',
        title: copy.busy.payTitle,
        description: copy.busy.payDescription,
      }, async () => {
        await humanResourcesApi.markPayrollRunPaid(run.id);
        setSuccessMessage(copy.success.paid);
        await loadPayroll(filters, { background: true });
        if (selectedRunDetail?.run.id === run.id) {
          await refreshOpenRun(run.id);
        }
      });
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const handleApproveRunFromTable = async (run: PayrollRunSummary) => {
    try {
      await runBusyTask({
        kind: 'approve-run',
        title: copy.busy.approveTitle,
        description: copy.busy.approveDescription,
      }, async () => {
        await humanResourcesApi.approvePayrollRun(run.id);
        setSuccessMessage(copy.success.approved);
        await loadPayroll(filters, { background: true });
        if (selectedRunDetail?.run.id === run.id) {
          await refreshOpenRun(run.id);
        }
      });
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const handleCancelRunFromTable = async (run: PayrollRunSummary) => {
    try {
      await runBusyTask({
        kind: 'cancel-run',
        title: copy.busy.cancelTitle,
        description: copy.busy.cancelDescription,
      }, async () => {
        await humanResourcesApi.cancelPayrollRun(run.id);
        setSuccessMessage(copy.success.cancelled);
        await loadPayroll(filters, { background: true });
        if (selectedRunDetail?.run.id === run.id) {
          await refreshOpenRun(run.id);
        }
      });
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const resolveRunBusiness = (run: PayrollRunSummary) => {
    if (run.grouping_mode !== 'business') {
      return null;
    }

    if (run.grouping_key && businessesById.has(run.grouping_key)) {
      return businessesById.get(run.grouping_key) ?? null;
    }

    return businesses.find((business) => business.name === run.grouping_label) ?? null;
  };

  const resolveRunUnitLabel = (run: PayrollRunSummary) => {
    if (run.grouping_mode === 'unit') {
      return run.grouping_label || copy.labels.noUnit;
    }

    if (run.grouping_mode === 'business') {
      const matchedBusiness = resolveRunBusiness(run);
      return matchedBusiness?.unitId ? unitsById.get(String(matchedBusiness.unitId)) || copy.labels.noUnit : copy.labels.noUnit;
    }

    return copy.labels.allUnits;
  };

  const resolveRunBusinessLabel = (run: PayrollRunSummary) => {
    if (run.grouping_mode === 'business') {
      return run.grouping_label || copy.labels.noBusiness;
    }

    if (run.grouping_mode === 'unit') {
      return copy.labels.multipleBusinesses;
    }

    return copy.labels.allBusinesses;
  };

  const resolveRunJurisdictionLabel = (run: PayrollRunSummary) => {
    const apiJurisdictionLabel = run.jurisdiction_label?.trim();
    if (apiJurisdictionLabel) {
      return apiJurisdictionLabel;
    }

    const customJurisdiction = jurisdictionsByRunId[run.id]?.trim();
    if (customJurisdiction) {
      return customJurisdiction;
    }

    return run.grouping_mode === 'single'
      ? copy.labels.automatic
      : copy.labels.noJurisdiction;
  };

  const operationalRuns = runs.map((run) => ({
    ...run,
    jurisdictionLabel: resolveRunJurisdictionLabel(run),
    unitLabel: resolveRunUnitLabel(run),
    businessLabel: resolveRunBusinessLabel(run),
    preferredNetAmount: getRunPreferredNetAmount(
      run,
      preferredCurrency,
      exchangeRatesPerUsd,
      resolveRunJurisdictionLabel(run),
    ),
    nativeBreakdownLabel: formatRunNativeBreakdown(run, resolveRunJurisdictionLabel(run)),
  }));
  const shouldShowSetupGuide = !overview?.preferences && runs.length === 0;
  const resolveOperationalStatus = (run: PayrollRunSummary) => {
    if (run.users_count === 0 && run.status !== 'paid' && run.status !== 'cancelled') {
      return {
        label: copy.operationalStatus.blocked,
        className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300',
      };
    }

    const statusClassNames: Record<PayrollRunSummary['status'], string> = {
      draft: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300',
      processed: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300',
      approved: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300',
      paid: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300',
      cancelled: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
    };

    return {
      label: run.status === 'processed' ? copy.operationalStatus.review : copy.statuses[run.status],
      className: statusClassNames[run.status],
    };
  };

  return (
    <>
      <LoadingBarOverlay
        isVisible={Boolean(busyState)}
        title={busyState?.title ?? copy.loading}
        description={busyState?.description}
      />

      {errorMessage ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
          <div className="flex items-center justify-between gap-3">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" onClick={() => void loadPayroll(filters, { background: true })}>
              {copy.retry}
            </Button>
          </div>
        </div>
      ) : null}

      <SuccessToast
        isVisible={Boolean(successMessage)}
        message={successMessage}
        onClose={() => setSuccessMessage('')}
      />

      <PayrollHeaderBar
        copy={copy.header}
        exchangeRateCopy={copy.exchangeRates}
        exchangeRateMetadata={exchangeRateMetadata}
        exchangeRatesPerUsd={exchangeRatesPerUsd}
        isBusy={isSaving}
        onExchangeRateSettingsChange={setStoredExchangeRateSettings}
        onOpenPreferences={() => setIsPreferencesDialogOpen(true)}
        preferredCurrency={preferredCurrency}
        preferredCurrencyLabel={copy.labels.preferredCurrency}
        onPreferredCurrencyChange={setStoredPreferredCurrency}
      />

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[560px] rounded-lg" />
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5">
              <h3 className="text-base font-bold text-slate-950 dark:text-white">{copy.filterBar.title}</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <SelectField
                label={copy.labels.period}
                value={filters.period_range}
                onChange={(value) => setFilters({ ...filters, period_range: value })}
                options={[
                  { value: 'this_month', label: copy.labels.periodThisMonth },
                  { value: 'last_month', label: copy.labels.periodLastMonth },
                  { value: 'two_months_ago', label: copy.labels.periodTwoMonthsAgo },
                  { value: 'all_year', label: copy.labels.periodAllYear },
                  { value: 'custom', label: copy.labels.periodCustom },
                ]}
              />
              {filters.period_range === 'custom' && (
                <>
                  <DateField
                    label={copy.labels.periodFrom}
                    value={filters.period_from}
                    onChange={(value) => setFilters({ ...filters, period_from: value })}
                  />
                  <DateField
                    label={copy.labels.periodTo}
                    value={filters.period_to}
                    onChange={(value) => setFilters({ ...filters, period_to: value })}
                  />
                </>
              )}
              <SelectField
                label={copy.labels.frequency}
                value={filters.pay_period}
                onChange={(value) => setFilters({ ...filters, pay_period: value })}
                options={[
                  { value: '', label: copy.labels.all },
                  { value: 'weekly', label: copy.frequencies.weekly },
                  { value: 'biweekly', label: copy.frequencies.biweekly },
                  { value: 'semimonthly', label: copy.frequencies.semimonthly },
                  { value: 'monthly', label: copy.frequencies.monthly },
                ]}
              />
              <SelectField
                label={copy.labels.payrollType}
                value={filters.grouping_mode}
                onChange={(value) => setFilters({ ...filters, grouping_mode: value })}
                options={[
                  { value: '', label: copy.labels.all },
                  { value: 'single', label: copy.groupingModes.single },
                  { value: 'unit', label: copy.groupingModes.unit },
                  { value: 'business', label: copy.groupingModes.business },
                ]}
              />
              <SelectField
                label={copy.labels.unit}
                value={filters.unit_id}
                onChange={(value) => setFilters({ ...filters, unit_id: value })}
                options={[
                  { value: '', label: copy.labels.all },
                  ...units.map((unit) => ({ value: String(unit.id), label: unit.name })),
                ]}
              />
              <SelectField
                label={copy.labels.business}
                value={filters.business_id}
                onChange={(value) => setFilters({ ...filters, business_id: value })}
                options={[
                  { value: '', label: copy.labels.all },
                  ...businesses.map((business) => ({ value: String(business.id), label: business.name })),
                ]}
              />
              <SelectField
                label={copy.labels.status}
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
                options={[
                  { value: '', label: copy.labels.all },
                  { value: 'draft', label: copy.statuses.draft },
                  { value: 'processed', label: copy.statuses.processed },
                  { value: 'approved', label: copy.statuses.approved },
                  { value: 'paid', label: copy.statuses.paid },
                  { value: 'cancelled', label: copy.statuses.cancelled },
                ]}
              />
            </div>
          </section>

          {shouldShowSetupGuide ? (
            <PayrollSetupGuide
              copy={copy.setupGuide}
              isBusy={isSaving}
              onOpenPreferences={() => setIsPreferencesDialogOpen(true)}
            />
          ) : (
            <PayrollOperationsPanel
              copy={copy}
              runs={operationalRuns}
              formatMoney={(value) => formatBusinessCurrencyAmount(value, preferredCurrency, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            />
          )}

          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{copy.runLedger.title}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.runLedger.subtitle}</p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {runs.length} {copy.runLedger.currentViewSuffix}
                </div>
              </div>
            </div>

            <Table className="min-w-[1280px]">
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60">
                  <TableHead
                    onClick={() => handleSortColumn('period')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.period}
                    <SortIndicator column="period" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('frequency')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.frequency}
                    <SortIndicator column="frequency" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('payrollType')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.payrollType}
                    <SortIndicator column="payrollType" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('employees')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.employees}
                    <SortIndicator column="employees" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('totalAmount')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.totalAmount}
                    <SortIndicator column="totalAmount" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('jurisdiction')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.jurisdiction}
                    <SortIndicator column="jurisdiction" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('unit')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.unit}
                    <SortIndicator column="unit" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('business')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.business}
                    <SortIndicator column="business" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('status')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.status}
                    <SortIndicator column="status" />
                  </TableHead>
                  <TableHead className="px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {copy.runLedger.actions}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRuns.length === 0 ? (
                  <TableRow className="border-slate-200 dark:border-slate-700">
                    <TableCell colSpan={10} className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
                      {copy.labels.noRuns}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRuns.map((run) => {
                    const operationalStatus = resolveOperationalStatus(run);
                    const runJurisdictionLabel = resolveRunJurisdictionLabel(run);
                    const runNativeTotals = getRunNativeTotals(run, runJurisdictionLabel);
                    const runPreferredNetAmount = getRunPreferredNetAmount(
                      run,
                      preferredCurrency,
                      exchangeRatesPerUsd,
                      runJurisdictionLabel,
                    );
                    const nativeBreakdownLabel = formatRunNativeBreakdown(run, runJurisdictionLabel);
                    const shouldShowNativeBreakdown = runNativeTotals.length > 1
                      || runNativeTotals.some(([currencyCode]) => currencyCode !== preferredCurrency);

                    return (
                      <TableRow key={run.id} className="border-slate-200 transition-colors hover:bg-slate-50/70 dark:border-slate-700 dark:hover:bg-slate-900/40">
                        <TableCell className="px-5 py-5 align-middle">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-950 dark:text-white">
                              {formatDate(run.period_start_date, currentLanguage.code, run.period_start_date)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {copy.runLedger.periodConnector} {formatDate(run.period_end_date, currentLanguage.code, run.period_end_date)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle text-sm font-medium text-slate-700 dark:text-slate-200">
                          {copy.frequencies[run.pay_period]}
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {copy.groupingModes[run.grouping_mode]}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {run.grouping_label || copy.runLedger.automaticGrouping}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle">
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-800 dark:bg-slate-900 dark:text-slate-100">
                            {run.users_count}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle">
                          <p className="text-sm font-bold text-slate-950 dark:text-white">
                            {formatBusinessCurrencyAmount(runPreferredNetAmount, preferredCurrency, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {copy.runLedger.netPayout} · {preferredCurrency}
                            {shouldShowNativeBreakdown ? ` · ${nativeBreakdownLabel}` : ''}
                          </p>
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle text-sm text-slate-700 dark:text-slate-200">
                          {runJurisdictionLabel}
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle text-sm text-slate-700 dark:text-slate-200">
                          {resolveRunUnitLabel(run)}
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle text-sm text-slate-700 dark:text-slate-200">
                          {resolveRunBusinessLabel(run)}
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${operationalStatus.className}`}>
                            {operationalStatus.label}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle">
                          <PayrollRunActionsMenu
                            copy={copy.runActions}
                            run={run}
                            isBusy={isSaving}
                            onOpen={() => void openRunDetail(run.id)}
                            onProcess={() => void handleProcessRunFromTable(run)}
                            onApprove={() => void handleApproveRunFromTable(run)}
                            onMarkPaid={() => void handlePayRunFromTable(run)}
                            onExportPdf={() => void handleDownload('pdf', run)}
                            onExportCsv={() => void handleDownload('csv', run)}
                            onCancel={() => void handleCancelRunFromTable(run)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </section>
        </>
      )}

      {isPreferencesDialogOpen ? (
        <PayrollPreferencesDialog
          copy={copy}
          isOpen={isPreferencesDialogOpen}
          isSaving={isSaving}
          form={preferencesForm}
          onClose={() => setIsPreferencesDialogOpen(false)}
          onChange={setPreferencesForm}
          onSave={() => void handleSavePreferences()}
        />
      ) : null}

      {isRunDialogOpen ? (
        <PayrollRunDialog
          copy={copy}
          locale={currentLanguage.code}
          isOpen={isRunDialogOpen}
          isSaving={isSaving}
          activeBusyKind={activeBusyKind}
          notice={runDialogNotice}
          detail={selectedRunDetail}
          selectedLineId={selectedLineId}
          selectedLine={selectedLine}
          lineDraft={lineDraft}
          onClose={() => {
            setIsRunDialogOpen(false);
            setRunDialogNotice(null);
          }}
          onSelectLine={setSelectedLineId}
          onChangeDraft={setLineDraft}
          onSaveLine={() => void handleSaveLine()}
          onProcess={() => void handleRunAction('process')}
          onApprove={() => void handleRunAction('approve')}
          onPay={() => void handleRunAction('pay')}
          onCancel={() => void handleRunAction('cancel')}
          onDownloadCsv={(run) => void handleDownload('csv', run)}
          onDownloadPdf={(run) => void handleDownload('pdf', run)}
          onOpenGovernmentReporting={(run) => void openGovernmentReporting(run.id)}
          onOpenColombiaSetup={(run, line) => void openColombiaSetup(run, line)}
        />
      ) : null}

      {isColombiaSetupDialogOpen && colombiaSetupContext ? (
        <PayrollColombiaSetupDialog
          context={colombiaSetupContext}
          configForm={colombiaConfigForm}
          profileForm={colombiaProfileForm}
          novelties={colombiaNovelties}
          noveltyForm={colombiaNoveltyForm}
          notice={colombiaSetupNotice}
          isSaving={activeBusyKind === 'colombia-setup'}
          onChangeConfig={setColombiaConfigForm}
          onChangeProfile={setColombiaProfileForm}
          onChangeNovelty={setColombiaNoveltyForm}
          onCreateNovelty={() => void handleCreateColombiaNovelty()}
          onSave={() => void handleSaveColombiaSetup()}
          onClose={() => {
            setIsColombiaSetupDialogOpen(false);
            setColombiaSetupContext(null);
            setColombiaSetupNotice(null);
          }}
        />
      ) : null}

      {isGovernmentReportingDialogOpen ? (
        <PayrollGovernmentReportingDialog
          detail={governmentReportingDetail}
          locale={currentLanguage.code}
          onClose={() => {
            setIsGovernmentReportingDialogOpen(false);
            setGovernmentReportingDetail(null);
          }}
        />
      ) : null}

      <PayrollRunPrintPortal
        job={printJob}
        onComplete={() => setPrintJob(null)}
      />
    </>
  );
}

function PayrollPreferencesDialog({
  copy,
  isOpen,
  isSaving,
  form,
  onClose,
  onChange,
  onSave,
}: {
  copy: PayrollCopy;
  isOpen: boolean;
  isSaving: boolean;
  form: PayrollPreferences;
  onClose: () => void;
  onChange: (value: PayrollPreferences) => void;
  onSave: () => void;
}) {
  const preferenceCopy = copy.preferencesDialog;
  const groupingOptions = [
    { key: 'single', ...preferenceCopy.groupingOptions.single },
    { key: 'unit', ...preferenceCopy.groupingOptions.unit },
    { key: 'business', ...preferenceCopy.groupingOptions.business },
  ] as const;

  const selectedOption = groupingOptions.find((option) => option.key === form.grouping_mode) ?? groupingOptions[0];
  const optionIconMap = {
    single: Globe2,
    unit: MapPinned,
    business: Landmark,
  } as const;
  const automaticSeparatorCards = [
    {
      title: preferenceCopy.separators.frequency.title,
      description: preferenceCopy.separators.frequency.description,
      Icon: CreditCard,
    },
    {
      title: preferenceCopy.separators.workforce.title,
      description: preferenceCopy.separators.workforce.description,
      Icon: ShieldCheck,
    },
    {
      title: preferenceCopy.separators.jurisdiction.title,
      description: preferenceCopy.separators.jurisdiction.description,
      Icon: Globe2,
    },
  ];
  const preferenceSteps = [
    { number: '1', label: preferenceCopy.steps.organization },
    { number: '2', label: preferenceCopy.steps.automaticSeparation },
    { number: '3', label: preferenceCopy.steps.calendar },
  ];
  const impactMessage = preferenceCopy.impactMessage;
  const saveButtonLabel = isSaving
    ? preferenceCopy.saving
    : copy.labels.savePreferences;
  const [currentPreferenceStep, setCurrentPreferenceStep] = useState(0);
  const isFinalPreferenceStep = currentPreferenceStep === preferenceSteps.length - 1;
  const biweeklyFirstDayOptions = Array.from({ length: 27 }, (_, index) => index + 1);
  const biweeklySecondDayOptions = Array.from({ length: 27 }, (_, index) => index + 2);
  const monthlyStartDayOptions = Array.from({ length: 31 }, (_, index) => index + 1);

  useEffect(() => {
    if (isOpen) {
      setCurrentPreferenceStep(0);
    }
  }, [isOpen]);

  const goToPreviousPreferenceStep = () => {
    setCurrentPreferenceStep((currentStep) => Math.max(currentStep - 1, 0));
  };

  const goToNextPreferenceStep = () => {
    setCurrentPreferenceStep((currentStep) => Math.min(currentStep + 1, preferenceSteps.length - 1));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="!flex h-[min(820px,calc(100vh-2rem))] w-[min(1120px,calc(100vw-2rem))] max-w-none sm:max-w-none flex-col gap-0 overflow-hidden rounded-lg border border-[#59C3A5]/25 bg-white p-0 shadow-[0_28px_80px_rgba(15,23,42,0.26)] dark:border-[#59C3A5]/30 dark:bg-slate-900 [&>button]:hidden">
        <DialogHeader className="shrink-0 bg-[#59C3A5] px-6 py-5 text-left text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/12 text-white shadow-sm ring-1 ring-white/10">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <DialogTitle className="text-xl font-bold leading-tight text-white">
                  {copy.labels.preferences}
                </DialogTitle>
                <DialogDescription className="max-w-2xl text-sm leading-6 text-blue-100">
                  {preferenceCopy.subtitle}
                </DialogDescription>
              </div>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                disabled={isSaving}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={copy.labels.close}
              >
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {preferenceSteps.map((step, index) => (
              <button
                key={step.number}
                type="button"
                disabled={isSaving}
                onClick={() => setCurrentPreferenceStep(index)}
                className={`flex min-w-0 items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${currentPreferenceStep === index
                  ? 'border-[#59C3A5] bg-[#59C3A5]/10 text-[#59C3A5] shadow-sm dark:border-blue-400/50 dark:bg-blue-400/10 dark:text-blue-200'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#59C3A5]/30 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300'
                  }`}
                aria-current={currentPreferenceStep === index ? 'step' : undefined}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${currentPreferenceStep >= index
                  ? 'bg-[#59C3A5] text-white'
                  : 'bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700'
                  }`}>
                  {step.number}
                </span>
                <span className="min-w-0 text-sm font-semibold leading-tight">{step.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 p-6 dark:bg-slate-950/40">
          <section className={`${currentPreferenceStep === 0 ? 'block' : 'hidden'}`}>
            <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/75">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#59C3A5] text-sm font-bold text-white shadow-sm">
                    1
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#59C3A5] dark:text-blue-300">
                      {preferenceCopy.steps.stepLabel('1')}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{preferenceCopy.organizationTitle}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {preferenceCopy.organizationSubtitle}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-[#59C3A5]/15 bg-[#59C3A5]/5 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#59C3A5] dark:text-blue-200">{preferenceCopy.selectedOrganization}</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#59C3A5] shadow-sm ring-1 ring-[#59C3A5]/10 dark:bg-slate-900 dark:text-blue-200">
                      {selectedOption.title}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {selectedOption.examples.map((example) => (
                      <p key={example} className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                        {example}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {groupingOptions.map((option) => {
                  const isSelected = form.grouping_mode === option.key;
                  const Icon = optionIconMap[option.key];

                  return (
                    <button
                      key={option.key}
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        if (form.grouping_mode !== option.key) {
                          onChange({ ...form, grouping_mode: option.key as PayrollPreferences['grouping_mode'] });
                        }
                      }}
                      className={`group flex w-full items-start gap-4 rounded-lg border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${isSelected
                        ? 'border-[#59C3A5] bg-[#59C3A5]/5 shadow-sm ring-2 ring-[#59C3A5]/10 dark:border-blue-400/60 dark:bg-[#59C3A5]/20'
                        : 'border-slate-200 bg-white hover:border-[#59C3A5]/35 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-400/40'
                        }`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isSelected
                        ? 'bg-[#59C3A5] text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-base font-bold text-slate-900 dark:text-white">{option.title}</h4>
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${isSelected
                            ? 'border-[#59C3A5] bg-white text-[#59C3A5]'
                            : 'border-slate-300 bg-white text-slate-300 dark:border-slate-600 dark:bg-slate-900'
                            }`}>
                            <CheckCircle2 className="h-4 w-4" />
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">{option.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className={`${currentPreferenceStep === 1 ? 'block' : 'hidden'}`}>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/75">
              <div className="mb-5 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#59C3A5]/20 bg-[#59C3A5]/5 text-sm font-bold text-[#59C3A5] dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-200">
                  2
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#59C3A5] dark:text-blue-300">{preferenceCopy.steps.stepLabel('2')}</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{preferenceCopy.separationTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{preferenceCopy.separationSubtitle}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {automaticSeparatorCards.map(({ title, description, Icon }) => (
                  <div key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/70">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#59C3A5] shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-blue-300 dark:ring-slate-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="mt-4">
                      <p className="text-base font-bold text-slate-900 dark:text-white">{title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-lg border border-[#59C3A5]/15 bg-[#59C3A5]/5 px-5 py-4 text-sm leading-6 text-[#59C3A5] dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">
                {preferenceCopy.separationNotice}
              </div>
            </div>
          </section>

          <section className={`${currentPreferenceStep === 2 ? 'block' : 'hidden'}`}>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/75">
              <div className="mb-5 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#59C3A5]/20 bg-white text-[#59C3A5] dark:border-blue-400/25 dark:bg-slate-900 dark:text-blue-200">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#59C3A5] dark:text-blue-300">
                    {preferenceCopy.steps.stepLabel('3')}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{preferenceCopy.calendarTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {preferenceCopy.calendarSubtitle}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/70">
                  <label className="text-sm font-bold text-slate-800 dark:text-slate-100" htmlFor="payroll-weekly-start-day">
                    {preferenceCopy.weeklyStartDay}
                  </label>
                  <select
                    id="payroll-weekly-start-day"
                    value={form.weekly_start_day}
                    disabled={isSaving}
                    onChange={(event) => onChange({ ...form, weekly_start_day: Number(event.target.value) })}
                    className="mt-3 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {preferenceCopy.weekDays.map((day) => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                  <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">{preferenceCopy.weeklyHelper}</p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/70">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{copy.frequencies.biweekly}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block" htmlFor="payroll-biweekly-first-day">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{preferenceCopy.biweeklyFirstDay}</span>
                      <select
                        id="payroll-biweekly-first-day"
                        value={form.biweekly_first_day}
                        disabled={isSaving}
                        onChange={(event) => {
                          const nextFirstDay = Number(event.target.value);
                          onChange({
                            ...form,
                            biweekly_first_day: nextFirstDay,
                            biweekly_second_day: Math.max(form.biweekly_second_day, nextFirstDay + 1),
                          });
                        }}
                        className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      >
                        {biweeklyFirstDayOptions.map((day) => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block" htmlFor="payroll-biweekly-second-day">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{preferenceCopy.biweeklySecondDay}</span>
                      <select
                        id="payroll-biweekly-second-day"
                        value={form.biweekly_second_day}
                        disabled={isSaving}
                        onChange={(event) => onChange({ ...form, biweekly_second_day: Number(event.target.value) })}
                        className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      >
                        {biweeklySecondDayOptions.map((day) => (
                          <option key={day} value={day} disabled={day <= form.biweekly_first_day}>{day}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">{preferenceCopy.biweeklyHelper}</p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/70">
                  <label className="text-sm font-bold text-slate-800 dark:text-slate-100" htmlFor="payroll-monthly-start-day">
                    {preferenceCopy.monthlyStartDay}
                  </label>
                  <div className="mt-3 flex items-center gap-3">
                    <select
                      id="payroll-monthly-start-day"
                      disabled={isSaving}
                      value={form.monthly_start_day}
                      onChange={(event) => onChange({ ...form, monthly_start_day: Number(event.target.value) })}
                      className="h-12 w-28 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {monthlyStartDayOptions.map((day) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{preferenceCopy.dayOfMonthHelper}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">{preferenceCopy.monthlyHelper}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="shrink-0 border-t border-white/15 bg-[#59C3A5] px-6 py-4 text-white">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{preferenceCopy.footerTitle}</p>
              <p className="max-w-[540px] truncate text-xs text-blue-100">{impactMessage}</p>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                disabled={isSaving}
                className="h-11 rounded-xl border-white/50 bg-transparent px-5 text-sm font-semibold text-white shadow-none hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                onClick={onClose}
              >
                {copy.labels.cancel}
              </Button>
              {currentPreferenceStep > 0 ? (
                <Button
                  variant="outline"
                  disabled={isSaving}
                  className="h-11 rounded-xl border-white/50 bg-transparent px-5 text-sm font-semibold text-white shadow-none hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={goToPreviousPreferenceStep}
                >
                  {preferenceCopy.previous}
                </Button>
              ) : null}
              {isFinalPreferenceStep ? (
                <Button
                  onClick={onSave}
                  disabled={isSaving}
                  className="h-11 gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#59C3A5] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                  {saveButtonLabel}
                </Button>
              ) : (
                <Button
                  onClick={goToNextPreferenceStep}
                  disabled={isSaving}
                  className="h-11 rounded-xl bg-white px-5 text-sm font-semibold text-[#59C3A5] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {preferenceCopy.next}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayrollRatesDialog({
  copy,
  isOpen,
  isSaving,
  selectedProfile,
  values,
  onClose,
  onSelectProfile,
  onChangeValue,
  onSave,
}: {
  copy: PayrollCopy;
  isOpen: boolean;
  isSaving: boolean;
  selectedProfile: PayrollRateProfileKey;
  values: PayrollRateValues;
  onClose: () => void;
  onSelectProfile: (value: PayrollRateProfileKey) => void;
  onChangeValue: (field: PayrollRateFieldKey, value: number) => void;
  onSave: () => void;
}) {
  const fieldLabels = copy.rateConfiguration.fieldLabels[selectedProfile];
  const [editorMode, setEditorMode] = useState<PayrollRateEditorMode>('preset');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setEditorMode('preset');
  }, [isOpen, selectedProfile]);

  const isCustomProfile = selectedProfile === 'custom';
  const isAdvancedMode = editorMode === 'advanced';
  const activeProfileName = copy.rateConfiguration.profiles[selectedProfile];
  const activeProfileFlag = payrollRateProfileFlags[selectedProfile];
  const headerTitle = `${copy.rateConfiguration.title} — ${activeProfileName}`;
  const infoBlockText = copy.rateConfiguration.infoBlocks[selectedProfile];

  const summaryStatus = isCustomProfile
    ? copy.rateConfiguration.statusBadges.customProfile
    : isAdvancedMode
      ? copy.rateDialog.companyAdjusted
      : copy.rateConfiguration.statusBadges.officialPreset;

  const summaryTone: 'success' | 'warning' | 'info' = isCustomProfile
    ? 'warning'
    : isAdvancedMode
      ? 'info'
      : 'success';

  const iconByField: Record<PayrollRateFieldKey, typeof Wallet> = {
    isr_rate: Wallet,
    imss_user_rate: ShieldCheck,
    infonavit_user_rate: CreditCard,
    imss_employer_rate: ShieldCheck,
    infonavit_employer_rate: CreditCard,
    sar_employer_rate: Landmark,
  };

  const automaticFields: PayrollRateFieldKey[] = ['isr_rate', 'imss_user_rate', 'imss_employer_rate'];
  const fixedByLawFields: PayrollRateFieldKey[] = ['infonavit_employer_rate'];
  const adjustableFields: PayrollRateFieldKey[] = ['infonavit_user_rate', 'sar_employer_rate'];

  const handlePercentInputChange = (field: PayrollRateFieldKey, nextValue: string) => {
    onChangeValue(field, parseRateInputPercent(nextValue));
  };

  const renderPercentInput = (field: PayrollRateFieldKey) => (
    <div className="w-32">
      <div className="relative">
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={formatRateInputPercent(values[field])}
          onChange={(event) => handlePercentInputChange(field, event.target.value)}
          className="h-11 w-full rounded-xl border border-amber-200 bg-white pl-3 pr-9 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-[#59C3A5] dark:border-amber-700/40 dark:bg-slate-800 dark:text-slate-100"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400 dark:text-slate-500">
          %
        </span>
      </div>
    </div>
  );

  const renderStatusBadge = (label: string, tone: 'success' | 'warning' | 'info') => {
    const toneClasses = {
      success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300',
      warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300',
      info: 'border-[#59C3A5]/20 bg-[#59C3A5]/10 text-[#59C3A5] dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/20 dark:text-[#9fbeff]',
    } as const;

    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
        {tone === 'success' ? '🟢' : tone === 'warning' ? '🟡' : '🔵'}
        <span className="ml-1.5">{label}</span>
      </span>
    );
  };

  const renderBreakdownButton = () => (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#59C3A5] transition hover:border-[#59C3A5]/30 hover:bg-[#59C3A5]/5 dark:border-slate-600 dark:text-[#9fbeff] dark:hover:bg-[#59C3A5]/15"
    >
      {copy.rateConfiguration.viewBreakdown}
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  );

  const componentCardClassName = 'rounded-2xl border bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:px-5';

  const renderAutomaticCard = (field: PayrollRateFieldKey, description: string) => {
    const Icon = iconByField[field];
    return (
      <article key={field} className={`${componentCardClassName} border-emerald-100 dark:border-emerald-800/30`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{fieldLabels[field]}</h4>
              <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {renderStatusBadge(copy.rateConfiguration.statusBadges.automatic, 'success')}
            {renderBreakdownButton()}
          </div>
        </div>
      </article>
    );
  };

  const renderFixedCard = (field: PayrollRateFieldKey, description: string) => {
    const Icon = iconByField[field];
    return (
      <article key={field} className={`${componentCardClassName} border-emerald-100 dark:border-emerald-800/30`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{fieldLabels[field]}</h4>
              <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {renderStatusBadge(copy.rateConfiguration.statusBadges.fixedByLaw, 'success')}
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatRateInputPercent(values[field])}%</p>
          </div>
        </div>
      </article>
    );
  };

  const renderAdjustableCard = (field: PayrollRateFieldKey, description: string) => {
    const Icon = iconByField[field];
    const hasValue = values[field] > 0;
    const notConfiguredLabel = copy.rateDialog.notConfigured;

    return (
      <article key={field} className={`${componentCardClassName} border-amber-100 dark:border-amber-800/30`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{fieldLabels[field]}</h4>
              <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {renderStatusBadge(copy.rateDialog.adjustable, 'warning')}
            {isAdvancedMode || isCustomProfile ? (
              renderPercentInput(field)
            ) : (
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {hasValue ? `${formatRateInputPercent(values[field])}%` : notConfiguredLabel}
              </p>
            )}
          </div>
        </div>
      </article>
    );
  };

  const mexicoOverviewText = copy.rateDialog.mexicoOverview;
  const automaticDescription = copy.rateDialog.automaticDescription;
  const fixedDescription = copy.rateDialog.fixedDescription;
  const adjustableDescription = copy.rateDialog.adjustableDescription;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="!flex h-[min(88vh,940px)] max-h-[calc(100vh-3rem)] max-w-[980px] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
        <div className="shrink-0 bg-[#59C3A5] px-5 py-3 sm:px-6 sm:py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="pr-4">
              <DialogTitle className="text-[1.1rem] font-normal leading-tight text-white sm:text-[1.2rem]">
                {headerTitle}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/70 dark:bg-slate-900/60">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden="true">{activeProfileFlag}</span>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{activeProfileName}</h3>
                      {renderStatusBadge(summaryStatus, summaryTone)}
                    </div>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {copy.rateDialog.profileIntro}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <select
                      value={selectedProfile}
                      onChange={(event) => onSelectProfile(event.target.value as PayrollRateProfileKey)}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#59C3A5] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    >
                      {payrollRateProfileKeys.map((profileKey) => (
                        <option key={profileKey} value={profileKey}>
                          {payrollRateProfileFlags[profileKey]} {copy.rateConfiguration.profiles[profileKey]}
                        </option>
                      ))}
                    </select>
                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100/90 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={() => {
                          if (editorMode !== 'preset') {
                            setEditorMode('preset');
                          }
                        }}
                        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${!isAdvancedMode
                          ? 'bg-white text-[#59C3A5] shadow-sm dark:bg-slate-800 dark:text-slate-100'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
                          }`}
                      >
                        {copy.rateDialog.overview}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (editorMode !== 'advanced') {
                            setEditorMode('advanced');
                          }
                        }}
                        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${isAdvancedMode
                          ? 'bg-white text-[#59C3A5] shadow-sm dark:bg-slate-800 dark:text-slate-100'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
                          }`}
                      >
                        {copy.rateConfiguration.modeLabels.advanced}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#59C3A5]/12 bg-[#59C3A5]/5 p-5 shadow-sm dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#59C3A5] shadow-sm dark:bg-slate-800 dark:text-[#9fbeff]">
                    <Info className="h-5 w-5" />
                  </div>
                  <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {selectedProfile === 'mexico' ? mexicoOverviewText : infoBlockText}
                  </p>
                </div>
              </section>

              {isAdvancedMode ? (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
                  {copy.rateDialog.advancedWarning}
                </section>
              ) : null}

              <section className="space-y-3">
                {automaticFields.map((field) => renderAutomaticCard(field, automaticDescription))}
                {fixedByLawFields.map((field) => renderFixedCard(field, fixedDescription))}
                {adjustableFields.map((field) => renderAdjustableCard(field, adjustableDescription))}
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#59C3A5]/10 text-[#59C3A5] dark:bg-[#59C3A5]/20 dark:text-[#8fb2ff]">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {copy.rateDialog.profileHelp}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800 sm:px-6">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-slate-200 bg-white px-5 text-base font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                onClick={onClose}
              >
                {copy.labels.cancel}
              </Button>
              <Button
                onClick={onSave}
                disabled={isSaving}
                className="h-11 gap-2 rounded-2xl bg-[#59C3A5] px-5 text-base font-semibold text-white hover:bg-[#3AAE90]"
              >
                {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SlidersHorizontal className="h-4 w-4" />}
                {copy.rateConfiguration.saveAction}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PayrollRunDialog({
  copy,
  locale,
  isOpen,
  isSaving,
  activeBusyKind,
  notice,
  detail,
  selectedLineId,
  selectedLine,
  lineDraft,
  onClose,
  onSelectLine,
  onChangeDraft,
  onSaveLine,
  onProcess,
  onApprove,
  onPay,
  onCancel,
  onDownloadCsv,
  onDownloadPdf,
  onOpenGovernmentReporting,
  onOpenColombiaSetup,
}: {
  copy: PayrollCopy;
  locale: string;
  isOpen: boolean;
  isSaving: boolean;
  activeBusyKind: PayrollBusyKind | null;
  notice: PayrollDialogNotice | null;
  detail: PayrollRunDetailResponse | null;
  selectedLineId: number | null;
  selectedLine: PayrollRunLine | null;
  lineDraft: {
    include_in_fiscal: boolean;
    notes: string;
    manual_items: PayrollManualItemPayload[];
  };
  onClose: () => void;
  onSelectLine: (value: number | null) => void;
  onChangeDraft: (value: {
    include_in_fiscal: boolean;
    notes: string;
    manual_items: PayrollManualItemPayload[];
  }) => void;
  onSaveLine: () => void;
  onProcess: () => void;
  onApprove: () => void;
  onPay: () => void;
  onCancel: () => void;
  onDownloadCsv: (run: PayrollRunSummary) => void;
  onDownloadPdf: (run: PayrollRunSummary) => void;
  onOpenGovernmentReporting: (run: PayrollRunSummary) => void;
  onOpenColombiaSetup: (run: PayrollRunSummary, line: PayrollRunLine) => void;
}) {
  const isDraft = detail?.run.status === 'draft';
  const canProcess = detail?.run.status === 'draft';
  const canApprove = detail?.run.status === 'processed';
  const canPay = detail?.run.status === 'approved';
  const canCancel = detail && detail.run.status !== 'paid' && detail.run.status !== 'cancelled';
  const runCurrency = detail?.run.currency_code || 'USD';
  const selectedLineCurrency = selectedLine?.currency_code || runCurrency;
  const selectedLineHasIncentives = selectedLine?.items.some((item) => item.source_type === 'incentive') ?? false;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[140] overflow-y-auto bg-black/55 px-4 py-8 backdrop-blur-[2px]">
      <div className="flex min-h-full items-start justify-center">
        <div
          className="relative w-full max-w-[96vw] overflow-hidden rounded-lg border border-[#59C3A5]/25 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] dark:border-[#59C3A5]/30 dark:bg-slate-950"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative bg-[#59C3A5] px-6 py-5 pr-16 text-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="absolute right-4 top-4 rounded-full border border-white/30 bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:opacity-60"
              aria-label={copy.labels.close}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white shadow-sm">
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold">
                  {detail ? `${copy.labels.detail} #${detail.run.id}` : copy.labels.detail}
                </h2>
                <p className="mt-1 text-sm font-semibold text-white/85">
                  {detail
                    ? `${formatDate(detail.run.period_start_date, locale, detail.run.period_start_date)} → ${formatDate(detail.run.period_end_date, locale, detail.run.period_end_date)}`
                    : copy.labels.currentRun}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 dark:bg-slate-950">
          {notice ? (
            <div
              className={`mb-6 rounded-xl border px-4 py-3 text-sm ${notice.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300'
                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-300'
                }`}
            >
              {notice.message}
            </div>
          ) : null}

          {detail ? (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-[#59C3A5]/25 bg-[#59C3A5]/10 px-4 py-3 text-sm font-semibold text-[#177d66] dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/15 dark:text-[#B8F2E3]">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{copy.labels.nativeCurrencyNotice}</span>
            </div>
          ) : null}

          {detail ? (
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-4">
                <div className="rounded-lg border border-[#59C3A5]/20 bg-white p-4 shadow-sm dark:border-[#59C3A5]/25 dark:bg-slate-900/70">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[#59C3A5]/15 px-2.5 py-1 text-xs font-bold text-[#177d66] dark:bg-[#59C3A5]/20 dark:text-[#B8F2E3]">
                      {copy.statuses[detail.run.status]}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {detail.run.grouping_label || copy.groupingModes[detail.run.grouping_mode]}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {copy.frequencies[detail.run.pay_period]}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <DetailMetric label={copy.labels.employees} value={String(detail.run.users_count)} />
                    <DetailMetric label={copy.labels.gross} value={formatCurrency(detail.run.gross_amount, locale, runCurrency)} />
                    <DetailMetric label={copy.labels.deductions} value={formatCurrency(detail.run.deductions_amount, locale, runCurrency)} />
                    <DetailMetric label={copy.labels.net} value={formatCurrency(detail.run.net_amount, locale, runCurrency)} />
                  </div>
                </div>

                <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">
                  {detail.lines.map((line) => (
                    <button
                      key={line.id}
                      type="button"
                      onClick={() => onSelectLine(line.id)}
                      className={`w-full rounded-lg border px-4 py-4 text-left transition-all ${selectedLineId === line.id
                        ? 'border-[#59C3A5] bg-[#59C3A5]/10 shadow-sm dark:border-[#59C3A5] dark:bg-[#59C3A5]/15'
                        : 'border-gray-200 bg-white hover:border-[#59C3A5]/50 dark:border-gray-700 dark:bg-gray-800'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{line.user_name}</p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {line.position_title || '—'} · {line.department || '—'}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(line.net_amount, locale, line.currency_code || runCurrency)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {selectedLine ? (
                  <>
                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{copy.labels.employee}</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedLine.user_name}</p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {selectedLine.position_title || '—'} · {selectedLine.department || '—'}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {copy.labels.currentRun}
                          </span>
                          {(selectedLine.country_code === 'CO' || selectedLine.jurisdiction_code === 'CO') ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onOpenColombiaSetup(detail.run, selectedLine)}
                              className="h-8 gap-1.5 rounded-lg border-[#59C3A5]/30 px-2 text-xs font-bold text-[#177d66]"
                            >
                              <Globe2 className="h-3.5 w-3.5" />
                              Colombia
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <DetailMetric label={copy.labels.salaryType} value={selectedLine.salary_type === 'daily' ? copy.labels.daily : copy.labels.hourly} />
                        <DetailMetric label={copy.labels.daysPayable} value={String(selectedLine.days_payable)} />
                        <DetailMetric label={copy.labels.leaveDays} value={String(selectedLine.leave_days)} />
                        <DetailMetric label={copy.labels.absenceDays} value={String(selectedLine.absence_days)} />
                        <DetailMetric label={copy.labels.noAttendanceRecords} value={String(selectedLine.missing_attendance_days ?? 0)} />
                        <DetailMetric label={copy.labels.regularHours} value={String(selectedLine.regular_hours)} />
                        <DetailMetric label={copy.labels.overtimeHours} value={String(selectedLine.overtime_hours)} />
                        <DetailMetric label={copy.labels.lateCount} value={String(selectedLine.late_count)} />
                        <DetailMetric label={copy.labels.net} value={formatCurrency(selectedLine.net_amount, locale, selectedLineCurrency)} />
                      </div>

                      {selectedLine.attendance_warnings?.length ? (
                        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                          {selectedLine.attendance_warnings.join(' · ')}
                        </div>
                      ) : null}

                      {selectedLine.calculation_warnings?.length ? (
                        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                          {selectedLine.calculation_warnings.join(' · ')}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{copy.labels.lineEditor}</h4>

                      <div className="mt-4 space-y-4">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={lineDraft.include_in_fiscal}
                            disabled={!isDraft}
                            onChange={(event) => onChangeDraft({ ...lineDraft, include_in_fiscal: event.target.checked })}
                          />
                          {copy.labels.includeFiscal}
                        </label>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.notes}</label>
                          <textarea
                            value={lineDraft.notes}
                            disabled={!isDraft}
                            onChange={(event) => onChangeDraft({ ...lineDraft, notes: event.target.value })}
                            className="min-h-[88px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#59C3A5] focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.manualItems}</label>
                            {isDraft ? (
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onChangeDraft({
                                    ...lineDraft,
                                    manual_items: [...lineDraft.manual_items, { category: 'earning', label: '', amount: 0 }],
                                  })}
                                >
                                  {copy.labels.addManualEarning}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onChangeDraft({
                                    ...lineDraft,
                                    manual_items: [...lineDraft.manual_items, { category: 'deduction', label: '', amount: 0 }],
                                  })}
                                >
                                  {copy.labels.addManualDeduction}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onChangeDraft({
                                    ...lineDraft,
                                    manual_items: [...lineDraft.manual_items, { category: 'employer_contribution', label: '', amount: 0 }],
                                  })}
                                >
                                  {copy.itemCategories.employer_contribution}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onChangeDraft({
                                    ...lineDraft,
                                    manual_items: [...lineDraft.manual_items, { category: 'provision', label: '', amount: 0 }],
                                  })}
                                >
                                  {copy.itemCategories.provision}
                                </Button>
                              </div>
                            ) : null}
                          </div>

                          <div className="space-y-3">
                            {lineDraft.manual_items.length > 0 ? (
                              lineDraft.manual_items.map((item, index) => (
                                <div key={`${item.category}-${index}`} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/70 md:grid-cols-[190px_minmax(0,1fr)_140px_auto]">
                                  <select
                                    value={item.category}
                                    disabled={!isDraft}
                                    onChange={(event) => {
                                      const manualItems = lineDraft.manual_items.map((currentItem, currentIndex) =>
                                        currentIndex === index
                                          ? { ...currentItem, category: event.target.value as PayrollManualItemPayload['category'] }
                                          : currentItem,
                                      );
                                      onChangeDraft({ ...lineDraft, manual_items: manualItems });
                                    }}
                                    className="min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                  >
                                    <option value="earning">{copy.itemCategories.earning}</option>
                                    <option value="deduction">{copy.itemCategories.deduction}</option>
                                    <option value="employer_contribution">{copy.itemCategories.employer_contribution}</option>
                                    <option value="provision">{copy.itemCategories.provision}</option>
                                  </select>
                                  <input
                                    type="text"
                                    value={item.label}
                                    disabled={!isDraft}
                                    placeholder={copy.labels.description}
                                    onChange={(event) => {
                                      const manualItems = lineDraft.manual_items.map((currentItem, currentIndex) =>
                                        currentIndex === index
                                          ? { ...currentItem, label: event.target.value }
                                          : currentItem,
                                      );
                                      onChangeDraft({ ...lineDraft, manual_items: manualItems });
                                    }}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.amount}
                                    disabled={!isDraft}
                                    onChange={(event) => {
                                      const manualItems = lineDraft.manual_items.map((currentItem, currentIndex) =>
                                        currentIndex === index
                                          ? { ...currentItem, amount: Number(event.target.value) }
                                          : currentItem,
                                      );
                                      onChangeDraft({ ...lineDraft, manual_items: manualItems });
                                    }}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                  />
                                  {isDraft ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => onChangeDraft({
                                        ...lineDraft,
                                        manual_items: lineDraft.manual_items.filter((_, currentIndex) => currentIndex !== index),
                                      })}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  ) : null}
                                </div>
                              ))
                            ) : (
                              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-400">
                                {copy.labels.noItems}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                          <h5 className="text-sm font-semibold text-gray-900 dark:text-white">{copy.labels.detail}</h5>
                          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.labels.payrollEngineDetail}</p>
                          <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                            <span>{selectedLine.calculation_source || 'payroll_calculation_engine'}</span>
                            <span>{selectedLine.calculation_timestamp || '—'}</span>
                            <span>{selectedLine.statutory_compliance === false ? 'Cálculo operativo' : 'Cumplimiento fiscal activo'}</span>
                          </div>
                          {selectedLineHasIncentives ? (
                            <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                              <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>{copy.labels.incentiveLockedNotice}</span>
                            </div>
                          ) : null}
                          <div className="mt-3 space-y-2">
                            {selectedLine.items.map((item) => (
                              <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-gray-900 dark:text-white">{getPayrollLineItemDisplayLabel(item, copy)}</p>
                                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${getPayrollLineItemSourceClassName(item)}`}>
                                      {getPayrollLineItemSourceLabel(item, copy)}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {copy.itemCategories[item.category as keyof typeof copy.itemCategories] ?? item.category} · {item.code}
                                    {item.rule_code ? ` · ${item.rule_code}` : ''}
                                    {item.rate_applied ? ` · ${(item.rate_applied * 100).toFixed(2)}%` : ''}
                                  </p>
                                  {item.calculation_formula ? (
                                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{item.calculation_formula}</p>
                                  ) : null}
                                </div>
                                <p className="shrink-0 font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(item.amount, locale, item.currency_code || selectedLineCurrency)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                    {copy.labels.noLineSelected}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
              {copy.loading}
            </div>
          )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-white/15 bg-[#59C3A5] px-6 py-4 sm:flex-row sm:justify-end">
            {detail ? (
              <>
                <div className="flex flex-wrap gap-2 sm:mr-auto">
                  <Button variant="outline" onClick={() => onDownloadCsv(detail.run)} className="gap-2 rounded-lg border-white/35 bg-white/10 text-white hover:bg-white/20" disabled={isSaving}>
                    {activeBusyKind === 'download-csv' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {copy.labels.exportCsv}
                  </Button>
                  <Button variant="outline" onClick={() => onDownloadPdf(detail.run)} className="gap-2 rounded-lg border-white/35 bg-white/10 text-white hover:bg-white/20" disabled={isSaving}>
                    {activeBusyKind === 'download-pdf' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                    {copy.labels.exportPdf}
                  </Button>
                  <Button variant="outline" onClick={() => onOpenGovernmentReporting(detail.run)} className="gap-2 rounded-lg border-white/35 bg-white/10 text-white hover:bg-white/20" disabled={isSaving}>
                    {activeBusyKind === 'government-reporting' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
                    PILA / DIAN
                  </Button>
                  {canProcess ? (
                    <Button onClick={onProcess} disabled={isSaving} className="gap-2 rounded-lg bg-white text-[#177d66] hover:bg-white/90">
                      {activeBusyKind === 'process-run' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                      {copy.labels.process}
                    </Button>
                  ) : null}
                  {canApprove ? (
                    <Button onClick={onApprove} disabled={isSaving} className="gap-2 rounded-lg bg-white text-[#177d66] hover:bg-white/90">
                      {activeBusyKind === 'approve-run' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      {copy.labels.approve}
                    </Button>
                  ) : null}
                  {canPay ? (
                    <Button onClick={onPay} disabled={isSaving} className="gap-2 rounded-lg bg-white text-[#177d66] hover:bg-white/90">
                      {activeBusyKind === 'mark-paid' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      {copy.labels.pay}
                    </Button>
                  ) : null}
                  {canCancel ? (
                    <Button variant="outline" onClick={onCancel} disabled={isSaving} className="gap-2 rounded-lg border-white/35 bg-white/10 text-white hover:bg-white/20">
                      {activeBusyKind === 'cancel-run' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      {copy.labels.cancelRun}
                    </Button>
                  ) : null}
                </div>
                {isDraft ? (
                  <Button onClick={onSaveLine} disabled={isSaving || !selectedLine} className="gap-2 rounded-lg bg-white text-[#177d66] hover:bg-white/90">
                    {activeBusyKind === 'save-line' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {copy.labels.saveLine}
                  </Button>
                ) : null}
                <Button variant="outline" className="rounded-lg border-white/35 bg-white/10 text-white hover:bg-white/20" onClick={onClose}>{copy.labels.closeDetail}</Button>
              </>
            ) : (
              <Button variant="outline" className="rounded-lg border-white/35 bg-white/10 text-white hover:bg-white/20" onClick={onClose}>{copy.labels.close}</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const colombiaNoveltyOptions: Array<{ value: PayrollColombiaNoveltyCode; label: string }> = [
  { value: 'VSP', label: 'Variacion permanente de salario' },
  { value: 'VST', label: 'Variacion transitoria de salario' },
  { value: 'SLN', label: 'Suspension temporal' },
  { value: 'IGE', label: 'Incapacidad general' },
  { value: 'LMA', label: 'Licencia maternidad/paternidad' },
  { value: 'LPA', label: 'Licencia remunerada' },
  { value: 'VAC', label: 'Vacaciones' },
  { value: 'RETRO', label: 'Retroactivo' },
  { value: 'CORR', label: 'Correccion' },
  { value: 'LIQ', label: 'Liquidacion' },
  { value: 'RET', label: 'Retiro' },
];

const boolSelectValue = (value: boolean | null | undefined) => (
  value === true ? 'true' : value === false ? 'false' : 'inherit'
);

const boolFromSelectValue = (value: string) => (
  value === 'inherit' ? null : value === 'true'
);

function PayrollColombiaSetupDialog({
  context,
  configForm,
  profileForm,
  novelties,
  noveltyForm,
  notice,
  isSaving,
  onChangeConfig,
  onChangeProfile,
  onChangeNovelty,
  onCreateNovelty,
  onSave,
  onClose,
}: {
  context: PayrollColombiaSetupContext;
  configForm: Partial<PayrollColombiaConfig>;
  profileForm: Partial<PayrollColombiaEmployeeProfile>;
  novelties: PayrollColombiaNovelty[];
  noveltyForm: PayrollColombiaNoveltyForm;
  notice: PayrollDialogNotice | null;
  isSaving: boolean;
  onChangeConfig: (value: Partial<PayrollColombiaConfig>) => void;
  onChangeProfile: (value: Partial<PayrollColombiaEmployeeProfile>) => void;
  onChangeNovelty: (value: PayrollColombiaNoveltyForm) => void;
  onCreateNovelty: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const inputClassName = 'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-800 dark:text-white';
  const labelClassName = 'grid gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400';
  const selectClassName = `${inputClassName} appearance-none`;
  const setConfig = <K extends keyof PayrollColombiaConfig>(key: K, value: PayrollColombiaConfig[K]) => {
    onChangeConfig({ ...configForm, [key]: value });
  };
  const setProfile = <K extends keyof PayrollColombiaEmployeeProfile>(key: K, value: PayrollColombiaEmployeeProfile[K]) => {
    onChangeProfile({ ...profileForm, [key]: value });
  };

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="z-[145] !flex h-[min(90vh,940px)] max-h-[calc(100vh-2rem)] max-w-[1080px] flex-col gap-0 overflow-hidden rounded-lg border border-[#59C3A5]/25 bg-white p-0 shadow-[0_28px_80px_rgba(15,23,42,0.26)] dark:border-[#59C3A5]/30 dark:bg-slate-900 [&>button]:hidden">
        <DialogHeader className="shrink-0 bg-[#59C3A5] px-6 py-5 text-left text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                <Globe2 className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-xl font-bold leading-tight text-white">Colombia</DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-6 text-blue-100">
                  {context.line.user_name} · Corrida #{context.run.id}
                </DialogDescription>
              </div>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-9 rounded-lg p-0 text-white hover:bg-white/15 hover:text-white"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950">
          {notice ? (
            <div className={`mb-4 rounded-lg border px-4 py-3 text-sm font-semibold ${notice.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
              : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
            }`}
            >
              {notice.message}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Empresa Colombia</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className={labelClassName}>
                  Clase ARL default
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="1"
                    value={configForm.default_arl_class ?? ''}
                    onChange={(event) => setConfig('default_arl_class', event.target.value === '' ? null : Number(event.target.value))}
                    className={inputClassName}
                  />
                </label>
                <label className={labelClassName}>
                  Codigo caja compensacion
                  <input
                    value={configForm.compensation_fund_code ?? ''}
                    onChange={(event) => setConfig('compensation_fund_code', event.target.value)}
                    className={inputClassName}
                  />
                </label>
                <label className={`${labelClassName} sm:col-span-2`}>
                  Caja de compensacion
                  <input
                    value={configForm.compensation_fund_name ?? ''}
                    onChange={(event) => setConfig('compensation_fund_name', event.target.value)}
                    className={inputClassName}
                  />
                </label>
                {([
                  ['employer_health_exemption_applies', 'Exoneracion salud patronal'],
                  ['sena_applies', 'SENA'],
                  ['icbf_applies', 'ICBF'],
                  ['ccf_applies', 'CCF'],
                ] as const).map(([key, label]) => (
                  <label key={key} className={labelClassName}>
                    {label}
                    <select
                      value={boolSelectValue(configForm[key])}
                      onChange={(event) => setConfig(key, boolFromSelectValue(event.target.value))}
                      className={selectClassName}
                    >
                      <option value="inherit">Sin definir</option>
                      <option value="true">Si</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Perfil del colaborador</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className={labelClassName}>
                  Tipo cotizante
                  <input
                    value={profileForm.contributor_type ?? ''}
                    onChange={(event) => setProfile('contributor_type', event.target.value)}
                    className={inputClassName}
                  />
                </label>
                <label className={labelClassName}>
                  Subtipo cotizante
                  <input
                    value={profileForm.contributor_subtype ?? ''}
                    onChange={(event) => setProfile('contributor_subtype', event.target.value)}
                    className={inputClassName}
                  />
                </label>
                <label className={labelClassName}>
                  Clase ARL
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="1"
                    value={profileForm.arl_class ?? ''}
                    onChange={(event) => setProfile('arl_class', event.target.value === '' ? null : Number(event.target.value))}
                    className={inputClassName}
                  />
                </label>
                <label className={labelClassName}>
                  Salario integral
                  <select
                    value={profileForm.integral_salary ? 'true' : 'false'}
                    onChange={(event) => setProfile('integral_salary', event.target.value === 'true')}
                    className={selectClassName}
                  >
                    <option value="false">No</option>
                    <option value="true">Si</option>
                  </select>
                </label>
                <label className={labelClassName}>
                  EPS
                  <input
                    value={profileForm.eps_name ?? ''}
                    onChange={(event) => setProfile('eps_name', event.target.value)}
                    className={inputClassName}
                  />
                </label>
                <label className={labelClassName}>
                  Codigo EPS
                  <input
                    value={profileForm.eps_code ?? ''}
                    onChange={(event) => setProfile('eps_code', event.target.value)}
                    className={inputClassName}
                  />
                </label>
                <label className={labelClassName}>
                  AFP
                  <input
                    value={profileForm.afp_name ?? ''}
                    onChange={(event) => setProfile('afp_name', event.target.value)}
                    className={inputClassName}
                  />
                </label>
                <label className={labelClassName}>
                  Codigo AFP
                  <input
                    value={profileForm.afp_code ?? ''}
                    onChange={(event) => setProfile('afp_code', event.target.value)}
                    className={inputClassName}
                  />
                </label>
                <label className={labelClassName}>
                  Procedimiento retencion
                  <select
                    value={profileForm.withholding_procedure ?? 'procedure_1'}
                    onChange={(event) => setProfile('withholding_procedure', event.target.value as PayrollColombiaEmployeeProfile['withholding_procedure'])}
                    className={selectClassName}
                  >
                    <option value="procedure_1">Procedimiento 1</option>
                    <option value="procedure_2">Procedimiento 2</option>
                  </select>
                </label>
                <label className={labelClassName}>
                  Tarifa proc. 2
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.0001"
                    value={profileForm.procedure_2_fixed_rate ?? 0}
                    onChange={(event) => setProfile('procedure_2_fixed_rate', Number(event.target.value))}
                    className={inputClassName}
                  />
                </label>
                {([
                  ['dependents_monthly_deduction', 'Dependientes'],
                  ['prepaid_medicine_monthly', 'Medicina prepagada'],
                  ['housing_interest_monthly', 'Intereses vivienda'],
                  ['voluntary_pension_monthly', 'Pension voluntaria'],
                  ['afc_monthly', 'AFC'],
                  ['other_exempt_income_monthly', 'Otras rentas exentas'],
                ] as const).map(([key, label]) => (
                  <label key={key} className={labelClassName}>
                    {label}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={profileForm[key] ?? 0}
                      onChange={(event) => setProfile(key, Number(event.target.value))}
                      className={inputClassName}
                    />
                  </label>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Novedades Colombia</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Periodo {context.run.period_start_date} a {context.run.period_end_date}
                </p>
              </div>
              <span className="rounded-full border border-[#59C3A5]/25 bg-[#59C3A5]/10 px-3 py-1 text-xs font-black text-[#177d66]">
                {novelties.length} registradas
              </span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_120px_120px_150px_auto]">
              <label className={labelClassName}>
                Codigo
                <select
                  value={noveltyForm.novelty_code}
                  onChange={(event) => onChangeNovelty({ ...noveltyForm, novelty_code: event.target.value as PayrollColombiaNoveltyCode })}
                  className={selectClassName}
                >
                  {colombiaNoveltyOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className={labelClassName}>
                Etiqueta
                <input
                  value={noveltyForm.novelty_label}
                  onChange={(event) => onChangeNovelty({ ...noveltyForm, novelty_label: event.target.value })}
                  className={inputClassName}
                />
              </label>
              <label className={labelClassName}>
                Inicio
                <input
                  type="date"
                  value={noveltyForm.start_date}
                  onChange={(event) => onChangeNovelty({ ...noveltyForm, start_date: event.target.value })}
                  className={inputClassName}
                />
              </label>
              <label className={labelClassName}>
                Fin
                <input
                  type="date"
                  value={noveltyForm.end_date}
                  onChange={(event) => onChangeNovelty({ ...noveltyForm, end_date: event.target.value })}
                  className={inputClassName}
                />
              </label>
              <label className={labelClassName}>
                Impacto IBC
                <input
                  type="number"
                  step="0.01"
                  value={noveltyForm.ibc_impact_amount}
                  onChange={(event) => onChangeNovelty({ ...noveltyForm, ibc_impact_amount: Number(event.target.value) })}
                  className={inputClassName}
                />
              </label>
              <Button
                type="button"
                onClick={onCreateNovelty}
                disabled={isSaving || !noveltyForm.start_date}
                className="mt-auto h-10 rounded-lg bg-[#59C3A5] px-4 text-sm font-bold text-white hover:bg-[#102d63]"
              >
                Agregar
              </Button>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>IBC</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {novelties.length > 0 ? novelties.map((novelty) => (
                    <TableRow key={novelty.id}>
                      <TableCell className="font-bold text-slate-900 dark:text-white">{novelty.novelty_code}</TableCell>
                      <TableCell>{novelty.start_date}{novelty.end_date ? ` → ${novelty.end_date}` : ''}</TableCell>
                      <TableCell>{novelty.ibc_impact_amount}</TableCell>
                      <TableCell>{novelty.status}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm font-semibold text-slate-500">
                        Sin novedades registradas en este periodo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>

        <DialogFooter className="shrink-0 border-t border-white/15 bg-[#59C3A5] px-6 py-4 text-white">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-white">Los cambios aplican al siguiente cálculo backend.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
                className="h-10 rounded-lg border-white/30 bg-transparent px-4 text-sm font-bold text-white hover:bg-white/10 hover:text-white"
              >
                Cerrar
              </Button>
              <Button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="h-10 rounded-lg bg-white px-5 text-sm font-black text-[#177d66] hover:bg-slate-50"
              >
                {isSaving ? 'Guardando...' : 'Guardar Colombia'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const reportingIssues = (snapshot: PayrollGovernmentReportingSnapshot) => {
  const issues = snapshot.validation?.issues;
  return Array.isArray(issues) ? issues : [];
};

const reportingReady = (snapshot: PayrollGovernmentReportingSnapshot) => (
  snapshot.response?.readyForTransmission === true
);

function PayrollGovernmentReportingDialog({
  detail,
  locale,
  onClose,
}: {
  detail: PayrollGovernmentReportingSnapshotsResponse | null;
  locale: string;
  onClose: () => void;
}) {
  const items = detail?.items ?? [];

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="z-[140] !flex h-[min(88vh,900px)] max-h-[calc(100vh-2rem)] max-w-[1040px] flex-col gap-0 overflow-hidden rounded-lg border border-[#59C3A5]/25 bg-white p-0 shadow-[0_28px_80px_rgba(15,23,42,0.26)] dark:border-[#59C3A5]/30 dark:bg-slate-900 [&>button]:hidden">
        <DialogHeader className="shrink-0 bg-[#59C3A5] px-6 py-5 text-left text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                <Landmark className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-xl font-bold leading-tight text-white">
                  PILA / DIAN
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-6 text-blue-100">
                  {detail
                    ? `Corrida #${detail.run.id} · ${formatDate(detail.run.period_start_date, locale, detail.run.period_start_date)} → ${formatDate(detail.run.period_end_date, locale, detail.run.period_end_date)}`
                    : 'Snapshots gubernamentales'}
                </DialogDescription>
              </div>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-9 rounded-lg p-0 text-white hover:bg-white/15 hover:text-white"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950">
          {items.length > 0 ? (
            <div className="grid gap-4">
              {items.map((snapshot) => {
                const issues = reportingIssues(snapshot);
                const blocking = snapshot.validation?.blocking === true;
                return (
                  <section
                    key={snapshot.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[#59C3A5]/25 bg-[#59C3A5]/10 px-3 py-1 text-xs font-black text-[#177d66] dark:border-[#59C3A5]/40 dark:bg-[#59C3A5]/15 dark:text-emerald-200">
                            {snapshot.report_type}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {snapshot.status}
                          </span>
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${blocking
                            ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                          }`}
                          >
                            {blocking ? 'Bloqueante' : 'Validado'}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                          Línea #{snapshot.run_line_id} · Colaborador #{snapshot.user_company_id}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          Hash: {snapshot.payload_hash || 'Sin hash'} · {snapshot.generated_at || 'Sin fecha'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${reportingReady(snapshot)
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                          : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
                        }`}
                        >
                          {reportingReady(snapshot) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                          {reportingReady(snapshot) ? 'Listo' : 'Revisar'}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {issues.length} alertas
                        </span>
                      </div>
                    </div>

                    {issues.length > 0 ? (
                      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                        {issues.slice(0, 4).map((issue, index) => (
                          <p key={`${snapshot.id}-issue-${index}`}>
                            {typeof issue === 'object' && issue !== null && 'message' in issue
                              ? String((issue as { message?: unknown }).message)
                              : String(issue)}
                          </p>
                        ))}
                      </div>
                    ) : null}

                    <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
                      <summary className="cursor-pointer px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Payload
                      </summary>
                      <pre className="max-h-72 overflow-auto border-t border-slate-200 p-3 text-xs leading-5 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                        {JSON.stringify(snapshot.payload, null, 2)}
                      </pre>
                    </details>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              No hay snapshots PILA / DIAN para esta corrida.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
