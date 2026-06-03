import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Download,
  FileWarning,
  Filter,
  IdCard,
  Laptop,
  RefreshCw,
  Search,
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
import { hrAssetsApi, type HrAsset, type HrAssetsSummary } from '../../../api/HumanResources/assets';
import {
  permissionsApi,
  type BackendPermissionItem,
  type PermissionsSummary,
} from '../../../api/HumanResources/permissions';
import {
  humanResourcesApi,
  type AttendanceControlAssignment,
  type AttendanceControlOverviewResponse,
  type BackendHrUser,
  type BackendRecordItem,
  type RecordsListResponse,
} from '../../../api/humanResources';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { cn } from '../../../components/ui/utils';
import { useLanguage } from '../../../shared/context';
import { useKPIsTranslations } from './hooks/useKPIsTranslations';
import type { KPIsTranslations } from './translations';

type PeriodFilter = 'today' | 'month' | 'year' | 'all';
type HealthStatus = 'healthy' | 'watch' | 'critical';

interface KpiCardModel {
  id: string;
  title: string;
  value: string;
  target: string;
  description: string;
  status: HealthStatus;
  icon: ReactNode;
}

interface UnitSummaryRow {
  id: string;
  name: string;
  employees: number;
  attendanceRate: number | null;
  pendingPermissions: number;
  unresolvedRecords: number;
  assignedAssets: number;
  readinessScore: number;
  status: HealthStatus;
}

interface AttentionSignalRow {
  id: string;
  employee: string;
  position: string;
  unit: string;
  signals: string[];
  status: HealthStatus;
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

const emptyHrSummary = {
  total_count: 0,
  active_count: 0,
  inactive_count: 0,
  terminated_count: 0,
};

const emptyAssetSummary: HrAssetsSummary = {
  total_count: 0,
  available_count: 0,
  assigned_count: 0,
  maintenance_count: 0,
  custody_count: 0,
  inactive_count: 0,
  total_value_amount: null,
};

const emptyPermissionSummary: PermissionsSummary = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
};

const emptyRecordsSummary: RecordsListResponse['summary'] = {
  total_count: 0,
  pending_count: 0,
  reviewed_count: 0,
  resolved_count: 0,
  high_severity_count: 0,
};

const statusClasses: Record<HealthStatus, string> = {
  healthy:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  watch:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  critical:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300',
};

const scoreBarClasses: Record<HealthStatus, string> = {
  healthy: 'bg-emerald-500',
  watch: 'bg-amber-500',
  critical: 'bg-rose-500',
};

const pieColors = ['#10b981', '#f59e0b', '#0ea5e9', '#64748b', '#e11d48', '#94a3b8'];

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

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

function formatMonthLabel(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(`${date.slice(0, 7)}-01T00:00:00`));
}

function getHealthStatus(score: number): HealthStatus {
  if (score >= 85) {
    return 'healthy';
  }

  if (score >= 70) {
    return 'watch';
  }

  return 'critical';
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function weightedAverage(parts: Array<{ value: number | null; weight: number }>) {
  const availableParts = parts.filter((part) => part.value !== null && Number.isFinite(part.value));
  const totalWeight = availableParts.reduce((sum, part) => sum + part.weight, 0);

  if (totalWeight === 0) {
    return 0;
  }

  return clampScore(
    availableParts.reduce((sum, part) => sum + (part.value ?? 0) * part.weight, 0) / totalWeight,
  );
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
  return permission.createdAt || permission.startDate || permission.updatedAt || '';
}

function getDateFromRecord(record: BackendRecordItem) {
  return record.event_date || record.created_at || record.updated_at || '';
}

function isDateInPeriod(dateValue: string, period: PeriodFilter, anchorDate: string) {
  if (period === 'all' || !dateValue) {
    return true;
  }

  const normalizedDate = dateValue.slice(0, 10);

  if (period === 'today') {
    return normalizedDate === anchorDate;
  }

  if (period === 'month') {
    return normalizedDate.slice(0, 7) === anchorDate.slice(0, 7);
  }

  return normalizedDate.slice(0, 4) === anchorDate.slice(0, 4);
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
  const matchesEmployeeScope = employeeIds.size === 0 || employeeIds.has(assignment.user_company_id);

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

function KpiStatusBadge({ copy, status }: { copy: KPIsTranslations; status: HealthStatus }) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', statusClasses[status])}>
      {copy.dashboard.statuses[status]}
    </span>
  );
}

function KpiScoreBar({ score, status }: { score: number; status: HealthStatus }) {
  return (
    <div className="flex min-w-[132px] items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className={cn('h-full rounded-full', scoreBarClasses[status])} style={{ width: `${clampScore(score)}%` }} />
      </div>
      <span className="w-10 text-right text-sm font-semibold text-slate-900 dark:text-white">{clampScore(score)}%</span>
    </div>
  );
}

function KpiCard({ card, copy }: { card: KpiCardModel; copy: KPIsTranslations }) {
  const score = Number.parseInt(card.value, 10);
  const fallbackScore = card.status === 'healthy' ? 92 : card.status === 'watch' ? 74 : 42;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800">
            {card.icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{card.title}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{card.value}</p>
          </div>
        </div>
        <KpiStatusBadge copy={copy} status={card.status} />
      </div>
      <KpiScoreBar score={Number.isFinite(score) ? score : fallbackScore} status={card.status} />
      <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{card.target}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{card.description}</p>
    </article>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-900/30"
      >
        {children}
      </select>
    </label>
  );
}

export default function KPIs() {
  const copy = useKPIsTranslations();
  const { currentLanguage } = useLanguage();
  const [employees, setEmployees] = useState<BackendHrUser[]>([]);
  const [employeeSummary, setEmployeeSummary] = useState(emptyHrSummary);
  const [attendanceOverview, setAttendanceOverview] = useState<AttendanceControlOverviewResponse | null>(null);
  const [assets, setAssets] = useState<HrAsset[]>([]);
  const [assetSummary, setAssetSummary] = useState<HrAssetsSummary>(emptyAssetSummary);
  const [permissions, setPermissions] = useState<BackendPermissionItem[]>([]);
  const [permissionSummary, setPermissionSummary] = useState<PermissionsSummary>(emptyPermissionSummary);
  const [records, setRecords] = useState<BackendRecordItem[]>([]);
  const [recordSummary, setRecordSummary] = useState<RecordsListResponse['summary']>(emptyRecordsSummary);
  const [units, setUnits] = useState<BackendUnit[]>([]);
  const [businesses, setBusinesses] = useState<BackendBusiness[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayIsoDate());
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [unitFilter, setUnitFilter] = useState(allValue);
  const [businessFilter, setBusinessFilter] = useState(allValue);
  const [departmentFilter, setDepartmentFilter] = useState(allValue);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sourceWarnings, setSourceWarnings] = useState<string[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');

  const filters = useMemo(
    () => ({ searchQuery, unitFilter, businessFilter, departmentFilter }),
    [businessFilter, departmentFilter, searchQuery, unitFilter],
  );

  const loadDashboard = async () => {
    setIsLoading(true);

    const fetchPermissions = async () => {
      try {
        return await permissionsApi.listPermissions({ page: 1, size: 500 });
      } catch {
        return permissionsApi.listMyPermissions({ page: 1, size: 500 });
      }
    };

    const results = await runWithMinimumDuration(Promise.allSettled([
      humanResourcesApi.listHrUsers(),
      humanResourcesApi.getAttendanceControlOverview(selectedDate),
      hrAssetsApi.listAssets({ page: 1, size: 500 }),
      fetchPermissions(),
      humanResourcesApi.listRecords({ page: 1, size: 500 }),
      dashboardApi.listUnits(),
      dashboardApi.listBusinesses(),
    ]));

    const warnings: string[] = [];
    const [
      employeesResult,
      attendanceResult,
      assetsResult,
      permissionsResult,
      recordsResult,
      unitsResult,
      businessesResult,
    ] = results;

    if (employeesResult.status === 'fulfilled') {
      const summary = employeesResult.value.summary ?? emptyHrSummary;
      setEmployees(employeesResult.value.items);
      setEmployeeSummary({
        total_count: summary.total_count,
        active_count: summary.active_count,
        inactive_count: summary.inactive_count,
        terminated_count: summary.terminated_count,
      });
    } else {
      warnings.push(getErrorMessage(employeesResult.reason, copy.dashboard.errors.employees));
      setEmployees([]);
      setEmployeeSummary(emptyHrSummary);
    }

    if (attendanceResult.status === 'fulfilled') {
      setAttendanceOverview(attendanceResult.value);
    } else {
      warnings.push(getErrorMessage(attendanceResult.reason, copy.dashboard.errors.attendance));
      setAttendanceOverview(null);
    }

    if (assetsResult.status === 'fulfilled') {
      setAssets(assetsResult.value.items);
      setAssetSummary(assetsResult.value.summary ?? emptyAssetSummary);
    } else {
      warnings.push(getErrorMessage(assetsResult.reason, copy.dashboard.errors.assets));
      setAssets([]);
      setAssetSummary(emptyAssetSummary);
    }

    if (permissionsResult.status === 'fulfilled') {
      setPermissions(permissionsResult.value.items);
      setPermissionSummary(permissionsResult.value.summary ?? emptyPermissionSummary);
    } else {
      warnings.push(getErrorMessage(permissionsResult.reason, copy.dashboard.errors.permissions));
      setPermissions([]);
      setPermissionSummary(emptyPermissionSummary);
    }

    if (recordsResult.status === 'fulfilled') {
      setRecords(recordsResult.value.items);
      setRecordSummary(recordsResult.value.summary ?? emptyRecordsSummary);
    } else {
      warnings.push(getErrorMessage(recordsResult.reason, copy.dashboard.errors.records));
      setRecords([]);
      setRecordSummary(emptyRecordsSummary);
    }

    setUnits(unitsResult.status === 'fulfilled' ? unitsResult.value : []);
    setBusinesses(businessesResult.status === 'fulfilled' ? businessesResult.value : []);
    setSourceWarnings(warnings);
    setLastUpdatedAt(new Date().toISOString());
    setIsLoading(false);
  };

  useEffect(() => {
    void loadDashboard();
  }, [selectedDate]);

  const scopedEmployees = useMemo(
    () => employees.filter((employee) => employeeMatchesFilters(employee, filters)),
    [employees, filters],
  );

  const filteredEmployees = useMemo(
    () => scopedEmployees.filter(isActiveEmployee),
    [scopedEmployees],
  );

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
        assignmentMatchesFilters(assignment, filteredEmployeeIds, filters),
      ),
    [attendanceOverview?.assignments, filteredEmployeeIds, filters],
  );

  const filteredPermissions = useMemo(
    () =>
      permissions.filter((permission) => {
        const employeeId = permission.employee.id;
        const employeeName = permission.employee.name.toLowerCase();
        const matchesEmployee =
          filteredEmployeeIds.size === 0 ||
          (employeeId ? filteredEmployeeIds.has(employeeId) : filteredEmployeeNames.has(employeeName));
        const haystack = [permission.folio, permission.employee.name, permission.employee.position, permission.employee.department, permission.reason]
          .join(' ');

        return (
          matchesEmployee &&
          includesText(haystack, searchQuery) &&
          isDateInPeriod(getDateFromPermission(permission), periodFilter, selectedDate)
        );
      }),
    [filteredEmployeeIds, filteredEmployeeNames, permissions, periodFilter, searchQuery, selectedDate],
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const matchesEmployee = filteredEmployeeIds.size === 0 || filteredEmployeeIds.has(record.user.id);
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
          (unitFilter === allValue || String(record.unit?.id ?? '') === unitFilter || matchesEmployee) &&
          (businessFilter === allValue || String(record.business?.id ?? '') === businessFilter || matchesEmployee) &&
          isDateInPeriod(getDateFromRecord(record), periodFilter, selectedDate)
        );
      }),
    [businessFilter, filteredEmployeeIds, periodFilter, records, searchQuery, selectedDate, unitFilter],
  );

  const filteredAssets = useMemo(
    () =>
      assets.filter((asset) => {
        const matchesResponsible =
          filteredEmployeeIds.size === 0 ||
          (asset.responsible_user_company_id ? filteredEmployeeIds.has(asset.responsible_user_company_id) : false);
        const matchesUnit = unitFilter === allValue || String(asset.unit_id ?? '') === unitFilter;
        const haystack = [asset.asset_code, asset.asset_type, asset.name, asset.model, asset.serial_number, asset.responsible_name, asset.unit_name]
          .join(' ');

        return (
          includesText(haystack, searchQuery) &&
          (matchesResponsible || matchesUnit) &&
          (departmentFilter === allValue || matchesResponsible)
        );
      }),
    [assets, departmentFilter, filteredEmployeeIds, searchQuery, unitFilter],
  );

  const attendanceSummary = useMemo(() => {
    const onTime = filteredAssignments.filter((assignment) => assignment.today_status === 'on_time').length;
    const late = filteredAssignments.filter((assignment) => assignment.today_status === 'late').length;
    const leave = filteredAssignments.filter((assignment) => assignment.today_status === 'leave').length;
    const rest = filteredAssignments.filter((assignment) => assignment.today_status === 'rest').length;
    const absence = filteredAssignments.filter((assignment) => assignment.today_status === 'absence').length;
    const noRecord = filteredAssignments.filter((assignment) =>
      ['pending', 'not_scheduled'].includes(assignment.today_status),
    ).length;
    const denominator = Math.max(filteredAssignments.length, filteredEmployees.length);
    const attendanceRate = denominator > 0 ? ((onTime + late) / denominator) * 100 : null;
    const punctualityRate = denominator > 0 ? (onTime / denominator) * 100 : null;

    return {
      onTime,
      late,
      leave,
      rest,
      absence,
      noRecord,
      denominator,
      attendanceRate: attendanceRate === null ? null : clampScore(attendanceRate),
      punctualityRate: punctualityRate === null ? null : clampScore(punctualityRate),
    };
  }, [filteredAssignments, filteredEmployees.length]);

  const permissionCounts = useMemo(
    () => ({
      total: filteredPermissions.length,
      pending: filteredPermissions.filter((permission) => permission.status === 'pending').length,
      approved: filteredPermissions.filter((permission) => permission.status === 'approved').length,
      rejected: filteredPermissions.filter((permission) => permission.status === 'rejected').length,
    }),
    [filteredPermissions],
  );

  const recordCounts = useMemo(
    () => ({
      total: filteredRecords.length,
      pending: filteredRecords.filter((record) => record.status === 'pending').length,
      reviewed: filteredRecords.filter((record) => record.status === 'reviewed').length,
      resolved: filteredRecords.filter((record) => record.status === 'resolved').length,
      highSeverity: filteredRecords.filter((record) => record.severity === 'high').length,
    }),
    [filteredRecords],
  );

  const assetCounts = useMemo(
    () => ({
      total: filteredAssets.length,
      assigned: filteredAssets.filter((asset) => asset.status === 'assigned' || asset.status === 'custody').length,
      available: filteredAssets.filter((asset) => asset.status === 'available').length,
      maintenance: filteredAssets.filter((asset) => asset.status === 'maintenance').length,
      inactive: filteredAssets.filter((asset) => asset.status === 'inactive').length,
    }),
    [filteredAssets],
  );

  const activeRate = scopedEmployees.length > 0
    ? clampScore((filteredEmployees.length / scopedEmployees.length) * 100)
    : 0;
  const permissionResolutionRate = permissionCounts.total > 0
    ? clampScore(((permissionCounts.approved + permissionCounts.rejected) / permissionCounts.total) * 100)
    : null;
  const recordResolutionRate = recordCounts.total > 0
    ? clampScore((recordCounts.resolved / recordCounts.total) * 100)
    : null;
  const assetCoverageRate = filteredEmployees.length > 0
    ? clampScore((assetCounts.assigned / filteredEmployees.length) * 100)
    : null;
  const healthScore = weightedAverage([
    { value: activeRate, weight: 0.2 },
    { value: attendanceSummary.attendanceRate, weight: 0.3 },
    { value: permissionResolutionRate, weight: 0.15 },
    {
      value: recordResolutionRate === null
        ? null
        : clampScore(recordResolutionRate - Math.min(40, recordCounts.highSeverity * 10)),
      weight: 0.2,
    },
    { value: assetCoverageRate, weight: 0.15 },
  ]);
  const healthStatus = getHealthStatus(healthScore);

  const kpiCards = useMemo<KpiCardModel[]>(
    () => [
      {
        id: 'workforce',
        title: copy.dashboard.cards.workforce.title,
        value: formatNumber(filteredEmployees.length, currentLanguage.code),
        target: copy.dashboard.cards.workforce.target(formatPercent(activeRate, copy)),
        description: copy.dashboard.cards.workforce.description,
        status: getHealthStatus(activeRate),
        icon: <Users className="h-5 w-5" />,
      },
      {
        id: 'attendance',
        title: copy.dashboard.cards.attendance.title,
        value: formatPercent(attendanceSummary.attendanceRate, copy),
        target: copy.dashboard.cards.attendance.target(attendanceSummary.onTime + attendanceSummary.late, attendanceSummary.denominator),
        description: copy.dashboard.cards.attendance.description,
        status: getHealthStatus(attendanceSummary.attendanceRate ?? 0),
        icon: <CalendarCheck2 className="h-5 w-5" />,
      },
      {
        id: 'late',
        title: copy.dashboard.cards.late.title,
        value: formatNumber(attendanceSummary.late, currentLanguage.code),
        target: copy.dashboard.cards.late.target(attendanceSummary.absence, attendanceSummary.noRecord),
        description: copy.dashboard.cards.late.description,
        status: attendanceSummary.late === 0 ? 'healthy' : attendanceSummary.late <= 2 ? 'watch' : 'critical',
        icon: <Activity className="h-5 w-5" />,
      },
      {
        id: 'permissions',
        title: copy.dashboard.cards.permissions.title,
        value: formatNumber(permissionCounts.pending, currentLanguage.code),
        target: copy.dashboard.cards.permissions.target(permissionCounts.total),
        description: copy.dashboard.cards.permissions.description,
        status: permissionCounts.pending === 0 ? 'healthy' : permissionCounts.pending <= 3 ? 'watch' : 'critical',
        icon: <ClipboardList className="h-5 w-5" />,
      },
      {
        id: 'assets',
        title: copy.dashboard.cards.assets.title,
        value: formatPercent(assetCoverageRate, copy),
        target: copy.dashboard.cards.assets.target(assetCounts.assigned, assetCounts.maintenance),
        description: copy.dashboard.cards.assets.description,
        status: getHealthStatus(assetCoverageRate ?? 0),
        icon: <Laptop className="h-5 w-5" />,
      },
      {
        id: 'records',
        title: copy.dashboard.cards.records.title,
        value: formatNumber(recordCounts.pending + recordCounts.highSeverity, currentLanguage.code),
        target: copy.dashboard.cards.records.target(recordCounts.total),
        description: copy.dashboard.cards.records.description,
        status: recordCounts.pending + recordCounts.highSeverity === 0 ? 'healthy' : recordCounts.highSeverity > 0 ? 'critical' : 'watch',
        icon: <FileWarning className="h-5 w-5" />,
      },
      {
        id: 'health',
        title: copy.dashboard.cards.health.title,
        value: `${healthScore}/100`,
        target: copy.dashboard.cards.health.target,
        description: copy.dashboard.cards.health.description,
        status: healthStatus,
        icon: <ShieldCheck className="h-5 w-5" />,
      },
    ],
    [
      activeRate,
      assetCounts.assigned,
      assetCounts.maintenance,
      assetCoverageRate,
      attendanceSummary.absence,
      attendanceSummary.attendanceRate,
      attendanceSummary.denominator,
      attendanceSummary.late,
      attendanceSummary.noRecord,
      attendanceSummary.onTime,
      copy,
      currentLanguage.code,
      filteredEmployees.length,
      healthScore,
      healthStatus,
      permissionCounts.pending,
      permissionCounts.total,
      recordCounts.highSeverity,
      recordCounts.pending,
      recordCounts.total,
    ],
  );

  const attendanceChartData = useMemo(
    () => [
      { name: copy.dashboard.labels.onTime, value: attendanceSummary.onTime },
      { name: copy.dashboard.labels.late, value: attendanceSummary.late },
      { name: copy.dashboard.labels.leave, value: attendanceSummary.leave },
      { name: copy.dashboard.labels.rest, value: attendanceSummary.rest },
      { name: copy.dashboard.labels.absence, value: attendanceSummary.absence },
      { name: copy.dashboard.labels.noRecord, value: attendanceSummary.noRecord },
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
        const unitAttendanceCount = unitAssignments.filter((assignment) =>
          assignment.today_status === 'on_time' || assignment.today_status === 'late',
        ).length;
        const unitAttendanceRate = unitAssignments.length > 0
          ? clampScore((unitAttendanceCount / Math.max(unitAssignments.length, unitEmployees.length)) * 100)
          : null;
        const unitPermissions = filteredPermissions.filter((permission) =>
          permission.employee.id ? unitEmployeeIds.has(permission.employee.id) : false,
        );
        const unitRecords = filteredRecords.filter((record) => unitEmployeeIds.has(record.user.id));
        const unitAssets = filteredAssets.filter((asset) =>
          asset.responsible_user_company_id ? unitEmployeeIds.has(asset.responsible_user_company_id) : String(asset.unit_id ?? '') === unitId,
        );
        const pendingPermissions = unitPermissions.filter((permission) => permission.status === 'pending').length;
        const unresolvedRecords = unitRecords.filter((record) => record.status !== 'resolved' || record.severity === 'high').length;
        const assignedAssets = unitAssets.filter((asset) => asset.status === 'assigned' || asset.status === 'custody').length;
        const readinessScore = weightedAverage([
          { value: unitAttendanceRate, weight: 0.35 },
          { value: pendingPermissions === 0 ? 100 : Math.max(45, 100 - pendingPermissions * 12), weight: 0.2 },
          { value: unresolvedRecords === 0 ? 100 : Math.max(40, 100 - unresolvedRecords * 12), weight: 0.25 },
          { value: unitEmployees.length > 0 ? clampScore((assignedAssets / unitEmployees.length) * 100) : null, weight: 0.2 },
        ]);

        return {
          id: unitId,
          name: unitName,
          employees: unitEmployees.length,
          attendanceRate: unitAttendanceRate,
          pendingPermissions,
          unresolvedRecords,
          assignedAssets,
          readinessScore,
          status: getHealthStatus(readinessScore),
        };
      })
      .sort((left, right) => left.readinessScore - right.readinessScore || left.name.localeCompare(right.name));
  }, [copy.dashboard.labels.noUnit, filteredAssignments, filteredAssets, filteredEmployees, filteredPermissions, filteredRecords]);

  const attentionRows = useMemo<AttentionSignalRow[]>(() => {
    const permissionByEmployee = new Map<number, number>();
    const recordsByEmployee = new Map<number, number>();
    const assignmentByEmployee = new Map<number, AttendanceControlAssignment>();

    filteredPermissions.forEach((permission) => {
      if (permission.status === 'pending' && permission.employee.id) {
        permissionByEmployee.set(permission.employee.id, (permissionByEmployee.get(permission.employee.id) ?? 0) + 1);
      }
    });

    filteredRecords.forEach((record) => {
      if (record.status !== 'resolved' || record.severity === 'high') {
        recordsByEmployee.set(record.user.id, (recordsByEmployee.get(record.user.id) ?? 0) + 1);
      }
    });

    filteredAssignments.forEach((assignment) => {
      assignmentByEmployee.set(assignment.user_company_id, assignment);
    });

    return filteredEmployees
      .map((employee) => {
        const assignment = assignmentByEmployee.get(employee.id);
        const signals: string[] = [];

        if (!assignment) {
          signals.push(copy.dashboard.signals.noAttendanceSetup);
        } else if (assignment.today_status === 'late') {
          signals.push(copy.dashboard.signals.lateToday);
        } else if (assignment.today_status === 'absence') {
          signals.push(copy.dashboard.signals.absentToday);
        } else if (assignment.today_status === 'pending' || assignment.today_status === 'not_scheduled') {
          signals.push(copy.dashboard.signals.noRecordToday);
        }

        const pendingPermissions = permissionByEmployee.get(employee.id) ?? 0;
        const openRecords = recordsByEmployee.get(employee.id) ?? 0;

        if (pendingPermissions > 0) {
          signals.push(copy.dashboard.signals.pendingPermissions(pendingPermissions));
        }
        if (openRecords > 0) {
          signals.push(copy.dashboard.signals.openRecords(openRecords));
        }

        const score = 100 - signals.length * 18 - (assignment?.today_status === 'absence' ? 20 : 0);

        return {
          id: String(employee.id),
          employee: getEmployeeDisplayName(employee),
          position: employee.position_title || employee.position || copy.dashboard.labels.noDepartment,
          unit: employee.unit_name || copy.dashboard.labels.noUnit,
          signals,
          status: getHealthStatus(score),
        };
      })
      .filter((row) => row.signals.length > 0)
      .sort((left, right) => {
        const statusPriority: Record<HealthStatus, number> = { critical: 0, watch: 1, healthy: 2 };
        return statusPriority[left.status] - statusPriority[right.status] || right.signals.length - left.signals.length;
      })
      .slice(0, 8);
  }, [
    copy.dashboard.labels.noDepartment,
    copy.dashboard.labels.noUnit,
    copy.dashboard.signals,
    filteredAssignments,
    filteredEmployees,
    filteredPermissions,
    filteredRecords,
  ]);

  const unitChartData = useMemo(
    () => unitRows.slice(0, 6).map((row) => ({ name: row.name, score: row.readinessScore })),
    [unitRows],
  );

  const healthInsight = useMemo(() => {
    if (filteredEmployees.length === 0) {
      return copy.dashboard.insights.empty;
    }

    if (healthStatus === 'critical') {
      return copy.dashboard.insights.critical;
    }

    if (healthStatus === 'watch') {
      return copy.dashboard.insights.watch;
    }

    return copy.dashboard.insights.healthy;
  }, [copy.dashboard.insights, filteredEmployees.length, healthStatus]);

  const lastUpdatedLabel = lastUpdatedAt
    ? new Intl.DateTimeFormat(currentLanguage.code, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(lastUpdatedAt))
    : copy.dashboard.common.notAvailable;

  const handleRefresh = () => {
    void loadDashboard();
  };

  return (
    <div className="space-y-6">
      <LoadingBarOverlay
        isVisible={isLoading}
        title={copy.loading.title}
        description={copy.loading.description}
      />

      <section className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-900 dark:text-emerald-300 dark:ring-emerald-900/40">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold text-slate-950 dark:text-white">{copy.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300"
            >
              <RefreshCw className="h-4 w-4" />
              {copy.dashboard.actions.refresh}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
            >
              <Download className="h-4 w-4" />
              {copy.exportReport}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Filter className="h-4 w-4 text-emerald-500" />
          {copy.dashboard.filters.title}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <label className="flex min-w-0 flex-col gap-2 xl:col-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {copy.dashboard.filters.search}
            </span>
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={copy.dashboard.filters.searchPlaceholder}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-900/30"
              />
            </span>
          </label>

          <SelectField label={copy.dashboard.filters.period} value={periodFilter} onChange={(value) => setPeriodFilter(value as PeriodFilter)}>
            <option value="today">{copy.dashboard.filters.today}</option>
            <option value="month">{copy.dashboard.filters.month}</option>
            <option value="year">{copy.dashboard.filters.year}</option>
            <option value="all">{copy.dashboard.filters.allPeriods}</option>
          </SelectField>

          <label className="flex min-w-0 flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {copy.dashboard.filters.date}
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value || todayIsoDate())}
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-900/30"
            />
          </label>

          <SelectField label={copy.dashboard.filters.unit} value={unitFilter} onChange={setUnitFilter}>
            <option value={allValue}>{copy.dashboard.filters.allUnits}</option>
            {unitOptions.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </SelectField>

          <SelectField label={copy.dashboard.filters.business} value={businessFilter} onChange={setBusinessFilter}>
            <option value={allValue}>{copy.dashboard.filters.allBusinesses}</option>
            {businessOptions.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </SelectField>

          <SelectField label={copy.dashboard.filters.department} value={departmentFilter} onChange={setDepartmentFilter}>
            <option value={allValue}>{copy.dashboard.filters.allDepartments}</option>
            {departmentOptions.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </SelectField>
        </div>
      </section>

      {sourceWarnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">{copy.dashboard.common.partialData}</p>
              <p className="mt-1">{sourceWarnings.slice(0, 2).join(' ')}</p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <KpiCard key={card.id} card={card} copy={copy} />
        ))}
      </section>

      <section className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-5 text-sm text-emerald-800 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-900 dark:text-emerald-300 dark:ring-emerald-900/40">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{copy.dashboard.sections.executiveSignal}</p>
              <p className="mt-1 leading-6">{healthInsight}</p>
            </div>
          </div>
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {copy.dashboard.labels.lastUpdated}: {lastUpdatedLabel}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.1fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{copy.dashboard.sections.attendanceMix}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{formatMonthLabel(selectedDate, currentLanguage.code)}</p>
            </div>
            <IdCard className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="h-72">
            {attendanceChartData.length > 0 ? (
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
                    {attendanceChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {copy.dashboard.common.noData}
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            {attendanceChartData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/50">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                <span className="font-semibold text-slate-700 dark:text-slate-200">{item.name}</span>
                <span className="ml-auto text-slate-500 dark:text-slate-400">{item.value}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{copy.dashboard.sections.unitPerformance}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.dashboard.sections.unitPerformanceHint}</p>
            </div>
            <BriefcaseBusiness className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="h-72">
            {unitChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={unitChartData} margin={{ top: 10, right: 18, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} height={54} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="score" name={copy.dashboard.labels.readiness} radius={[8, 8, 0, 0]} fill={moduleAccent} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {copy.dashboard.common.noData}
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{copy.dashboard.sections.unitSummary}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.dashboard.sections.unitSummaryHint}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{copy.dashboard.table.unit}</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{copy.dashboard.table.employees}</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{copy.dashboard.table.attendance}</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{copy.dashboard.table.permissions}</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{copy.dashboard.table.records}</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{copy.dashboard.table.assets}</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{copy.dashboard.table.readiness}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {unitRows.length > 0 ? (
                  unitRows.map((row) => (
                    <tr key={row.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10">
                      <td className="px-5 py-4 text-sm font-bold text-slate-900 dark:text-white">{row.name}</td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{row.employees}</td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{formatPercent(row.attendanceRate, copy)}</td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{row.pendingPermissions}</td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{row.unresolvedRecords}</td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{row.assignedAssets}</td>
                      <td className="px-5 py-4">
                        <div className="flex min-w-[180px] items-center gap-3">
                          <KpiScoreBar score={row.readinessScore} status={row.status} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {copy.dashboard.table.noRows}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{copy.dashboard.sections.attentionQueue}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.dashboard.sections.attentionQueueHint}</p>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {attentionRows.length > 0 ? (
              attentionRows.map((row) => (
                <div key={row.id} className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{row.employee}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{row.position} · {row.unit}</p>
                    </div>
                    <KpiStatusBadge copy={copy} status={row.status} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.signals.map((signal) => (
                      <span
                        key={signal}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                {copy.dashboard.sections.noAttentionSignals}
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 md:grid-cols-4 xl:grid-cols-7">
        <span>{copy.dashboard.labels.totalEmployees}: {employeeSummary.total_count}</span>
        <span>{copy.dashboard.labels.active}: {employeeSummary.active_count}</span>
        <span>{copy.dashboard.labels.inactive}: {employeeSummary.inactive_count}</span>
        <span>{copy.dashboard.labels.terminated}: {employeeSummary.terminated_count}</span>
        <span>{copy.dashboard.labels.totalAssets}: {assetSummary.total_count}</span>
        <span>{copy.dashboard.labels.totalPermissions}: {permissionSummary.total}</span>
        <span>{copy.dashboard.labels.totalRecords}: {recordSummary.total_count}</span>
      </section>
    </div>
  );
}
