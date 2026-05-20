import { useMemo, useState, type ComponentType } from 'react';
import {
  Activity,
  BarChart3,
  Gauge,
  FolderKanban,
  Minus,
  Repeat2,
  Search,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { cn } from '../../../components/ui/utils';
import {
  employeePerformanceStatusLabels,
  kpiCategoryLabels,
  kpiStatusLabels,
  processEmployeePerformanceRows,
  processKpiBusinessAdjustments,
  processKpiBusinesses,
  processKpiCards,
  processKpiEmployeeAdjustments,
  processKpiEmployees,
  processKpiUnitAdjustments,
  processKpiUnits,
} from './kpiData';
import type {
  EmployeePerformanceStatus,
  ProcessKpiCard,
  ProcessKpiCategory,
  ProcessKpiStatus,
  ProcessKpiTrend,
} from './types';

type FilterValue = 'all' | string;
type KpiTypeFilterValue = 'all' | ProcessKpiCategory;

interface FilterOption {
  value: FilterValue;
  label: string;
}

interface KpiTypeFilterOption {
  value: KpiTypeFilterValue;
  label: string;
}

interface ResolvedKpiCard extends ProcessKpiCard {
  computedDisplayValue: string;
  computedProgress: number;
  computedStatus: ProcessKpiStatus;
  computedCurrentValue: number;
  computedSecondaryValue?: number;
}

const categoryIcons: Record<ProcessKpiCategory, ComponentType<{ className?: string }>> = {
  'main-product': Gauge,
  business: BarChart3,
  operational: Activity,
  project: FolderKanban,
  process: Repeat2,
  performance: Trophy,
};

const categoryClasses: Record<ProcessKpiCategory, string> = {
  'main-product':
    'border-[rgb(235,165,52)]/30 bg-[rgb(235,165,52)]/10 text-[rgb(181,111,10)] dark:border-[rgb(235,165,52)]/40 dark:bg-[rgb(235,165,52)]/15 dark:text-amber-200',
  business:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300',
  operational:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300',
  project:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300',
  process:
    'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/50 dark:bg-cyan-950/40 dark:text-cyan-300',
  performance:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300',
};

const statusClasses: Record<ProcessKpiStatus, string> = {
  healthy:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300',
  watch:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300',
  critical:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300',
};

const performanceStatusClasses: Record<EmployeePerformanceStatus, string> = {
  top: 'text-emerald-700 dark:text-emerald-300',
  solid: 'text-amber-700 dark:text-amber-300',
  watch: 'text-red-700 dark:text-red-300',
};

const trendIcons: Record<ProcessKpiTrend, ComponentType<{ className?: string }>> = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

function buildFilterOptions(values: string[], allLabel: string): FilterOption[] {
  return [
    { value: 'all', label: allLabel },
    ...values.map((value) => ({ value, label: value })),
  ];
}

function clampValue(value: number, minValue: number, maxValue: number) {
  return Math.min(maxValue, Math.max(minValue, value));
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function getScopeAdjustment(
  category: ProcessKpiCategory,
  selectedUnit: FilterValue,
  selectedBusiness: FilterValue,
  selectedEmployee: FilterValue,
) {
  let adjustment = 0;

  if (selectedUnit !== 'all') {
    adjustment += processKpiUnitAdjustments[selectedUnit]?.[category] ?? 0;
  }

  if (selectedBusiness !== 'all') {
    adjustment += processKpiBusinessAdjustments[selectedBusiness]?.[category] ?? 0;
  }

  if (selectedEmployee !== 'all') {
    adjustment += processKpiEmployeeAdjustments[selectedEmployee]?.[category] ?? 0;
  }

  return adjustment;
}

function getAdjustedValues(kpi: ProcessKpiCard, scopeAdjustment: number) {
  switch (kpi.displayType) {
    case 'rating':
      return {
        currentValue: clampValue(roundToOneDecimal(kpi.currentValue + scopeAdjustment * 0.04), 0, 5),
        secondaryValue: kpi.secondaryValue,
      };
    case 'days':
      return {
        currentValue: clampValue(roundToOneDecimal(kpi.currentValue - scopeAdjustment * 0.08), 0.5, 99),
        secondaryValue: kpi.secondaryValue,
      };
    case 'tasks':
      return {
        currentValue: clampValue(Math.round(kpi.currentValue + scopeAdjustment * 0.8), 0, 999),
        secondaryValue: kpi.secondaryValue,
      };
    case 'score':
      return {
        currentValue: clampValue(Math.round(kpi.currentValue + scopeAdjustment), 0, 100),
        secondaryValue: kpi.secondaryValue,
      };
    case 'ratio': {
      const baseInactive = kpi.secondaryValue ?? 0;
      const nextActive = clampValue(Math.round(kpi.currentValue + scopeAdjustment), 1, 999);
      const nextInactive = clampValue(Math.round(baseInactive - scopeAdjustment * 0.4), 1, 999);

      return {
        currentValue: nextActive,
        secondaryValue: nextInactive,
      };
    }
    case 'ranking':
      return {
        currentValue: clampValue(Math.round(kpi.currentValue + scopeAdjustment), 0, 100),
        secondaryValue: kpi.secondaryValue,
      };
    case 'percentage':
    default:
      return {
        currentValue: clampValue(Math.round(kpi.currentValue + scopeAdjustment), 0, 100),
        secondaryValue: kpi.secondaryValue,
      };
  }
}

function getKpiProgress(kpi: ProcessKpiCard, currentValue: number, secondaryValue?: number) {
  if (kpi.displayType === 'ratio') {
    const total = currentValue + (secondaryValue ?? 0);
    const activeRate = total === 0 ? 0 : (currentValue / total) * 100;
    return Math.min(100, Math.round((activeRate / kpi.targetValue) * 100));
  }

  if (kpi.inverseGoal) {
    if (currentValue <= 0) {
      return 100;
    }

    return Math.min(100, Math.round((kpi.targetValue / currentValue) * 100));
  }

  return Math.min(100, Math.round((currentValue / kpi.targetValue) * 100));
}

function getDerivedStatus(progress: number): ProcessKpiStatus {
  if (progress >= 100) {
    return 'healthy';
  }

  if (progress >= 90) {
    return 'watch';
  }

  return 'critical';
}

function formatDisplayValue(
  kpi: ProcessKpiCard,
  currentValue: number,
  secondaryValue: number | undefined,
) {
  switch (kpi.displayType) {
    case 'rating':
      return `${currentValue.toFixed(1)} / 5`;
    case 'days':
      return `${currentValue.toFixed(1)} days`;
    case 'tasks':
      return `${Math.round(currentValue)} tasks`;
    case 'score':
      return `${Math.round(currentValue)} / 100`;
    case 'ratio':
      return `${Math.round(currentValue)} / ${Math.round(secondaryValue ?? 0)}`;
    case 'ranking':
      return kpi.displayValue;
    case 'percentage':
    default:
      return `${Math.round(currentValue)}%`;
  }
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: FilterValue) => void;
  options: FilterOption[];
  value: FilterValue;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function KpiTypeSelect({
  value,
  onChange,
  options,
}: {
  value: KpiTypeFilterValue;
  onChange: (value: KpiTypeFilterValue) => void;
  options: KpiTypeFilterOption[];
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">KPI type</label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as KpiTypeFilterValue)}>
        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function KPIs() {
  const [kpiQuery, setKpiQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<FilterValue>('all');
  const [selectedBusiness, setSelectedBusiness] = useState<FilterValue>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<FilterValue>('all');
  const [selectedKpiType, setSelectedKpiType] = useState<KpiTypeFilterValue>('all');

  const unitOptions = useMemo(() => buildFilterOptions(processKpiUnits, 'All units'), []);
  const businessOptions = useMemo(() => buildFilterOptions(processKpiBusinesses, 'All businesses'), []);
  const employeeOptions = useMemo(() => buildFilterOptions(processKpiEmployees, 'All employees'), []);
  const kpiTypeOptions = useMemo<KpiTypeFilterOption[]>(
    () => [
      { value: 'all', label: 'All KPI types' },
      { value: 'main-product', label: 'Main KPI' },
      { value: 'business', label: 'Business-level KPI' },
      { value: 'operational', label: 'Operational KPI' },
      { value: 'project', label: 'Project KPI' },
      { value: 'process', label: 'Process KPI' },
      { value: 'performance', label: 'Performance KPI' },
    ],
    [],
  );

  const normalizedKpiQuery = kpiQuery.trim().toLowerCase();

  const resolvedKpis = useMemo<ResolvedKpiCard[]>(() => {
    return processKpiCards.map((kpi) => {
      const scopeAdjustment = getScopeAdjustment(
        kpi.category,
        selectedUnit,
        selectedBusiness,
        selectedEmployee,
      );
      const { currentValue, secondaryValue } = getAdjustedValues(kpi, scopeAdjustment);
      const computedProgress = getKpiProgress(kpi, currentValue, secondaryValue);
      const computedStatus = getDerivedStatus(computedProgress);
      const computedDisplayValue = formatDisplayValue(kpi, currentValue, secondaryValue);

      return {
        ...kpi,
        computedCurrentValue: currentValue,
        computedSecondaryValue: secondaryValue,
        computedDisplayValue,
        computedProgress,
        computedStatus,
      };
    });
  }, [selectedBusiness, selectedEmployee, selectedUnit]);

  const visibleKpis = resolvedKpis.filter((kpi) => {
    const matchesQuery =
      normalizedKpiQuery.length === 0 ||
      kpi.title.toLowerCase().includes(normalizedKpiQuery) ||
      kpi.description.toLowerCase().includes(normalizedKpiQuery) ||
      kpi.supportText.toLowerCase().includes(normalizedKpiQuery);
    const matchesType = selectedKpiType === 'all' || kpi.category === selectedKpiType;

    return matchesQuery && matchesType;
  });

  const employeePerformanceRows = useMemo(() => {
    return processEmployeePerformanceRows
      .filter((row) => selectedUnit === 'all' || row.unit === selectedUnit)
      .filter((row) => selectedBusiness === 'all' || row.business === selectedBusiness)
      .filter((row) => selectedEmployee === 'all' || row.employee === selectedEmployee)
      .sort((leftRow, rightRow) => rightRow.performanceScore - leftRow.performanceScore);
  }, [selectedBusiness, selectedEmployee, selectedUnit]);

  const showEmployeeDashboard =
    (selectedKpiType === 'all' || selectedKpiType === 'performance') &&
    (normalizedKpiQuery.length === 0 ||
      'employee performance dashboard'.includes(normalizedKpiQuery) ||
      employeePerformanceRows.some((row) => row.employee.toLowerCase().includes(normalizedKpiQuery)));

  return (
    <>
      <section className="mb-5 rounded-lg border border-[rgb(235,165,52)]/30 bg-[rgb(235,165,52)]/10 p-6 shadow-sm dark:border-[rgb(235,165,52)]/40 dark:bg-[rgb(235,165,52)]/15">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
            <span className="text-2xl">📊</span>
            KPI Dashboard
          </h2>
          <p className="max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Review operational, project, process, and people performance with filterable KPI cards and a dedicated
            employee performance dashboard for the selected scope.
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-base font-bold text-slate-800 dark:text-white">Filters</h3>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">KPI</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={kpiQuery}
                onChange={(event) => setKpiQuery(event.target.value)}
                placeholder="Filter KPI cards"
                className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>
          </div>
          <FilterSelect
            label="Unit"
            value={selectedUnit}
            onChange={setSelectedUnit}
            options={unitOptions}
          />
          <FilterSelect
            label="Business"
            value={selectedBusiness}
            onChange={setSelectedBusiness}
            options={businessOptions}
          />
          <FilterSelect
            label="Employee"
            value={selectedEmployee}
            onChange={setSelectedEmployee}
            options={employeeOptions}
          />
          <KpiTypeSelect
            value={selectedKpiType}
            onChange={setSelectedKpiType}
            options={kpiTypeOptions}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {visibleKpis.map((kpi) => {
          const CategoryIcon = categoryIcons[kpi.category];
          const TrendIcon = trendIcons[kpi.trendDirection];

          return (
            <article
              key={kpi.id}
              className={cn(
                'flex h-full flex-col rounded-[28px] border bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md dark:bg-slate-800',
                kpi.featured
                  ? 'border-[rgb(235,165,52)]/40 shadow-[0_18px_40px_rgba(235,165,52,0.16)] dark:border-[rgb(235,165,52)]/50'
                  : 'border-slate-200 dark:border-slate-700',
              )}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-2xl border',
                      categoryClasses[kpi.category],
                    )}
                  >
                    <CategoryIcon className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]',
                        categoryClasses[kpi.category],
                      )}
                    >
                      {kpi.featured ? 'Main KPI' : kpiCategoryLabels[kpi.category]}
                    </span>
                    <h3 className="text-lg font-semibold leading-snug text-slate-900 dark:text-white">
                      {kpi.title}
                    </h3>
                  </div>
                </div>
                <span
                  className={cn(
                    'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]',
                    statusClasses[kpi.computedStatus],
                  )}
                >
                  {kpiStatusLabels[kpi.computedStatus]}
                </span>
              </div>

              <p className="mb-5 min-h-[48px] text-sm leading-6 text-slate-600 dark:text-slate-300">
                {kpi.description}
              </p>

              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[2rem] font-bold leading-none text-slate-900 dark:text-white">
                    {kpi.computedDisplayValue}
                  </p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{kpi.targetLabel}</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                  <TrendIcon className="h-4 w-4 text-[rgb(235,165,52)]" />
                  <span>{kpi.trendLabel}</span>
                </div>
              </div>

              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  <span>Progress to target</span>
                  <span>{kpi.computedProgress}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      kpi.computedStatus === 'healthy'
                        ? 'bg-emerald-500'
                        : kpi.computedStatus === 'watch'
                          ? 'bg-[rgb(235,165,52)]'
                          : 'bg-red-500',
                    )}
                    style={{ width: `${kpi.computedProgress}%` }}
                  />
                </div>
              </div>

              <div className="mt-auto rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                {kpi.supportText}
              </div>
            </article>
          );
        })}
      </section>

      {visibleKpis.length === 0 ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-base text-slate-500 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
          No KPI cards match the current filter combination.
        </div>
      ) : null}

      {showEmployeeDashboard ? (
        <section className="mt-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <Users className="h-3.5 w-3.5" />
                Performance KPI
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Employee performance dashboard</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Compare performance scores, compliance, quality, and output across the employees in the selected scope.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-white">{employeePerformanceRows.length} employees visible</p>
              <p className="mt-1">Rows respond to Unit, Business, and Employee filters.</p>
            </div>
          </div>

          <Table className="min-w-[940px]">
            <TableHeader>
              <TableRow className="border-slate-200 dark:border-slate-700">
                <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Rank</TableHead>
                <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Employee</TableHead>
                <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Unit</TableHead>
                <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Business</TableHead>
                <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Performance score</TableHead>
                <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Compliance</TableHead>
                <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Rating</TableHead>
                <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Tasks completed</TableHead>
                <TableHead className="px-5 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeePerformanceRows.map((row, index) => (
                <TableRow key={row.employee} className="border-slate-200 dark:border-slate-700">
                  <TableCell className="px-5 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                    #{index + 1}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                    {row.employee}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{row.unit}</TableCell>
                  <TableCell className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">{row.business}</TableCell>
                  <TableCell className="px-5 py-4 text-sm text-slate-900 dark:text-white">
                    {row.performanceScore} / 100
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-slate-900 dark:text-white">{row.compliance}%</TableCell>
                  <TableCell className="px-5 py-4 text-sm text-slate-900 dark:text-white">{row.rating.toFixed(1)} / 5</TableCell>
                  <TableCell className="px-5 py-4 text-sm text-slate-900 dark:text-white">{row.tasksCompleted}</TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    <span className={cn('font-semibold', performanceStatusClasses[row.status])}>
                      {employeePerformanceStatusLabels[row.status]}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {employeePerformanceRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400"
                  >
                    No employee performance rows match the current Unit, Business, and Employee filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </section>
      ) : null}
    </>
  );
}
