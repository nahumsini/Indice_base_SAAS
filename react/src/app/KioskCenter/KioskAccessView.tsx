import { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  ShieldQuestion,
  UsersRound,
} from 'lucide-react';
import type { MultiKioskCatalogEmployee, MultiKioskCatalogTool } from '../api/multiKiosks';
import {
  IndiceFilterBar,
  IndiceFilterSearch,
  IndiceFilterSelect,
  IndiceTitleBar,
} from '../components/frontend-os';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import type { KioskCenterWorkspaceCopy } from './kioskCenterWorkspaceTranslations';
import { employeeHasRequiredKioskTabScopes } from './multiKioskEmployeeAccess';

type ReadinessFilter = 'all' | 'ready' | 'attention';

type EmployeeReadiness = {
  elevated: boolean;
  issues: string[];
  moduleReady: boolean;
  ready: boolean;
  scopeKnown: boolean;
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
  const scopeKnown = Array.isArray(employee.tab_scopes);
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
  return { elevated, issues, moduleReady, ready, scopeKnown, scopeReady };
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
  onRefresh,
}: {
  copy: KioskCenterWorkspaceCopy;
  employees: MultiKioskCatalogEmployee[];
  error: string;
  tools: MultiKioskCatalogTool[];
  loading: boolean;
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
  const pinCount = employees.filter(employee => employee.pin_ready).length;

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

      <section className="grid gap-3 sm:grid-cols-3" aria-label={copy.access.title}>
        {[
          { label: copy.access.employee, value: employees.length, icon: UsersRound },
          { label: copy.access.pin, value: pinCount, icon: KeyRound },
          { label: copy.access.ready, value: readyCount, icon: ShieldCheck },
        ].map(metric => (
          <article key={metric.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#59C3A5]/15 text-[#177D66] dark:text-emerald-300"><metric.icon className="h-5 w-5" /></span>
            <div><p className="text-xl font-medium tabular-nums text-slate-950 dark:text-white">{metric.value}</p><p className="text-xs text-slate-500 dark:text-slate-400">{metric.label}</p></div>
          </article>
        ))}
      </section>

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
        gridClassName="lg:grid-cols-[minmax(260px,1.5fr)_minmax(220px,0.7fr)]"
      >
        <IndiceFilterSearch
          label={copy.access.searchLabel}
          placeholder={copy.access.searchPlaceholder}
          tone="aqua"
          value={search}
          onValueChange={setSearch}
          onClear={() => setSearch('')}
        />
        <IndiceFilterSelect
          label={copy.access.statusLabel}
          tone="aqua"
          value={readinessFilter}
          onValueChange={value => setReadinessFilter(value as ReadinessFilter)}
          options={[
            { value: 'all', label: copy.access.all },
            { value: 'ready', label: copy.access.ready },
            { value: 'attention', label: copy.access.attention },
          ]}
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
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[980px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <tr><th className="px-4 py-3 font-medium">{copy.access.employee}</th><th className="px-4 py-3 font-medium">{copy.access.assignment}</th><th className="px-4 py-3 font-medium">{copy.access.pin}</th><th className="px-4 py-3 font-medium">{copy.access.modules}</th><th className="px-4 py-3 font-medium">{copy.access.tabScopes}</th><th className="px-4 py-3 font-medium">{copy.access.organizationScope}</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredRows.map(({ employee, readiness }) => (
                  <tr key={employee.user_company_id} className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-4"><p className="text-sm font-medium text-slate-950 dark:text-white">{employee.name}</p><p className="mt-1 text-xs text-slate-500">{employee.email}</p>{readiness.issues.map(issue => <p key={issue} className="mt-1 text-xs text-amber-700 dark:text-amber-300">{copy.access.issueLabels[issue] ?? issue.replace(/_/g, ' ')}</p>)}</td>
                    <td className="px-4 py-4"><p className="text-sm text-slate-800 dark:text-slate-100">{employee.role}</p><p className="mt-1 text-xs text-slate-500">{employee.business_name ?? employee.unit_name ?? copy.access.corporate}</p></td>
                    <td className="px-4 py-4"><ReadinessPill state={employee.pin_ready ? 'ready' : 'attention'} label={employee.pin_ready ? copy.access.configured : copy.access.missing} /></td>
                    <td className="px-4 py-4"><ReadinessPill state={readiness.moduleReady ? 'ready' : 'attention'} label={readiness.elevated ? copy.access.inherited : readiness.moduleReady ? `${employee.module_slugs.length} ${copy.access.modules.toLocaleLowerCase()}` : copy.access.noModules} /></td>
                    <td className="px-4 py-4"><ReadinessPill state={!readiness.scopeKnown ? 'neutral' : readiness.scopeReady ? 'ready' : 'attention'} label={readiness.elevated ? copy.access.inherited : !readiness.scopeKnown ? copy.access.backendValidation : readiness.scopeReady ? `${employee.tab_scopes!.length} ${copy.access.tabScopes.toLocaleLowerCase()}` : copy.access.missing} /></td>
                    <td className="px-4 py-4"><div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><Building2 className="h-4 w-4 text-slate-400" /><span>{employee.business_name ?? employee.unit_name ?? copy.access.corporate}</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-3 lg:hidden sm:grid-cols-2">
            {filteredRows.map(({ employee, readiness }) => (
              <article key={employee.user_company_id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-medium text-slate-950 dark:text-white">{employee.name}</h3><p className="mt-1 truncate text-xs text-slate-500">{employee.email}</p></div><ReadinessPill state={readiness.ready ? 'ready' : 'attention'} label={readiness.ready ? copy.access.ready : copy.access.attention} /></div>
                <p className="mt-3 text-xs text-slate-500">{employee.role} · {employee.business_name ?? employee.unit_name ?? copy.access.corporate}</p>
                <div className="mt-3 flex flex-wrap gap-2"><ReadinessPill state={employee.pin_ready ? 'ready' : 'attention'} label={`${copy.access.pin}: ${employee.pin_ready ? copy.access.configured : copy.access.missing}`} /><ReadinessPill state={readiness.moduleReady ? 'ready' : 'attention'} label={`${copy.access.modules}: ${readiness.moduleReady ? copy.access.configured : copy.access.missing}`} /><ReadinessPill state={!readiness.scopeKnown ? 'neutral' : readiness.scopeReady ? 'ready' : 'attention'} label={`${copy.access.tabScopes}: ${!readiness.scopeKnown ? copy.access.backendValidation : readiness.scopeReady ? copy.access.configured : copy.access.missing}`} /></div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
