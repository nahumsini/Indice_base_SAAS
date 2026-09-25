import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  BriefcaseBusiness,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  IdCard,
  Laptop,
  LayoutGrid,
  ChartNoAxesCombined,
  Printer,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardApi, type BackendBusiness, type BackendUnit } from '../../../api/dashboard';
import { hrAssetsApi, type HrAsset } from '../../../api/HumanResources/assets';
import {
  permissionsApi,
  type BackendPermissionItem,
} from '../../../api/HumanResources/permissions';
import {
  humanResourcesApi,
  type AttendanceControlAssignment,
  type AttendanceControlOverviewResponse,
  type BackendHrUser,
  type BackendRecordItem,
} from '../../../api/humanResources';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { cn } from '../../../components/ui/utils';
import {
  IndiceFilterAdvancedSection,
  IndiceFilterBar,
  IndiceFilterDisclosureActions,
  IndiceFilterField,
  IndiceFilterSearch,
  IndiceFilterSelect,
  IndiceWorkspaceNavigation,
  getIndiceFilterControlClassName,
  useIndiceFilterDisclosureCopy,
} from '../../../components/frontend-os';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import { useLanguage } from '../../../shared/context';
import { formatBusinessCurrencyAmount } from '../../shared/businessCurrency';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { useKpiMonetaryAggregate } from '../../shared/kpiMonetaryApi';
import { useCompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import { useKPIsTranslations } from './hooks/useKPIsTranslations';
import { HrTitleBar, hrTitleBarPrimaryActionClass, hrTitleBarSecondaryActionClass } from '../shared/HrTitleBar';
import type { KPIsTranslations } from './translations';
import { printKpisReport } from './utils/kpisPrintReport';
import { HrEmployeeOperationsTable, type HrEmployeeOperationsRow } from './components/HrEmployeeOperationsTable';
import { getHrKpiStandardCopy } from './translations/standardUiCopy';
import { getHrKpiWorkspaceCopy, resolveHrKpiView, type HrKpiView } from './translations/workspaceCopy';
import {
  assetMatchesHrScope,
  isCriticalOpenHrRecord,
  isOpenHrRecord,
  measureHrAssets,
  measureHrAttendance,
  measureHrRecords,
  type HrKpiSignalStatus,
} from './hrKpiMeasurements';
import { loadCompleteHrCollection } from './hrKpiSourceLoader';

type PeriodFilter = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'annualized' | 'specificDate';
type HrKpiSourceKey = 'employees' | 'attendance' | 'assets' | 'permissions' | 'records';
type HrKpiSourceAvailability = Record<HrKpiSourceKey, boolean>;

type HrKpiWorkspaceState = {
  activeView: HrKpiView;
  searchQuery: string;
  selectedDate: string;
  periodFilter: PeriodFilter;
  unitFilter: string;
  businessFilter: string;
  departmentFilter: string;
  attendanceStatusFilter: string;
};

type HrKpiWorkspaceState = {
  searchQuery: string;
  selectedDate: string;
  periodFilter: PeriodFilter;
  unitFilter: string;
  businessFilter: string;
  departmentFilter: string;
  attendanceStatusFilter: string;
};

interface KpiCardModel {
  id: string;
  title: string;
  value: string;
  target: string;
  description: string;
  status: HrKpiSignalStatus;
  icon: ReactNode;
}

interface UnitSummaryRow {
  id: string;
  name: string;
  employees: number;
  attendanceRate: number | null;
  pendingPermissions: number;
  unresolvedRecords: number;
  criticalRecords: number;
  assignedAssets: number;
  attentionSignals: number;
  criticalSignals: number;
}

interface AttentionSignalRow {
  id: string;
  employee: string;
  position: string;
  unit: string;
  signals: string[];
  status: HrKpiSignalStatus;
}

const allValue = 'all';
const moduleAccent = '#55c3a7';
const todayIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toIsoDate = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseIsoDate = (value: string) => {
  const [yearText, monthText, dayText] = value.split('-');
  const parsed = new Date(Number(yearText), Number(monthText) - 1, Number(dayText || '1'));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const addMonthsClamped = (value: string, offset: number) => {
  const base = parseIsoDate(value);
  const day = base.getDate();
  const target = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toIsoDate(target);
};

const addDays = (value: string, offset: number) => {
  const date = parseIsoDate(value);
  date.setDate(date.getDate() + offset);
  return toIsoDate(date);
};

const effectiveControlDateForPeriod = (period: PeriodFilter, selectedDate: string) =>
  period === 'lastMonth' ? addMonthsClamped(selectedDate, -1) : selectedDate;

const periodRangeFor = (period: PeriodFilter, selectedDate: string) => {
  const effectiveDate = parseIsoDate(effectiveControlDateForPeriod(period, selectedDate));
  const year = effectiveDate.getFullYear();
  const month = effectiveDate.getMonth();

  if (period === 'specificDate') {
    return { start: toIsoDate(effectiveDate), end: toIsoDate(effectiveDate) };
  }

  if (period === 'thisQuarter') {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    return {
      start: toIsoDate(new Date(year, quarterStartMonth, 1)),
      end: toIsoDate(new Date(year, quarterStartMonth + 3, 0)),
    };
  }

  if (period === 'annualized') {
    return {
      start: toIsoDate(new Date(year, 0, 1)),
      end: toIsoDate(new Date(year, 11, 31)),
    };
  }

  return {
    start: toIsoDate(new Date(year, month, 1)),
    end: toIsoDate(new Date(year, month + 1, 0)),
  };
};

const statusClasses: Record<HrKpiSignalStatus, string> = {
  healthy:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  watch:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  critical:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300',
  unavailable:
    'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300',
};

const pieColors = ['#10b981', '#f59e0b', '#0ea5e9', '#64748b', '#e11d48', '#94a3b8'];

function sourceWarning(fallback: string) {
  return fallback;
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatPercent(value: number | null, copy: KPIsTranslations) {
  if (value === null || Number.isNaN(value)) {
    return copy.dashboard.common.notAvailable;
  }

  return `${Math.round(value)}%`;
}

function formatDateLabel(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parseIsoDate(date));
}

function formatComparison(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) {
    return '—';
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return `${change >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(change))}%`;
}

function isActiveEmployee(employee: BackendHrUser) {
  return String(employee.status ?? '').trim().toLowerCase() === 'active';
}

function getEmployeeDisplayName(employee: BackendHrUser) {
  return employee.full_name || `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim() || employee.email;
}

function includesText(value: string, searchQuery: string) {
  return value.toLowerCase().includes(searchQuery.trim().toLowerCase());
}

function getDateFromPermission(permission: BackendPermissionItem) {
  return permission.startDate || permission.createdAt || permission.updatedAt || '';
}

function getDateFromRecord(record: BackendRecordItem) {
  return record.event_date || record.created_at || record.updated_at || '';
}

function isDateInPeriod(dateValue: string, period: PeriodFilter, anchorDate: string) {
  if (!dateValue) {
    return false;
  }

  const normalizedDate = dateValue.slice(0, 10);
  const { start, end } = periodRangeFor(period, anchorDate);

  return normalizedDate >= start && normalizedDate <= end;
}

function isPermissionInPeriod(permission: BackendPermissionItem, period: PeriodFilter, anchorDate: string) {
  const { start, end } = periodRangeFor(period, anchorDate);
  const permissionStart = (permission.startDate || getDateFromPermission(permission)).slice(0, 10);
  const permissionEnd = (permission.endDate || permissionStart).slice(0, 10);

  if (!permissionStart) {
    return false;
  }

  return permissionStart <= end && permissionEnd >= start;
}

function employeeMatchesFilters(
  employee: BackendHrUser,
  filters: {
    searchQuery: string;
    unitFilter: string;
    businessFilter: string;
    departmentFilter: string;
  },
) {
  const haystack = [
    employee.full_name,
    employee.user_code,
    employee.email,
    employee.position_title,
    employee.position,
    employee.department,
    employee.unit_name,
    employee.business_name,
  ].join(' ');

  return (
    includesText(haystack, filters.searchQuery) &&
    (filters.unitFilter === allValue || String(employee.unit_id ?? '') === filters.unitFilter) &&
    (filters.businessFilter === allValue || String(employee.business_id ?? '') === filters.businessFilter) &&
    (filters.departmentFilter === allValue || (employee.department || '') === filters.departmentFilter)
  );
}

function assignmentMatchesFilters(
  assignment: AttendanceControlAssignment,
  employeeIds: Set<number>,
  filters: {
    searchQuery: string;
    unitFilter: string;
    businessFilter: string;
    departmentFilter: string;
  },
) {
  const haystack = [
    assignment.user_name,
    assignment.user_code,
    assignment.position_title,
    assignment.department,
    assignment.unit_name,
    assignment.business_name,
  ].join(' ');
  const matchesEmployeeScope = employeeIds.has(assignment.user_company_id);

  return (
    matchesEmployeeScope &&
    includesText(haystack, filters.searchQuery) &&
    (filters.unitFilter === allValue || String(assignment.unit_id ?? '') === filters.unitFilter) &&
    (filters.businessFilter === allValue || String(assignment.business_id ?? '') === filters.businessFilter) &&
    (filters.departmentFilter === allValue || (assignment.department || '') === filters.departmentFilter)
  );
}

function buildUniqueOptions<T extends { id: number; name: string }>(
  baseOptions: T[],
  employeeOptions: Array<{ id?: number | null; name?: string | null }>,
) {
  const map = new Map<string, string>();

  baseOptions.forEach((option) => {
    if (option.id && option.name) {
      map.set(String(option.id), option.name);
    }
  });

  employeeOptions.forEach((option) => {
    if (option.id && option.name) {
      map.set(String(option.id), option.name);
    }
  });

  return Array.from(map.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function KpiStatusBadge({ copy, status }: { copy: KPIsTranslations; status: HrKpiSignalStatus }) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-medium', statusClasses[status])}>
      {copy.dashboard.statuses[status]}
    </span>
  );
}

function KpiCard({ card, copy }: { card: KpiCardModel; copy: KPIsTranslations }) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800">
            {card.icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{card.title}</p>
            <p className="mt-2 text-3xl font-medium text-slate-900 dark:text-white">{card.value}</p>
          </div>
        </div>
        <KpiStatusBadge copy={copy} status={card.status} />
      </div>
      <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">{card.target}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{card.description}</p>
    </article>
  );
}

export default function KPIs() {
  const copy = useKPIsTranslations();
  const { currentLanguage } = useLanguage();
  const standardCopy = getHrKpiStandardCopy(currentLanguage.code);
  const workspaceCopy = getHrKpiWorkspaceCopy(currentLanguage.code);
  const disclosureCopy = useIndiceFilterDisclosureCopy();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const { identity: companyPrintIdentity, isReady: isCompanyPrintIdentityReady } = useCompanyPrintIdentity();
  const [employees, setEmployees] = useState<BackendHrUser[]>([]);
  const [attendanceOverview, setAttendanceOverview] = useState<AttendanceControlOverviewResponse | null>(null);
  const [previousAttendanceOverview, setPreviousAttendanceOverview] = useState<AttendanceControlOverviewResponse | null>(null);
  const [assets, setAssets] = useState<HrAsset[]>([]);
  const [permissions, setPermissions] = useState<BackendPermissionItem[]>([]);
  const [records, setRecords] = useState<BackendRecordItem[]>([]);
  const [units, setUnits] = useState<BackendUnit[]>([]);
  const [businesses, setBusinesses] = useState<BackendBusiness[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayIsoDate());
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('thisMonth');
  const [unitFilter, setUnitFilter] = useState(allValue);
  const [businessFilter, setBusinessFilter] = useState(allValue);
  const [departmentFilter, setDepartmentFilter] = useState(allValue);
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState(allValue);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<HrKpiView>('overview');
  const [showAllAttention, setShowAllAttention] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sourceWarnings, setSourceWarnings] = useState<string[]>([]);
  const [sourceAvailability, setSourceAvailability] = useState<HrKpiSourceAvailability>({
    employees: false,
    attendance: false,
    assets: false,
    permissions: false,
    records: false,
  });
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const loadRequestRef = useRef(0);
  const mountedRef = useRef(true);
  const workspaceDefaults = useMemo<HrKpiWorkspaceState>(() => ({
    activeView: 'overview',
    searchQuery: '',
    selectedDate: todayIsoDate(),
    periodFilter: 'thisMonth',
    unitFilter: allValue,
    businessFilter: allValue,
    departmentFilter: allValue,
    attendanceStatusFilter: allValue,
  }), []);
  const workspaceState = useMemo<HrKpiWorkspaceState>(() => ({
    activeView,
    searchQuery,
    selectedDate,
    periodFilter,
    unitFilter,
    businessFilter,
    departmentFilter,
    attendanceStatusFilter,
  }), [activeView, attendanceStatusFilter, businessFilter, departmentFilter, periodFilter, searchQuery, selectedDate, unitFilter]);

  useWorkspaceNavigationMemory({
    moduleKey: 'human-resources',
    tabKey: 'kpis',
    state: workspaceState,
    defaults: workspaceDefaults,
    urlFields: {
      activeView: 'view',
      searchQuery: 'q',
      selectedDate: 'date',
      periodFilter: 'period',
      unitFilter: 'unit',
      businessFilter: 'business',
      departmentFilter: 'department',
      attendanceStatusFilter: 'status',
    },
    onRestore: (restoredState) => {
      setActiveView(resolveHrKpiView(restoredState.activeView));
      setSearchQuery(typeof restoredState.searchQuery === 'string' ? restoredState.searchQuery : '');
      setSelectedDate(/^\d{4}-\d{2}-\d{2}$/.test(restoredState.selectedDate) ? restoredState.selectedDate : workspaceDefaults.selectedDate);
      setPeriodFilter(['thisMonth', 'lastMonth', 'thisQuarter', 'annualized', 'specificDate'].includes(restoredState.periodFilter) ? restoredState.periodFilter : 'thisMonth');
      setUnitFilter(typeof restoredState.unitFilter === 'string' ? restoredState.unitFilter : allValue);
      setBusinessFilter(typeof restoredState.businessFilter === 'string' ? restoredState.businessFilter : allValue);
      setDepartmentFilter(typeof restoredState.departmentFilter === 'string' ? restoredState.departmentFilter : allValue);
      setAttendanceStatusFilter(typeof restoredState.attendanceStatusFilter === 'string' ? restoredState.attendanceStatusFilter : allValue);
    },
  });

  const filters = useMemo(
    () => ({ searchQuery, unitFilter, businessFilter, departmentFilter }),
    [businessFilter, departmentFilter, searchQuery, unitFilter],
  );

  const controlDate = selectedDate;
  const previousControlDate = useMemo(() => addDays(selectedDate, -7), [selectedDate]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadDashboard = async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setIsLoading(true);

    const results = await runWithMinimumDuration(Promise.allSettled([
      humanResourcesApi.listHrUsers(),
      humanResourcesApi.getAttendanceControlOverview(controlDate),
      humanResourcesApi.getAttendanceControlOverview(previousControlDate),
      loadCompleteHrCollection<HrAsset, Awaited<ReturnType<typeof hrAssetsApi.listAssets>>>({
        fetchPage: (page, size) => hrAssetsApi.listAssets({ page, size }),
        itemKey: (asset) => asset.id,
        pageSize: 100,
      }),
      loadCompleteHrCollection<BackendPermissionItem, Awaited<ReturnType<typeof permissionsApi.listPermissions>>>({
        fetchPage: (page, size) => permissionsApi.listPermissions({ page, size }),
        itemKey: (permission) => permission.id,
        pageSize: 200,
      }),
      loadCompleteHrCollection<BackendRecordItem, Awaited<ReturnType<typeof humanResourcesApi.listRecords>>>({
        fetchPage: (page, size) => humanResourcesApi.listRecords({ page, size }),
        itemKey: (record) => record.id,
        pageSize: 200,
      }),
      dashboardApi.listUnits(),
      dashboardApi.listBusinesses(),
    ]));

    if (!mountedRef.current || requestId !== loadRequestRef.current) {
      return;
    }

    const warnings: string[] = [];
    const [
      employeesResult,
      attendanceResult,
      previousAttendanceResult,
      assetsResult,
      permissionsResult,
      recordsResult,
      unitsResult,
      businessesResult,
    ] = results;

    if (employeesResult.status === 'fulfilled') {
      setEmployees(employeesResult.value.items);
    } else {
      warnings.push(sourceWarning(copy.dashboard.errors.employees));
      setEmployees([]);
    }

    if (attendanceResult.status === 'fulfilled') {
      setAttendanceOverview(attendanceResult.value);
    } else {
      warnings.push(sourceWarning(copy.dashboard.errors.attendance));
      setAttendanceOverview(null);
    }

    if (previousAttendanceResult.status === 'fulfilled') {
      setPreviousAttendanceOverview(previousAttendanceResult.value);
    } else {
      warnings.push(`${sourceWarning(copy.dashboard.errors.attendance)} (${previousControlDate})`);
      setPreviousAttendanceOverview(null);
    }

    if (assetsResult.status === 'fulfilled') {
      setAssets(assetsResult.value.items);
    } else {
      warnings.push(sourceWarning(copy.dashboard.errors.assets));
      setAssets([]);
    }

    if (permissionsResult.status === 'fulfilled') {
      setPermissions(permissionsResult.value.items);
    } else {
      warnings.push(sourceWarning(copy.dashboard.errors.permissions));
      setPermissions([]);
    }

    if (recordsResult.status === 'fulfilled') {
      setRecords(recordsResult.value.items);
    } else {
      warnings.push(sourceWarning(copy.dashboard.errors.records));
      setRecords([]);
    }

    setUnits(unitsResult.status === 'fulfilled' ? unitsResult.value : []);
    setBusinesses(businessesResult.status === 'fulfilled' ? businessesResult.value : []);
    setSourceAvailability({
      employees: employeesResult.status === 'fulfilled',
      attendance: attendanceResult.status === 'fulfilled',
      assets: assetsResult.status === 'fulfilled',
      permissions: permissionsResult.status === 'fulfilled',
      records: recordsResult.status === 'fulfilled',
    });
    setSourceWarnings(warnings);
    setLastUpdatedAt(new Date().toISOString());
    setIsLoading(false);
  };

  useEffect(() => {
    void loadDashboard();
  }, [controlDate, previousControlDate]);

  const scopedEmployees = useMemo(
    () => employees.filter((employee) => employeeMatchesFilters(employee, filters)),
    [employees, filters],
  );

  const baseActiveEmployees = useMemo(
    () => scopedEmployees.filter(isActiveEmployee),
    [scopedEmployees],
  );

  const filteredEmployees = useMemo(() => {
    if (attendanceStatusFilter === allValue) return baseActiveEmployees;
    const matchingIds = new Set((attendanceOverview?.assignments ?? [])
      .filter(assignment => assignment.today_status === attendanceStatusFilter)
      .map(assignment => assignment.user_company_id));
    return baseActiveEmployees.filter(employee => matchingIds.has(employee.id));
  }, [attendanceOverview?.assignments, attendanceStatusFilter, baseActiveEmployees]);

  const filteredEmployeeIds = useMemo(
    () => new Set(filteredEmployees.map((employee) => employee.id)),
    [filteredEmployees],
  );

  const filteredEmployeeNames = useMemo(
    () => new Set(filteredEmployees.map((employee) => getEmployeeDisplayName(employee).toLowerCase())),
    [filteredEmployees],
  );

  const unitOptions = useMemo(
    () =>
      buildUniqueOptions(
        units,
        employees.map((employee) => ({ id: employee.unit_id, name: employee.unit_name })),
      ),
    [employees, units],
  );

  const businessOptions = useMemo(
    () =>
      buildUniqueOptions(
        businesses,
        employees
          .filter((employee) => unitFilter === allValue || String(employee.unit_id ?? '') === unitFilter)
          .map((employee) => ({ id: employee.business_id, name: employee.business_name })),
      ),
    [businesses, employees, unitFilter],
  );

  const departmentOptions = useMemo(
    () =>
      Array.from(new Set(employees.map((employee) => employee.department).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b),
      ),
    [employees],
  );

  const filteredAssignments = useMemo(
    () =>
      (attendanceOverview?.assignments ?? []).filter((assignment) =>
        assignmentMatchesFilters(assignment, filteredEmployeeIds, filters)
        && (attendanceStatusFilter === allValue || assignment.today_status === attendanceStatusFilter),
      ),
    [attendanceOverview?.assignments, attendanceStatusFilter, filteredEmployeeIds, filters],
  );

  const previousFilteredAssignments = useMemo(
    () => (previousAttendanceOverview?.assignments ?? []).filter((assignment) =>
      assignmentMatchesFilters(assignment, filteredEmployeeIds, filters)
      && (attendanceStatusFilter === allValue || assignment.today_status === attendanceStatusFilter)),
    [attendanceStatusFilter, filteredEmployeeIds, filters, previousAttendanceOverview?.assignments],
  );

  const filteredPermissions = useMemo(
    () =>
      permissions.filter((permission) => {
        const employeeId = permission.employee.id;
        const employeeName = permission.employee.name.toLowerCase();
        const matchesEmployee =
          (employeeId ? filteredEmployeeIds.has(employeeId) : filteredEmployeeNames.has(employeeName));
        const haystack = [permission.folio, permission.employee.name, permission.employee.position, permission.employee.department, permission.reason]
          .join(' ');

        return (
          matchesEmployee &&
          includesText(haystack, searchQuery) &&
          isPermissionInPeriod(permission, periodFilter, selectedDate)
        );
      }),
    [filteredEmployeeIds, filteredEmployeeNames, permissions, periodFilter, searchQuery, selectedDate],
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const matchesEmployee = filteredEmployeeIds.has(record.user.id);
        const haystack = [
          record.record_number,
          record.user.name,
          record.user.position,
          record.user.department,
          record.unit?.name,
          record.business?.name,
          record.title,
          record.description,
        ].join(' ');

        return (
          matchesEmployee &&
          includesText(haystack, searchQuery) &&
          isDateInPeriod(getDateFromRecord(record), periodFilter, selectedDate)
        );
      }),
    [filteredEmployeeIds, periodFilter, records, searchQuery, selectedDate],
  );

  const filteredAssets = useMemo(
    () =>
      assets.filter((asset) => {
        const haystack = [asset.asset_code, asset.asset_type, asset.name, asset.model, asset.serial_number, asset.responsible_name, asset.unit_name]
          .join(' ');

        return (
          includesText(haystack, searchQuery) &&
          assetMatchesHrScope({ asset, businessFilter, departmentFilter, employeeIds: filteredEmployeeIds, unitFilter })
        );
      }),
    [assets, businessFilter, departmentFilter, filteredEmployeeIds, searchQuery, unitFilter],
  );

  const attendanceSummary = useMemo(
    () => measureHrAttendance(filteredAssignments),
    [filteredAssignments],
  );

  const previousAttendanceSummary = useMemo(
    () => measureHrAttendance(previousFilteredAssignments),
    [previousFilteredAssignments],
  );

  const permissionCounts = useMemo(
    () => ({
      total: filteredPermissions.length,
      pending: filteredPermissions.filter((permission) => permission.status === 'pending').length,
      approved: filteredPermissions.filter((permission) => permission.status === 'approved').length,
      rejected: filteredPermissions.filter((permission) => permission.status === 'rejected').length,
    }),
    [filteredPermissions],
  );
  const recordCounts = useMemo(() => measureHrRecords(filteredRecords), [filteredRecords]);

  const assetCounts = useMemo(
    () => measureHrAssets(filteredAssets, filteredEmployeeIds),
    [filteredAssets, filteredEmployeeIds],
  );

  const assetValueAggregate = useKpiMonetaryAggregate({
    metric: 'HR_ASSET_VALUE',
    preferredCurrency,
    ids: filteredAssets.map((asset) => asset.id),
  });
  const assetValueSummary = useMemo(() => {
    return {
      nativeBreakdownLabel: assetValueAggregate.data?.nativeTotals
        .map(({ amount, currency }) => formatBusinessCurrencyAmount(amount, currency, { maximumFractionDigits: 0 })).join(' / ')
        || copy.dashboard.common.notAvailable,
      preferredTotalLabel: assetValueAggregate.data && !assetValueAggregate.loading
        ? formatBusinessCurrencyAmount(assetValueAggregate.data.preferredTotal, preferredCurrency, {
        maximumFractionDigits: 0,
      }) : copy.dashboard.common.notAvailable,
    };
  }, [assetValueAggregate.data, assetValueAggregate.loading, copy.dashboard.common.notAvailable, preferredCurrency]);

  const displaySourceWarnings = useMemo(
    () => assetValueAggregate.error && sourceAvailability.assets
      ? [...sourceWarnings, sourceWarning(copy.dashboard.errors.assetValue)]
      : sourceWarnings,
    [assetValueAggregate.error, copy.dashboard.errors.assetValue, sourceAvailability.assets, sourceWarnings],
  );

  const employeeScopeAvailable = sourceAvailability.employees
    && (attendanceStatusFilter === allValue || sourceAvailability.attendance);
  const attendanceAvailable = employeeScopeAvailable && sourceAvailability.attendance;
  const permissionsAvailable = employeeScopeAvailable && sourceAvailability.permissions;
  const recordsAvailable = employeeScopeAvailable && sourceAvailability.records;
  const assetsAvailable = employeeScopeAvailable && sourceAvailability.assets;
  const unitSourcesAvailable = attendanceAvailable && permissionsAvailable && recordsAvailable && assetsAvailable;
  const unavailableValue = copy.dashboard.common.notAvailable;
  const statusFor = (
    available: boolean,
    availableStatus: HrKpiSignalStatus = 'healthy',
  ): HrKpiSignalStatus => (available ? availableStatus : 'unavailable');

  const kpiCards = useMemo<KpiCardModel[]>(
    () => [
      {
        id: 'workforce',
        title: copy.dashboard.cards.workforce.title,
        value: employeeScopeAvailable
          ? formatNumber(filteredEmployees.length, currentLanguage.code)
          : unavailableValue,
        target: copy.dashboard.cards.workforce.target(
          employeeScopeAvailable
            ? formatNumber(scopedEmployees.length, currentLanguage.code)
            : unavailableValue,
        ),
        description: copy.dashboard.cards.workforce.description,
        status: statusFor(employeeScopeAvailable),
        icon: <Users className="h-5 w-5" />,
      },
      {
        id: 'attendance',
        title: copy.dashboard.cards.attendance.title,
        value: attendanceAvailable ? formatPercent(attendanceSummary.attendanceRate, copy) : unavailableValue,
        target: attendanceAvailable
          ? `${copy.dashboard.cards.attendance.target(attendanceSummary.present, attendanceSummary.completedSample)} · ${formatComparison(attendanceSummary.attendanceRate, previousAttendanceSummary.attendanceRate)}`
          : unavailableValue,
        description: copy.dashboard.cards.attendance.description,
        status: statusFor(attendanceAvailable && attendanceSummary.attendanceRate !== null),
        icon: <CalendarCheck2 className="h-5 w-5" />,
      },
      {
        id: 'punctuality',
        title: copy.cards.punctuality,
        value: attendanceAvailable ? formatPercent(attendanceSummary.punctualityRate, copy) : unavailableValue,
        target: attendanceAvailable
          ? `${attendanceSummary.onTime}/${attendanceSummary.present} · ${formatComparison(attendanceSummary.punctualityRate, previousAttendanceSummary.punctualityRate)}`
          : unavailableValue,
        description: copy.dashboard.cards.attendance.description,
        status: statusFor(attendanceAvailable && attendanceSummary.punctualityRate !== null),
        icon: <CalendarCheck2 className="h-5 w-5" />,
      },
      {
        id: 'late',
        title: copy.dashboard.cards.late.title,
        value: attendanceAvailable
          ? formatNumber(attendanceSummary.late + attendanceSummary.absence, currentLanguage.code)
          : unavailableValue,
        target: attendanceAvailable
          ? copy.dashboard.cards.late.target(attendanceSummary.absence, attendanceSummary.pending)
          : unavailableValue,
        description: copy.dashboard.cards.late.description,
        status: statusFor(
          attendanceAvailable,
          attendanceSummary.absence > 0
            ? 'critical'
            : attendanceSummary.late > 0
              ? 'watch'
              : 'healthy',
        ),
        icon: <Activity className="h-5 w-5" />,
      },
      {
        id: 'permissions',
        title: copy.dashboard.cards.permissions.title,
        value: permissionsAvailable
          ? formatNumber(permissionCounts.pending, currentLanguage.code)
          : unavailableValue,
        target: permissionsAvailable
          ? copy.dashboard.cards.permissions.target(permissionCounts.total)
          : unavailableValue,
        description: copy.dashboard.cards.permissions.description,
        status: statusFor(permissionsAvailable, permissionCounts.pending > 0 ? 'watch' : 'healthy'),
        icon: <ClipboardList className="h-5 w-5" />,
      },
      {
        id: 'assets',
        title: copy.dashboard.cards.assets.title,
        value: assetsAvailable
          ? formatNumber(assetCounts.assignedPeople, currentLanguage.code)
          : unavailableValue,
        target: assetsAvailable
          ? copy.dashboard.cards.assets.target(assetCounts.assignedItems, assetCounts.maintenance)
          : unavailableValue,
        description: copy.dashboard.cards.assets.description,
        status: statusFor(assetsAvailable, assetCounts.maintenance > 0 ? 'watch' : 'healthy'),
        icon: <Laptop className="h-5 w-5" />,
      },
      {
        id: 'records',
        title: copy.dashboard.cards.records.title,
        value: recordsAvailable ? formatNumber(recordCounts.open, currentLanguage.code) : unavailableValue,
        target: recordsAvailable
          ? `${copy.dashboard.cards.records.target(recordCounts.total)} · ${recordCounts.criticalOpen} ${copy.dashboard.statuses.critical}`
          : unavailableValue,
        description: copy.dashboard.cards.records.description,
        status: statusFor(
          recordsAvailable,
          recordCounts.criticalOpen > 0 ? 'critical' : recordCounts.open > 0 ? 'watch' : 'healthy',
        ),
        icon: <FileWarning className="h-5 w-5" />,
      },
      {
        id: 'health',
        title: copy.dashboard.cards.health.title,
        value: attendanceAvailable
          ? formatNumber(attendanceSummary.unconfigured, currentLanguage.code)
          : unavailableValue,
        target: attendanceAvailable
          ? `${copy.dashboard.cards.health.target} · ${attendanceSummary.pending} ${copy.dashboard.labels.pending}`
          : unavailableValue,
        description: copy.dashboard.cards.health.description,
        status: statusFor(attendanceAvailable, attendanceSummary.unconfigured > 0 ? 'watch' : 'healthy'),
        icon: <ShieldCheck className="h-5 w-5" />,
      },
    ],
    [
      assetCounts.assignedItems,
      assetCounts.assignedPeople,
      assetCounts.maintenance,
      assetsAvailable,
      attendanceSummary.absence,
      attendanceSummary.attendanceRate,
      attendanceSummary.completedSample,
      attendanceSummary.late,
      attendanceSummary.onTime,
      attendanceSummary.pending,
      attendanceSummary.present,
      attendanceSummary.punctualityRate,
      attendanceSummary.unconfigured,
      attendanceAvailable,
      copy,
      currentLanguage.code,
      employeeScopeAvailable,
      filteredEmployees.length,
      permissionCounts.pending,
      permissionCounts.total,
      permissionsAvailable,
      previousAttendanceSummary.attendanceRate,
      previousAttendanceSummary.punctualityRate,
      recordCounts.criticalOpen,
      recordCounts.open,
      recordCounts.total,
      recordsAvailable,
      scopedEmployees.length,
      unavailableValue,
    ],
  );

  const attendanceChartData = useMemo(
    () => [
      { name: copy.dashboard.labels.onTime, value: attendanceSummary.onTime },
      { name: copy.dashboard.labels.late, value: attendanceSummary.late },
      { name: copy.dashboard.labels.leave, value: attendanceSummary.leave },
      { name: copy.dashboard.labels.rest, value: attendanceSummary.rest },
      { name: copy.dashboard.labels.absence, value: attendanceSummary.absence },
      { name: copy.dashboard.labels.pending, value: attendanceSummary.pending },
      { name: copy.dashboard.signals.noAttendanceSetup, value: attendanceSummary.unconfigured },
    ].filter((item) => item.value > 0),
    [attendanceSummary, copy.dashboard.labels],
  );

  const unitRows = useMemo<UnitSummaryRow[]>(() => {
    const activeByUnit = new Map<string, BackendHrUser[]>();

    filteredEmployees.forEach((employee) => {
      const key = String(employee.unit_id ?? 'none');
      const next = activeByUnit.get(key) ?? [];
      next.push(employee);
      activeByUnit.set(key, next);
    });

    return Array.from(activeByUnit.entries())
      .map(([unitId, unitEmployees]) => {
        const unitName = unitEmployees[0]?.unit_name || copy.dashboard.labels.noUnit;
        const unitEmployeeIds = new Set(unitEmployees.map((employee) => employee.id));
        const unitAssignments = filteredAssignments.filter((assignment) => unitEmployeeIds.has(assignment.user_company_id));
        const unitAttendance = measureHrAttendance(unitAssignments);
        const unitPermissions = filteredPermissions.filter((permission) =>
          permission.employee.id ? unitEmployeeIds.has(permission.employee.id) : false,
        );
        const unitRecords = filteredRecords.filter((record) => unitEmployeeIds.has(record.user.id));
        const unitAssets = filteredAssets.filter((asset) =>
          asset.responsible_user_company_id ? unitEmployeeIds.has(asset.responsible_user_company_id) : String(asset.unit_id ?? '') === unitId,
        );
        const pendingPermissions = unitPermissions.filter((permission) => permission.status === 'pending').length;
        const unitRecordMeasurements = measureHrRecords(unitRecords);
        const assignedAssets = unitAssets.filter((asset) => asset.status === 'assigned' || asset.status === 'custody').length;
        const maintenanceAssets = unitAssets.filter((asset) => asset.status === 'maintenance').length;
        const attentionSignals = unitAttendance.late
          + unitAttendance.absence
          + unitAttendance.unconfigured
          + pendingPermissions
          + unitRecordMeasurements.open
          + maintenanceAssets;

        return {
          id: unitId,
          name: unitName,
          employees: unitEmployees.length,
          attendanceRate: unitAttendance.attendanceRate,
          pendingPermissions,
          unresolvedRecords: unitRecordMeasurements.open,
          criticalRecords: unitRecordMeasurements.criticalOpen,
          assignedAssets,
          attentionSignals,
          criticalSignals: unitAttendance.absence + unitRecordMeasurements.criticalOpen,
        };
      })
      .sort((left, right) => right.attentionSignals - left.attentionSignals || left.name.localeCompare(right.name));
  }, [copy.dashboard.labels.noUnit, filteredAssignments, filteredAssets, filteredEmployees, filteredPermissions, filteredRecords]);

  const attentionRows = useMemo<AttentionSignalRow[]>(() => {
    const permissionByEmployee = new Map<number, number>();
    const recordsByEmployee = new Map<number, number>();
    const criticalRecordsByEmployee = new Map<number, number>();
    const assignmentByEmployee = new Map<number, AttendanceControlAssignment>();

    filteredPermissions.forEach((permission) => {
      if (permission.status === 'pending' && permission.employee.id) {
        permissionByEmployee.set(permission.employee.id, (permissionByEmployee.get(permission.employee.id) ?? 0) + 1);
      }
    });

    filteredRecords.forEach((record) => {
      if (isOpenHrRecord(record)) {
        recordsByEmployee.set(record.user.id, (recordsByEmployee.get(record.user.id) ?? 0) + 1);
      }
      if (isCriticalOpenHrRecord(record)) {
        criticalRecordsByEmployee.set(record.user.id, (criticalRecordsByEmployee.get(record.user.id) ?? 0) + 1);
      }
    });

    filteredAssignments.forEach((assignment) => {
      assignmentByEmployee.set(assignment.user_company_id, assignment);
    });

    return filteredEmployees
      .map((employee) => {
        const assignment = assignmentByEmployee.get(employee.id);
        const signals: string[] = [];

        if (attendanceAvailable) {
          if (!assignment) {
            signals.push(copy.dashboard.signals.noAttendanceSetup);
          } else if (assignment.today_status === 'late') {
            signals.push(copy.dashboard.signals.lateToday);
          } else if (assignment.today_status === 'absence') {
            signals.push(copy.dashboard.signals.absentToday);
          } else if (assignment.today_status === 'not_scheduled' || assignment.today_rule == null) {
            signals.push(copy.dashboard.signals.noAttendanceSetup);
          }
        }

        const pendingPermissions = permissionByEmployee.get(employee.id) ?? 0;
        const openRecords = recordsByEmployee.get(employee.id) ?? 0;
        const criticalRecords = criticalRecordsByEmployee.get(employee.id) ?? 0;

        if (permissionsAvailable && pendingPermissions > 0) {
          signals.push(copy.dashboard.signals.pendingPermissions(pendingPermissions));
        }
        if (recordsAvailable && openRecords > 0) {
          signals.push(copy.dashboard.signals.openRecords(openRecords));
        }

        const status: HrKpiSignalStatus = assignment?.today_status === 'absence' || criticalRecords > 0
          ? 'critical'
          : 'watch';

        return {
          id: String(employee.id),
          employee: getEmployeeDisplayName(employee),
          position: employee.position_title || employee.position || copy.dashboard.labels.noDepartment,
          unit: employee.unit_name || copy.dashboard.labels.noUnit,
          signals,
          status,
        };
      })
      .filter((row) => row.signals.length > 0)
      .sort((left, right) => {
        const statusPriority: Record<HrKpiSignalStatus, number> = {
          critical: 0,
          watch: 1,
          healthy: 2,
          unavailable: 3,
        };
        return statusPriority[left.status] - statusPriority[right.status] || right.signals.length - left.signals.length;
      })
      .slice(0, 8);
  }, [
    copy.dashboard.labels.noDepartment,
    copy.dashboard.labels.noUnit,
    copy.dashboard.signals,
    attendanceAvailable,
    filteredAssignments,
    filteredEmployees,
    filteredPermissions,
    filteredRecords,
    permissionsAvailable,
    recordsAvailable,
  ]);

  const unitChartData = useMemo(
    () => unitSourcesAvailable
      ? unitRows.slice(0, 6).map((row) => ({ name: row.name, signals: row.attentionSignals }))
      : [],
    [unitRows, unitSourcesAvailable],
  );

  const permissionChartData = useMemo(() => [
    { name: copy.dashboard.labels.pending, value: permissionCounts.pending },
    { name: standardCopy.approved, value: permissionCounts.approved },
    { name: standardCopy.rejected, value: permissionCounts.rejected },
  ].filter(item => item.value > 0), [copy.dashboard.labels.pending, permissionCounts, standardCopy]);

  const recordsChartData = useMemo(() => [
    { name: copy.dashboard.labels.pending, value: recordCounts.pending },
    { name: standardCopy.reviewed, value: recordCounts.reviewed },
    { name: standardCopy.resolved, value: recordCounts.resolved },
  ].filter(item => item.value > 0), [copy.dashboard.labels.pending, recordCounts, standardCopy]);

  const departmentRiskRows = useMemo(() => {
    if (!attendanceAvailable) return [];
    const assignmentByEmployee = new Map(filteredAssignments.map(assignment => [assignment.user_company_id, assignment]));
    const groups = new Map<string, { employees: number; exceptions: number }>();
    filteredEmployees.forEach((employee) => {
      const department = employee.department || copy.dashboard.labels.noDepartment;
      const group = groups.get(department) ?? { employees: 0, exceptions: 0 };
      const assignment = assignmentByEmployee.get(employee.id);
      const status = assignment?.today_status;
      group.employees += 1;
      if (!assignment || assignment.today_rule == null || ['late', 'absence', 'not_scheduled'].includes(status ?? '')) {
        group.exceptions += 1;
      }
      groups.set(department, group);
    });
    return Array.from(groups.entries()).map(([name, values]) => ({ name, ...values, percentage: values.employees > 0 ? (values.exceptions / values.employees) * 100 : 0 })).sort((left, right) => right.exceptions - left.exceptions).slice(0, 5);
  }, [attendanceAvailable, copy.dashboard.labels.noDepartment, filteredAssignments, filteredEmployees]);

  const employeeOperationsRows = useMemo<HrEmployeeOperationsRow[]>(() => {
    const assignmentByEmployee = new Map(filteredAssignments.map(assignment => [assignment.user_company_id, assignment]));
    const permissionsByEmployee = new Map<number, number>();
    const recordsByEmployee = new Map<number, number>();
    const criticalRecordsByEmployee = new Map<number, number>();
    const assetsByEmployee = new Map<number, number>();
    filteredPermissions.forEach(permission => { if (permission.status === 'pending' && permission.employee.id) permissionsByEmployee.set(permission.employee.id, (permissionsByEmployee.get(permission.employee.id) ?? 0) + 1); });
    filteredRecords.forEach(record => {
      if (isOpenHrRecord(record)) recordsByEmployee.set(record.user.id, (recordsByEmployee.get(record.user.id) ?? 0) + 1);
      if (isCriticalOpenHrRecord(record)) criticalRecordsByEmployee.set(record.user.id, (criticalRecordsByEmployee.get(record.user.id) ?? 0) + 1);
    });
    filteredAssets.forEach(asset => { if (asset.responsible_user_company_id && ['assigned', 'custody'].includes(asset.status)) assetsByEmployee.set(asset.responsible_user_company_id, (assetsByEmployee.get(asset.responsible_user_company_id) ?? 0) + 1); });
    const attendanceLabels: Record<string, string> = {
      on_time: copy.dashboard.labels.onTime,
      rest: copy.dashboard.labels.rest,
      leave: copy.dashboard.labels.leave,
      late: copy.dashboard.labels.late,
      pending: copy.dashboard.labels.pending,
      not_scheduled: copy.dashboard.signals.noAttendanceSetup,
      absence: copy.dashboard.labels.absence,
      unconfigured: copy.dashboard.signals.noAttendanceSetup,
      unavailable: copy.dashboard.common.notAvailable,
    };
    const allRowSourcesAvailable = attendanceAvailable && permissionsAvailable && recordsAvailable && assetsAvailable;
    return filteredEmployees.map(employee => {
      const assignment = assignmentByEmployee.get(employee.id);
      const statusKey = !attendanceAvailable
        ? 'unavailable'
        : assignment?.today_rule == null
          ? 'unconfigured'
          : assignment.today_status;
      const pendingPermissions = permissionsByEmployee.get(employee.id) ?? 0;
      const openRecords = recordsByEmployee.get(employee.id) ?? 0;
      const criticalRecords = criticalRecordsByEmployee.get(employee.id) ?? 0;
      const assignedAssets = assetsByEmployee.get(employee.id) ?? 0;
      const attendanceSignal = attendanceAvailable
        && ['late', 'absence', 'not_scheduled', 'unconfigured'].includes(statusKey)
        ? 1
        : 0;
      const signalCount = attendanceSignal + pendingPermissions + openRecords;
      const status: HrKpiSignalStatus = !allRowSourcesAvailable
        ? 'unavailable'
        : statusKey === 'absence' || criticalRecords > 0
          ? 'critical'
          : signalCount > 0
            ? 'watch'
            : 'healthy';
      return {
        id: employee.id,
        position: 0,
        name: getEmployeeDisplayName(employee),
        meta: `${employee.position_title || employee.position || copy.dashboard.labels.noDepartment} · ${employee.unit_name || copy.dashboard.labels.noUnit}`,
        attendance: attendanceLabels[statusKey] ?? copy.dashboard.labels.noRecord,
        permissions: permissionsAvailable ? pendingPermissions : unavailableValue,
        records: recordsAvailable ? openRecords : unavailableValue,
        assets: assetsAvailable ? assignedAssets : unavailableValue,
        signalCount: allRowSourcesAvailable ? signalCount : unavailableValue,
        signalValue: signalCount,
        status,
      };
    }).sort((left, right) => {
      const statusPriority: Record<HrKpiSignalStatus, number> = {
        critical: 0,
        watch: 1,
        unavailable: 2,
        healthy: 3,
      };
      return statusPriority[left.status] - statusPriority[right.status]
        || right.signalValue - left.signalValue
        || left.name.localeCompare(right.name);
    }).map(({ signalValue: _signalValue, ...row }, index) => ({ ...row, position: index + 1 }));
  }, [
    assetsAvailable,
    attendanceAvailable,
    copy.dashboard.common.notAvailable,
    copy.dashboard.labels,
    copy.dashboard.signals.noAttendanceSetup,
    filteredAssignments,
    filteredAssets,
    filteredEmployees,
    filteredPermissions,
    filteredRecords,
    permissionsAvailable,
    recordsAvailable,
    unavailableValue,
  ]);

  const executiveStatus = useMemo<HrKpiSignalStatus>(() => {
    if (displaySourceWarnings.length > 0) return 'unavailable';
    if (attendanceSummary.absence > 0 || recordCounts.criticalOpen > 0) return 'critical';
    if (
      attendanceSummary.late > 0
      || attendanceSummary.unconfigured > 0
      || permissionCounts.pending > 0
      || recordCounts.open > 0
      || assetCounts.maintenance > 0
    ) return 'watch';
    return 'healthy';
  }, [
    assetCounts.maintenance,
    attendanceSummary.absence,
    attendanceSummary.late,
    attendanceSummary.unconfigured,
    displaySourceWarnings.length,
    permissionCounts.pending,
    recordCounts.criticalOpen,
    recordCounts.open,
  ]);

  const healthInsight = useMemo(() => {
    if (executiveStatus === 'unavailable') return copy.dashboard.common.partialData;
    if (filteredEmployees.length === 0) return copy.dashboard.insights.empty;
    if (executiveStatus === 'critical') return copy.dashboard.insights.critical;
    if (executiveStatus === 'watch') return copy.dashboard.insights.watch;
    return copy.dashboard.insights.healthy;
  }, [copy.dashboard.common.partialData, copy.dashboard.insights, executiveStatus, filteredEmployees.length]);

  const periodOptions = useMemo(
    () => [
      { value: 'thisMonth', label: copy.dashboard.filters.thisMonth },
      { value: 'lastMonth', label: copy.dashboard.filters.lastMonth },
      { value: 'thisQuarter', label: copy.dashboard.filters.thisQuarter },
      { value: 'annualized', label: copy.dashboard.filters.annualized },
      { value: 'specificDate', label: copy.dashboard.filters.specificDate },
    ],
    [copy.dashboard.filters],
  );
  const periodRange = useMemo(() => periodRangeFor(periodFilter, selectedDate), [periodFilter, selectedDate]);
  const activeAdvancedFilterCount = [unitFilter, businessFilter, departmentFilter]
    .filter((value) => value !== allValue).length;
  const hasActiveFilters = Boolean(
    searchQuery.trim()
      || periodFilter !== 'thisMonth'
      || selectedDate !== workspaceDefaults.selectedDate
      || attendanceStatusFilter !== allValue
      || activeAdvancedFilterCount > 0,
  );

  useEffect(() => {
    if (activeAdvancedFilterCount > 0) setShowAdvancedFilters(true);
  }, [activeAdvancedFilterCount]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setUnitFilter(allValue);
    setBusinessFilter(allValue);
    setPeriodFilter('thisMonth');
    setAttendanceStatusFilter(allValue);
    setDepartmentFilter(allValue);
    setSelectedDate(todayIsoDate());
    setShowAdvancedFilters(false);
  };
  const periodLabel = periodOptions.find((option) => option.value === periodFilter)?.label ?? copy.dashboard.filters.thisMonth;
  const periodScopeLabel = periodFilter === 'specificDate'
    ? formatDateLabel(selectedDate, currentLanguage.code)
    : `${formatDateLabel(periodRange.start, currentLanguage.code)} - ${formatDateLabel(periodRange.end, currentLanguage.code)}`;
  const attendanceScopeLabel = formatDateLabel(controlDate, currentLanguage.code);
  const selectedUnitLabel = unitFilter === allValue
    ? copy.dashboard.filters.allUnits
    : unitOptions.find((unit) => unit.id === unitFilter)?.name ?? copy.dashboard.filters.allUnits;
  const selectedBusinessLabel = businessFilter === allValue
    ? copy.dashboard.filters.allBusinesses
    : businessOptions.find((business) => business.id === businessFilter)?.name ?? copy.dashboard.filters.allBusinesses;
  const selectedDepartmentLabel = departmentFilter === allValue ? copy.dashboard.filters.allDepartments : departmentFilter;
  const selectedAttendanceStatusLabel = attendanceStatusFilter === allValue
    ? standardCopy.allStatuses
    : ({ on_time: copy.dashboard.labels.onTime, late: copy.dashboard.labels.late, leave: copy.dashboard.labels.leave, rest: copy.dashboard.labels.rest, absence: copy.dashboard.labels.absence, pending: copy.dashboard.labels.pending, not_scheduled: copy.dashboard.signals.noAttendanceSetup } as Record<string, string>)[attendanceStatusFilter] ?? standardCopy.allStatuses;

  const lastUpdatedLabel = lastUpdatedAt
    ? new Intl.DateTimeFormat(currentLanguage.code, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(lastUpdatedAt))
    : copy.dashboard.common.notAvailable;

  const handlePrintReport = () => {
    printKpisReport({
      attentionRows: attentionRows.map((row) => ({
        employee: row.employee,
        meta: `${row.position} · ${row.unit}`,
        signals: row.signals.join(' · '),
        status: row.status,
      })),
      attendanceRows: attendanceChartData.map((item) => ({
        name: item.name,
        value: item.value,
        valueLabel: formatNumber(item.value, currentLanguage.code),
      })),
      cards: kpiCards.map(({ description, status, target, title, value }) => ({
        description,
        status,
        target,
        title,
        value,
      })),
      companyLogoUrl: companyPrintIdentity.logoUrl,
      companyName: companyPrintIdentity.name,
      copy,
      filters: [
        { label: copy.dashboard.filters.search, value: searchQuery.trim() || copy.dashboard.common.notAvailable },
        { label: copy.dashboard.filters.period, value: `${periodLabel} · ${periodScopeLabel}` },
        { label: copy.dashboard.labels.attendanceControlDate, value: attendanceScopeLabel },
        { label: standardCopy.status, value: selectedAttendanceStatusLabel },
        { label: copy.dashboard.labels.preferredCurrency, value: preferredCurrency },
        { label: copy.dashboard.filters.unit, value: selectedUnitLabel },
        { label: copy.dashboard.filters.business, value: selectedBusinessLabel },
        { label: copy.dashboard.filters.department, value: selectedDepartmentLabel },
      ],
      healthInsight,
      lastUpdatedLabel,
      locale: currentLanguage.code,
      periodLabel,
      sourceWarnings: displaySourceWarnings,
      unitRows: unitRows.map((row) => ({
        assignedAssets: assetsAvailable ? formatNumber(row.assignedAssets, currentLanguage.code) : unavailableValue,
        attentionSignals: unitSourcesAvailable ? formatNumber(row.attentionSignals, currentLanguage.code) : unavailableValue,
        attentionValue: unitSourcesAvailable ? row.attentionSignals : 0,
        attendanceRate: attendanceAvailable ? formatPercent(row.attendanceRate, copy) : unavailableValue,
        employees: formatNumber(row.employees, currentLanguage.code),
        name: row.name,
        pendingPermissions: permissionsAvailable ? formatNumber(row.pendingPermissions, currentLanguage.code) : unavailableValue,
        unresolvedRecords: recordsAvailable ? formatNumber(row.unresolvedRecords, currentLanguage.code) : unavailableValue,
      })),
    });
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <LoadingBarOverlay
        isVisible={isLoading}
        title={copy.loading.title}
        description={copy.loading.description}
      />

      <HrTitleBar className="mb-0" emoji="📊" title={copy.title} subtitle={copy.subtitle} actions={<>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={isLoading}
              className={hrTitleBarSecondaryActionClass}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading ? 'animate-spin' : '')} />
              {copy.dashboard.actions.refresh}
            </button>
            <button
              type="button"
              onClick={handlePrintReport}
              disabled={!isCompanyPrintIdentityReady}
              className={hrTitleBarPrimaryActionClass}
            >
              <Printer className="h-4 w-4" />
              {copy.dashboard.actions.printReport}
            </button>
          </>}
      />

      <IndiceWorkspaceNavigation<HrKpiView>
        ariaLabel={workspaceCopy.navigation}
        variant="views"
        tone="aqua"
        value={activeView}
        onValueChange={setActiveView}
        items={[
          { id: 'overview', label: workspaceCopy.views.overview, icon: <LayoutGrid /> },
          { id: 'charts', label: workspaceCopy.views.charts, icon: <ChartNoAxesCombined /> },
          { id: 'units', label: workspaceCopy.views.units, icon: <BriefcaseBusiness /> },
          { id: 'employees', label: workspaceCopy.views.employees, icon: <Users /> },
        ]}
      />

      <IndiceFilterBar
        gridClassName="lg:grid-cols-4"
        title={copy.dashboard.filters.title}
        summary={(
          <IndiceFilterDisclosureActions
            activeAdvancedCount={activeAdvancedFilterCount}
            advancedLabel={showAdvancedFilters ? disclosureCopy.hideFilters : disclosureCopy.moreFilters}
            clearLabel={disclosureCopy.clearFilters}
            hasActiveFilters={hasActiveFilters}
            isAdvancedOpen={showAdvancedFilters}
            onClear={handleClearFilters}
            onToggleAdvanced={() => setShowAdvancedFilters((current) => !current)}
            resultSummary={standardCopy.results(filteredEmployees.length)}
            tone="aqua"
          />
        )}
      >
        <IndiceFilterSearch
          label={copy.dashboard.filters.search}
          value={searchQuery}
          onValueChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder={copy.dashboard.filters.searchPlaceholder}
          tone="aqua"
        />
        <IndiceFilterSelect
          label={copy.dashboard.filters.period}
          value={periodFilter}
          onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}
          options={periodOptions}
          tone="aqua"
        />
        <IndiceFilterField label={standardCopy.operationalDate}>
          <input
            aria-label={standardCopy.operationalDate}
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value || todayIsoDate())}
            className={getIndiceFilterControlClassName('aqua')}
          />
        </IndiceFilterField>
        <IndiceFilterSelect
          label={standardCopy.status}
          value={attendanceStatusFilter}
          onValueChange={setAttendanceStatusFilter}
          options={[
            { value: allValue, label: standardCopy.allStatuses },
            { value: 'on_time', label: copy.dashboard.labels.onTime },
            { value: 'late', label: copy.dashboard.labels.late },
            { value: 'leave', label: copy.dashboard.labels.leave },
            { value: 'rest', label: copy.dashboard.labels.rest },
            { value: 'absence', label: copy.dashboard.labels.absence },
            { value: 'pending', label: copy.dashboard.labels.pending },
            { value: 'not_scheduled', label: copy.dashboard.signals.noAttendanceSetup },
          ]}
          tone="aqua"
        />

        {showAdvancedFilters ? (
          <IndiceFilterAdvancedSection className="md:col-span-2 lg:col-span-4" gridClassName="lg:grid-cols-3">
            <IndiceFilterSelect
              label={copy.dashboard.filters.unit}
              value={unitFilter}
              onValueChange={(value) => { setUnitFilter(value); setBusinessFilter(allValue); }}
              options={[
                { value: allValue, label: copy.dashboard.filters.allUnits },
                ...unitOptions.map((unit) => ({ value: String(unit.id), label: unit.name })),
              ]}
              tone="aqua"
            />
            <IndiceFilterSelect
              label={copy.dashboard.filters.business}
              value={businessFilter}
              onValueChange={setBusinessFilter}
              options={[
                { value: allValue, label: copy.dashboard.filters.allBusinesses },
                ...businessOptions.map((business) => ({ value: String(business.id), label: business.name })),
              ]}
              tone="aqua"
            />
            <IndiceFilterSelect
              label={copy.dashboard.filters.department}
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
              options={[
                { value: allValue, label: copy.dashboard.filters.allDepartments },
                ...departmentOptions.map((department) => ({ value: department, label: department })),
              ]}
              tone="aqua"
            />
          </IndiceFilterAdvancedSection>
        ) : null}
      </IndiceFilterBar>

      {displaySourceWarnings.length > 0 ? (
        <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">{copy.dashboard.common.partialData}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {displaySourceWarnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {activeView==='overview'? (
        <section role="tabpanel" aria-label={workspaceCopy.views.overview} data-hr-kpi-view="overview" className="space-y-6" tabIndex={0}>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((card) => (
              <KpiCard key={card.id} card={card} copy={copy} />
            ))}
          </section>

          <section className={cn('rounded-[24px] border p-5 text-sm shadow-sm', statusClasses[executiveStatus])}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-sm ring-1 ring-current/10 dark:bg-slate-900/80">
                  {executiveStatus === 'healthy' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </span>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{copy.dashboard.sections.executiveSignal}</p>
                  <p className="mt-1 leading-6">{healthInsight}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-medium lg:justify-end">
                <span className="rounded-full bg-white/70 px-3 py-1.5 dark:bg-slate-900/60">{periodLabel}: {periodScopeLabel}</span>
                <span className="rounded-full bg-white/70 px-3 py-1.5 dark:bg-slate-900/60">{standardCopy.operationalDate}: {attendanceScopeLabel}</span>
                <span className="rounded-full bg-white/70 px-3 py-1.5 dark:bg-slate-900/60">{copy.dashboard.labels.preferredCurrency}: {preferredCurrency}</span>
                <span className="rounded-full bg-white/70 px-3 py-1.5 dark:bg-slate-900/60">{copy.dashboard.labels.totalAssetValue}: {assetsAvailable ? assetValueSummary.nativeBreakdownLabel : unavailableValue}</span>
                <span className="rounded-full bg-white/70 px-3 py-1.5 dark:bg-slate-900/60">{standardCopy.comparison}</span>
                <span className="rounded-full bg-white/70 px-3 py-1.5 dark:bg-slate-900/60">{copy.dashboard.labels.lastUpdated}: {lastUpdatedLabel}</span>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 rounded-[24px] border border-slate-200 bg-white p-4 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 md:grid-cols-4 xl:grid-cols-8">
            <span>{copy.dashboard.labels.totalEmployees}: {sourceAvailability.employees ? scopedEmployees.length : unavailableValue}</span>
            <span>{copy.dashboard.labels.active}: {employeeScopeAvailable ? filteredEmployees.length : unavailableValue}</span>
            <span>{copy.dashboard.labels.inactive}: {sourceAvailability.employees ? scopedEmployees.filter((employee) => String(employee.status).toLowerCase() === 'inactive').length : unavailableValue}</span>
            <span>{copy.dashboard.labels.terminated}: {sourceAvailability.employees ? scopedEmployees.filter((employee) => String(employee.status).toLowerCase() === 'terminated').length : unavailableValue}</span>
            <span>{copy.dashboard.labels.totalAssets}: {assetsAvailable ? filteredAssets.length : unavailableValue}</span>
            <span>{copy.dashboard.labels.totalAssetValue}: {assetsAvailable ? assetValueSummary.preferredTotalLabel : unavailableValue}</span>
            <span>{copy.dashboard.labels.totalPermissions}: {permissionsAvailable ? filteredPermissions.length : unavailableValue}</span>
            <span>{copy.dashboard.labels.totalRecords}: {recordsAvailable ? filteredRecords.length : unavailableValue}</span>
          </section>
        </section>
      ):null}

      {activeView==='charts'? (
        <section role="tabpanel" aria-label={workspaceCopy.views.charts} data-hr-kpi-view="charts" className="space-y-6" tabIndex={0}>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-medium text-slate-900 dark:text-white">{copy.dashboard.sections.attendanceMix}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {copy.dashboard.labels.attendanceControlDate}: {attendanceScopeLabel}
                  </p>
                </div>
                <IdCard className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="h-72">
                {attendanceChartData.length === 1 ? (
                  <div className="flex h-full items-center justify-center">
                    <div
                      aria-label={`${attendanceChartData[0].name}: ${attendanceChartData[0].value}`}
                      className="relative h-44 w-44 rounded-full shadow-inner"
                      data-hr-kpi-single-segment="attendance"
                      role="img"
                      style={{ backgroundColor: pieColors[0] }}
                    >
                      <span className="absolute inset-[34px] rounded-full bg-white shadow-sm dark:bg-slate-800" />
                    </div>
                  </div>
                ) : attendanceChartData.length>0? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendanceChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={92}
                        paddingAngle={3}
                      >
                        {attendanceChartData.map((entry,index) => (
                          <Cell key={entry.name} fill={pieColors[index%pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ):(
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {copy.dashboard.common.noData}
                  </div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                {attendanceChartData.map((item,index) => (
                  <div key={item.name} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900/50">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pieColors[index%pieColors.length] }} />
                    <span className="font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                    <span className="ml-auto text-slate-500 dark:text-slate-400">{item.value}</span>
                  </div>
                ))}
              </div>
            </article>

            {[
              { title: copy.dashboard.cards.permissions.title,description: copy.dashboard.cards.permissions.description,data: permissionChartData,icon: <ClipboardList className="h-5 w-5" /> },
              { title: copy.dashboard.cards.records.title,description: copy.dashboard.cards.records.description,data: recordsChartData,icon: <FileWarning className="h-5 w-5" /> },
            ].map((panel) => (
              <article key={panel.title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-base font-medium text-slate-900 dark:text-white">{panel.title}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{panel.description}</p></div><span className="text-emerald-500">{panel.icon}</span></div>
                <div className="h-64">
                  {panel.data.length>0? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={panel.data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={86} paddingAngle={3}>{panel.data.map((item,index) => <Cell key={item.name} fill={pieColors[index%pieColors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>:<div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">{copy.dashboard.common.noData}</div>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">{panel.data.map((item,index) => <span key={item.name} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-900/60 dark:text-slate-300"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pieColors[index%pieColors.length] }} />{item.name}: {item.value}</span>)}</div>
              </article>
            ))}
          </div>
        </section>
      ):null}

      {activeView==='units'? (
        <section role="tabpanel" aria-label={workspaceCopy.views.units} data-hr-kpi-view="units" className="space-y-6" tabIndex={0}>
          <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-medium text-slate-900 dark:text-white">{copy.dashboard.sections.unitPerformance}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{copy.dashboard.sections.unitPerformanceHint}</p>
              </div>
              <BriefcaseBusiness className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="h-72">
              {unitChartData.length>0? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={unitChartData} margin={{ top: 10,right: 18,left: -20,bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} height={54} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="signals" name={copy.dashboard.labels.readiness} radius={[8,8,0,0]} fill={moduleAccent} />
                  </BarChart>
                </ResponsiveContainer>
              ):(
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {copy.dashboard.common.noData}
                </div>
              )}
            </div>
          </article>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><h3 className="font-medium text-slate-900 dark:text-white">{standardCopy.topUnits}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.dashboard.sections.unitPerformanceHint}</p><div className="mt-5 space-y-3">{unitRows.slice(0,5).map((row,index) => { const rowStatus: HrKpiSignalStatus = !unitSourcesAvailable ? 'unavailable' : row.criticalSignals > 0 ? 'critical' : row.attentionSignals > 0 ? 'watch' : 'healthy'; return <button key={row.id} type="button" disabled={row.id==='none'} onClick={() => { setUnitFilter(row.id); setBusinessFilter(allValue); }} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-emerald-50 disabled:cursor-default dark:hover:bg-emerald-950/20"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-medium dark:bg-slate-700">{index+1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{row.name}</span><span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusClasses[rowStatus]}`}>{unitSourcesAvailable ? row.attentionSignals : unavailableValue}</span></button>; })}{unitRows.length===0? <p className="py-8 text-center text-sm text-slate-500">{copy.dashboard.common.noData}</p>:null}</div></article>

            <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><h3 className="font-medium text-slate-900 dark:text-white">{standardCopy.topDepartments}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.dashboard.cards.late.description}</p><div className="mt-5 space-y-3">{departmentRiskRows.map((row,index) => <button key={row.name} type="button" onClick={() => setDepartmentFilter(row.name)} className="block w-full rounded-xl p-2 text-left transition hover:bg-emerald-50 dark:hover:bg-emerald-950/20"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-medium dark:bg-slate-700">{index+1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{row.name}</span><span className="text-sm font-medium text-slate-900 dark:text-white">{row.exceptions}</span></div><div className="ml-11 mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100,row.percentage)}%` }} /></div></button>)}{departmentRiskRows.length===0? <p className="py-8 text-center text-sm text-slate-500">{copy.dashboard.common.noData}</p>:null}</div></article>
          </div>

          <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <h3 className="text-base font-medium text-slate-900 dark:text-white">{copy.dashboard.sections.unitSummary}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.dashboard.sections.unitSummaryHint}</p>
            </div>
            <div className="grid gap-3 bg-slate-50/60 p-3 dark:bg-slate-900/30 md:hidden">
              {unitRows.length>0? (
                unitRows.map((row) => (
                  <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="break-words font-medium text-slate-950 dark:text-white">{row.name}</h4>
                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {copy.dashboard.table.employees}: {row.employees}
                        </p>
                      </div>
                      <KpiStatusBadge
                        copy={copy}
                        status={!unitSourcesAvailable ? 'unavailable' : row.criticalSignals > 0 ? 'critical' : row.attentionSignals > 0 ? 'watch' : 'healthy'}
                      />
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 text-sm dark:border-slate-700">
                      <div><dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.dashboard.table.attendance}</dt><dd className="mt-1 font-medium text-slate-900 dark:text-white">{attendanceAvailable ? formatPercent(row.attendanceRate,copy) : unavailableValue}</dd></div>
                      <div><dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.dashboard.table.permissions}</dt><dd className="mt-1 font-medium text-slate-900 dark:text-white">{permissionsAvailable ? row.pendingPermissions : unavailableValue}</dd></div>
                      <div><dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.dashboard.table.records}</dt><dd className="mt-1 font-medium text-slate-900 dark:text-white">{recordsAvailable ? row.unresolvedRecords : unavailableValue}</dd></div>
                      <div><dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.dashboard.table.assets}</dt><dd className="mt-1 font-medium text-slate-900 dark:text-white">{assetsAvailable ? row.assignedAssets : unavailableValue}</dd></div>
                    </dl>
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">{copy.dashboard.table.readiness}</p>
                      <p className="text-lg font-medium text-slate-900 dark:text-white">{unitSourcesAvailable ? row.attentionSignals : unavailableValue}</p>
                    </div>
                  </article>
                ))
              ):(
                <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {copy.dashboard.table.noRows}
                </div>
              )}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/60">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">{copy.dashboard.table.unit}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">{copy.dashboard.table.employees}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">{copy.dashboard.table.attendance}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">{copy.dashboard.table.permissions}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">{copy.dashboard.table.records}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">{copy.dashboard.table.assets}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">{copy.dashboard.table.readiness}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {unitRows.length>0? (
                    unitRows.map((row) => (
                      <tr key={row.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10">
                        <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-white">{row.name}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{row.employees}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{attendanceAvailable ? formatPercent(row.attendanceRate,copy) : unavailableValue}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{permissionsAvailable ? row.pendingPermissions : unavailableValue}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{recordsAvailable ? row.unresolvedRecords : unavailableValue}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{assetsAvailable ? row.assignedAssets : unavailableValue}</td>
                        <td className="px-5 py-4">
                          <div className="flex min-w-[180px] items-center gap-3">
                            <span className="font-medium text-slate-900 dark:text-white">{unitSourcesAvailable ? row.attentionSignals : unavailableValue}</span>
                            <KpiStatusBadge
                              copy={copy}
                              status={!unitSourcesAvailable ? 'unavailable' : row.criticalSignals > 0 ? 'critical' : row.attentionSignals > 0 ? 'watch' : 'healthy'}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  ):(
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                        {copy.dashboard.table.noRows}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      ):null}


      <section role="tabpanel" aria-label={workspaceCopy.views.employees} data-hr-kpi-view="employees" hidden={activeView!=='employees'} className="space-y-6" tabIndex={0}>
        <details className="rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <summary className="cursor-pointer rounded-[24px] px-5 py-4 text-sm text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5] dark:text-slate-200">
            <span className="font-medium">{standardCopy.topAttention} · {attentionRows.length}</span>
            <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{copy.dashboard.sections.attentionQueueHint}</span>
          </summary>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {attentionRows.length>0? (
              attentionRows.slice(0,showAllAttention? attentionRows.length:5).map((row) => (
                <div key={row.id} className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <button type="button" onClick={() => setSearchQuery(row.employee)} aria-label={`${standardCopy.focus}: ${row.employee}`} className="rounded text-left font-medium text-slate-900 underline decoration-transparent underline-offset-4 hover:text-[#177D66] hover:decoration-current focus-visible:outline-2 focus-visible:outline-[#59C3A5] dark:text-white">{row.employee}</button>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{row.position} · {row.unit}</p>
                    </div>
                    <KpiStatusBadge copy={copy} status={row.status} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.signals.map((signal) => (
                      <span
                        key={signal}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ):(
              <div className="p-10 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                {copy.dashboard.sections.noAttentionSignals}
              </div>
            )}
          </div>
          {attentionRows.length>5? (
            <button type="button" onClick={() => setShowAllAttention((current) => !current)} aria-expanded={showAllAttention} className="m-4 min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-[#177D66] hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-[#59C3A5] dark:border-slate-700 dark:text-emerald-300 dark:hover:bg-slate-900">
              {showAllAttention? workspaceCopy.showLess:workspaceCopy.showMore}
            </button>
          ):null}
        </details>

        <HrEmployeeOperationsTable
          labels={{
            title: standardCopy.performanceTitle,
            subtitle: standardCopy.performanceSubtitle,
            employee: copy.dashboard.table.employees,
            attendance: copy.dashboard.table.attendance,
            permissions: copy.dashboard.table.permissions,
            records: copy.dashboard.table.records,
            assets: copy.dashboard.table.assets,
            readiness: copy.dashboard.table.readiness,
            noRows: copy.dashboard.table.noRows,
            focus: standardCopy.focus,
            statuses: copy.dashboard.statuses,
            pagination: standardCopy.pagination,
          }}
          onFocus={(row) => setSearchQuery(row.name)}
          resetKey={[searchQuery,unitFilter,businessFilter,periodFilter,attendanceStatusFilter,departmentFilter,selectedDate].join('|')}
          rows={employeeOperationsRows}
        />
      </section>

    </div>
  );
}
