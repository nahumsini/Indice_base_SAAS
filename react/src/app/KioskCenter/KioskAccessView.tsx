import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  AlertTriangle,
  Building2,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  ShieldQuestion,
  UsersRound,
} from 'lucide-react';
import type { MultiKioskCatalogEmployee, MultiKioskCatalogTool } from '../api/multiKiosks';
import {
  IndiceFilterBar,
  IndiceFilterSearch,
  IndiceTitleBar,
} from '../components/frontend-os';
import { IndiceTableShell } from '../components/table/IndiceTableEngine';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import type { KioskCenterWorkspaceCopy } from './kioskCenterWorkspaceTranslations';
import { employeeHasRequiredKioskTabScopes } from './multiKioskEmployeeAccess';
import { KioskStatusNavigator } from './components/KioskStatusNavigator';

type ReadinessFilter = 'all' | 'ready' | 'attention';

type EmployeeReadiness = {
  issues: string[];
  moduleReady: boolean;
  ready: boolean;
  scopeReady: boolean;
};

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleLowerCase();

const isElevatedRole = (role: string) => {
  const normalized = normalize(role).replace(/[\s_-]+/g, '');
  return normalized === 'root' || normalized === 'superadmin';
};

const readinessFor = (
  employee: MultiKioskCatalogEmployee,
  tools: MultiKioskCatalogTool[],
): EmployeeReadiness => {
  const elevated = employee.tab_scopes_unrestricted === true || isElevatedRole(employee.role);
  const issues = employee.access_issues ?? [];
  const moduleReady = elevated || tools.some(tool => employee.module_slugs.includes(tool.module_slug));
  const scopeReady = tools.some(tool => employeeHasRequiredKioskTabScopes(
    [tool], employee.tab_scopes, elevated));
  const hasCompatibleTool = tools.some(tool => {
    const moduleAllowed = elevated || employee.module_slugs.includes(tool.module_slug);
    const tabAllowed = employeeHasRequiredKioskTabScopes(
      [tool], employee.tab_scopes, elevated);
    return moduleAllowed && tabAllowed;
  });
  const ready = employee.effective_access ?? (
    employee.pin_ready
    && moduleReady
    && scopeReady
    && hasCompatibleTool
    && issues.length === 0
  );
  return { issues, moduleReady, ready, scopeReady };
};

function ReadinessPill({ label, state }: {
  label: string;
  state: 'ready' | 'attention' | 'neutral';
}) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
      state === 'ready' && 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
      state === 'attention' && 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
      state === 'neutral' && 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
    )}>
      {state === 'ready' ? <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> : <ShieldQuestion aria-hidden="true" className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export function KioskAccessView({
  copy,
  employees,
  error,
  tools,
  loading,
  onReviewAccess,
  onRefresh,
}: {
  copy: KioskCenterWorkspaceCopy;
  employees: MultiKioskCatalogEmployee[];
  error: string;
  tools: MultiKioskCatalogTool[];
  loading: boolean;
  onReviewAccess: (employee: MultiKioskCatalogEmployee) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<ReadinessFilter>('all');
  const employeeRows = useMemo(() => employees.map(employee => ({
    employee,
    readiness: readinessFor(employee, tools),
  })), [employees, tools]);
  const filteredRows = useMemo(() => {
    const query = normalize(search);
    return employeeRows.filter(({ employee, readiness }) => {
      if (readinessFilter === 'ready' && !readiness.ready) return false;
      if (readinessFilter === 'attention' && readiness.ready) return false;
      if (!query) return true;
      return normalize([
        employee.name,
        employee.email,
        employee.unit_name ?? '',
        employee.business_name ?? '',
        employee.role,
      ].join(' ')).includes(query);
    });
  }, [employeeRows, readinessFilter, search]);
  const readyCount = employeeRows.filter(row => row.readiness.ready).length;
  const reasonFor = (employee: MultiKioskCatalogEmployee, readiness: EmployeeReadiness) => {
    if (readiness.ready) return copy.access.configured;
    const explicitIssue = readiness.issues[0];
    if (explicitIssue) return copy.access.issueLabels[explicitIssue] ?? explicitIssue.replace(/_/g, ' ');
    if (!employee.pin_ready) return copy.access.issueLabels.PIN_REQUIRED;
    if (!readiness.moduleReady) return copy.access.issueLabels.MODULE_ACCESS_REQUIRED;
    if (!readiness.scopeReady) return copy.access.issueLabels.TAB_SCOPE_REQUIRED;
    return copy.access.attention;
  };

  return (
    <div className="space-y-5">
      <IndiceTitleBar
        tone="aqua"
        icon={<UsersRound className="h-5 w-5" />}
        title={copy.access.title}
        subtitle={copy.access.subtitle}
        actions={(
          <Button type="button" variant="outline" onClick={onRefresh} disabled={loading} className="h-11">
            <RefreshCw aria-hidden="true" className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            {copy.access.refresh}
          </Button>
        )}
      />

      <KioskStatusNavigator
        ariaLabel={copy.access.statusLabel}
        value={readinessFilter}
        onValueChange={value => setReadinessFilter(value as ReadinessFilter)}
        items={[
          { value: 'all', label: copy.access.all, count: employees.length, icon: UsersRound, tone: 'aqua' },
          { value: 'ready', label: copy.access.ready, count: readyCount, icon: ShieldCheck, tone: 'green' },
          { value: 'attention', label: copy.access.attention, count: employees.length - readyCount, icon: AlertTriangle, tone: 'amber' },
        ]}
      />

      <aside className="rounded-2xl border border-[#59C3A5]/40 bg-[#59C3A5]/10 p-4 text-sm text-slate-700 dark:border-emerald-800 dark:bg-emerald-950/25 dark:text-slate-200">
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#177D66] dark:text-emerald-300" />
          <div><h3 className="font-medium text-slate-900 dark:text-white">{copy.access.guidanceTitle}</h3><p className="mt-1 leading-6">{copy.access.guidance}</p><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{copy.access.readinessNote}</p></div>
        </div>
      </aside>

      <IndiceFilterBar
        title={copy.access.filtersTitle}
        subtitle={copy.access.filtersSubtitle}
        summary={copy.access.resultCount(filteredRows.length, employees.length)}
        gridClassName="grid-cols-1"
      >
        <IndiceFilterSearch
          label={copy.access.searchLabel}
          placeholder={copy.access.searchPlaceholder}
          tone="aqua"
          value={search}
          onValueChange={setSearch}
          onClear={() => setSearch('')}
        />
      </IndiceFilterBar>

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          {copy.access.loadError}
        </div>
      ) : loading && employees.length === 0 ? (
        <div className="grid min-h-52 place-items-center rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" aria-busy="true">
          <RefreshCw className="h-6 w-6 animate-spin text-[#177D66]" />
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <UsersRound className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-3 text-base font-medium text-slate-900 dark:text-white">{copy.access.noResults}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.access.noResultsHelp}</p>
        </div>
      ) : (
        <IndiceTableShell>
          <div className="hidden lg:block">
            <Table className="min-w-[980px] text-left">
              <TableHeader className="border-b border-slate-200 bg-slate-50 text-[13px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <TableRow><TableHead className="px-4 font-normal">{copy.access.employee}</TableHead><TableHead className="px-4 font-normal">{copy.access.readiness}</TableHead><TableHead className="px-4 font-normal">{copy.access.reason}</TableHead><TableHead className="px-4 font-normal">{copy.access.organizationScope}</TableHead><TableHead className="px-4 text-right font-normal">{copy.access.reviewAccess}</TableHead></TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredRows.map(({ employee, readiness }) => (
                  <TableRow key={employee.user_company_id} className="align-top hover:bg-[#59C3A5]/5 dark:hover:bg-emerald-950/20">
                    <TableCell className="whitespace-normal px-4 py-4"><p className="text-sm font-medium text-slate-950 dark:text-white">{employee.name}</p><p className="mt-1 text-xs text-slate-500">{employee.email}</p><p className="mt-1 text-xs text-slate-500">{employee.role}</p></TableCell>
                    <TableCell className="px-4 py-4"><ReadinessPill state={readiness.ready ? 'ready' : 'attention'} label={readiness.ready ? copy.access.ready : copy.access.attention} /></TableCell>
                    <TableCell className="max-w-[280px] whitespace-normal px-4 py-4 text-sm text-slate-700 dark:text-slate-200">{reasonFor(employee, readiness)}</TableCell>
                    <TableCell className="px-4 py-4"><div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><Building2 className="h-4 w-4 text-slate-400" /><span>{employee.business_name ?? employee.unit_name ?? copy.access.corporate}</span></div></TableCell>
                    <TableCell className="px-4 py-4 text-right">{readiness.ready ? <span className="text-xs text-slate-400">—</span> : <Button type="button" variant="outline" onClick={() => onReviewAccess(employee)} className="h-10 border-[#59C3A5]/60 text-[#177D66] hover:bg-[#59C3A5]/10"><ArrowUpRight className="mr-2 h-4 w-4" />{copy.access.reviewAccess}</Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 p-3 lg:hidden sm:grid-cols-2">
            {filteredRows.map(({ employee, readiness }) => (
              <article key={employee.user_company_id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-medium text-slate-950 dark:text-white">{employee.name}</h3><p className="mt-1 truncate text-xs text-slate-500">{employee.email}</p></div><ReadinessPill state={readiness.ready ? 'ready' : 'attention'} label={readiness.ready ? copy.access.ready : copy.access.attention} /></div>
                <p className="mt-3 text-xs text-slate-500">{employee.role} · {employee.business_name ?? employee.unit_name ?? copy.access.corporate}</p>
                <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{reasonFor(employee, readiness)}</p>
                {!readiness.ready ? <Button type="button" variant="outline" onClick={() => onReviewAccess(employee)} className="mt-4 h-10 w-full border-[#59C3A5]/60 text-[#177D66] hover:bg-[#59C3A5]/10"><ArrowUpRight className="mr-2 h-4 w-4" />{copy.access.reviewAccess}</Button> : null}
              </article>
            ))}
          </div>
        </IndiceTableShell>
      )}
    </div>
  );
}
