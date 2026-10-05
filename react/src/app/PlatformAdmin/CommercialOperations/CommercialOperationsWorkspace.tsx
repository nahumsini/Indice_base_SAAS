import { useMemo, useState } from 'react';
import { BriefcaseBusiness, RefreshCw } from 'lucide-react';
import { getCachedAuthSession } from '../../api/authSessionStore';
import { useAuthorizationRevision } from '../../hooks/useAuthorizationRevision';
import { useWorkspaceNavigationMemory } from '../../hooks/useWorkspaceNavigationMemory';
import { usePersistentColumnWidths } from '../../hooks/usePersistentColumnWidths';
import { IndiceFilterBar, IndiceFilterSearch, IndiceFilterSelect, IndiceTitleBar, IndiceViewState, IndiceWorkspaceNavigation } from '../../components/frontend-os';
import { getIndiceTableMinimumWidth, IndiceOperationalTable, IndiceTableColGroup, IndiceTableHeaderRow, IndiceTableShell } from '../../components/table/IndiceTableEngine';
import { TableBody, TableCell, TableRow } from '../../components/ui/table';
import { commercialCopy } from './copy';
import { attentionFor, canadaSteps, filterCompanies, mexicoSteps, registeredCountry, type Attention, type CommercialView, type DeadlineFilter, type DistributorFilter } from './model';
import { commercialButton, CommercialAccountModal, type CommercialActions } from './CommercialAccountModal';
import { useCommercialAccounts } from './useCommercialAccounts';

const defaults = { view: 'pending' as CommercialView, attention: 'all' as 'all' | Attention, distributor: 'all' as DistributorFilter, deadline: 'all' as DeadlineFilter };
const columnDefaults = { company: 300, registeredCountry: 180, attention: 270, distributor: 230 };

export function CommercialOperationsWorkspace(props: CommercialActions & { locale: string }) {
  const revision = useAuthorizationRevision();
  const session = getCachedAuthSession();
  // Discard records and in-flight responses after a session or permission change.
  return <CommercialAccounts key={`${session?.company.id}:${session?.user.id}:${revision}`} {...props} />;
}

function CommercialAccounts({ locale, ...actions }: CommercialActions & { locale: string }) {
  const c = useMemo(() => commercialCopy(locale), [locale]);
  const [filters, setFilters] = useState(defaults);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const state = useCommercialAccounts(query);
  const now = Date.now();
  const matches = filterCompanies(state.accounts, filters, now);
  const hasMore = state.pagination.page < state.pagination.total_pages;
  useWorkspaceNavigationMemory({
    moduleKey: 'platform-admin', tabKey: 'commercial-operations', state: filters, defaults,
    urlFields: { view: 'commercialView', attention: 'commercialAttention', distributor: 'commercialDistributor', deadline: 'commercialDeadline' },
    onRestore: restored => setFilters({
      view: ['pending', 'MX', 'CA'].includes(restored.view) ? restored.view : 'pending',
      attention: ['all', 'billing', 'trial', 'country', 'review'].includes(restored.attention) ? restored.attention : 'all',
      distributor: ['all', 'assigned', 'unassigned'].includes(restored.distributor) ? restored.distributor : 'all',
      deadline: ['all', 'overdue', 'week', 'undated'].includes(restored.deadline) ? restored.deadline : 'all',
    }),
  });
  const labels = useMemo(() => ({ company: c.company, registeredCountry: c.registeredCountry, attention: c.attention, distributor: c.distributor }), [c]);
  const { columnWidths, resizeColumn } = usePersistentColumnWidths({ defaults: columnDefaults, headerLabels: labels, storageKey: 'indice:commercial-operations:columns' });
  const columns = (Object.keys(columnDefaults) as Array<keyof typeof columnDefaults>).map(id => ({ id, label: labels[id], width: columnWidths[id], defaultWidth: columnDefaults[id], contentMinimumWidth: 140, resizeLabel: labels[id] }));
  const view = filters.view;
  return <section className="min-w-0 space-y-5" data-testid="commercial-operations">
    <IndiceTitleBar tone="blue" title={c.title} subtitle={c.subtitle} icon={<BriefcaseBusiness className="h-6 w-6" />}
      actions={<button type="button" disabled={state.loading} className={commercialButton} onClick={state.refresh}><RefreshCw size={16} />{c.refresh}</button>} />
    <IndiceWorkspaceNavigation ariaLabel={c.title} tone="blue" variant="sections" value={view}
      onValueChange={value => setFilters(current => ({ ...current, view: value }))}
      items={(['pending', 'MX', 'CA'] as const).map(id => ({ id, label: c[id] }))} />
    {view !== 'pending' ? <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
      <h3 className="font-semibold">{c.guide} · {c[view]}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{view === 'MX' ? c.mxHelp : c.caHelp}</p>
      <ol className="my-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">{(view === 'MX' ? mexicoSteps : canadaSteps).map((step, index) => <li key={step} className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm dark:bg-slate-800"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">{index + 1}</span>{c[step]}</li>)}</ol>
      <p className="text-xs text-slate-500 dark:text-slate-400">{c.guideHelp} {c.countryHelp}</p>
    </section> : <p className="text-sm text-slate-600 dark:text-slate-300">{c.nextActionHelp}</p>}
    <IndiceFilterBar title={c.filters} gridClassName="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      <IndiceFilterSearch label={c.search} placeholder={c.search} tone="blue" value={query} onValueChange={setQuery} clearLabel={c.clear} onClear={() => setQuery('')} />
      <IndiceFilterSelect label={c.attention} tone="blue" value={filters.attention} onValueChange={value => setFilters(current => ({ ...current, attention: value as typeof filters.attention }))} options={(['all', 'billing', 'trial', 'country', 'review'] as const).map(value => ({ value, label: c[value] }))} />
      <IndiceFilterSelect label={c.distributor} tone="blue" value={filters.distributor} onValueChange={value => setFilters(current => ({ ...current, distributor: value as DistributorFilter }))} options={(['all', 'assigned', 'unassigned'] as const).map(value => ({ value, label: c[value] }))} />
      <IndiceFilterSelect label={c.deadline} tone="blue" value={filters.deadline} onValueChange={value => setFilters(current => ({ ...current, deadline: value as DeadlineFilter }))} options={(['all', 'overdue', 'week', 'undated'] as const).map(value => ({ value, label: c[value] }))} />
    </IndiceFilterBar>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      {state.pagination.page > 0 ? <p role="status">{c.loaded}: {state.accounts.length} / {state.pagination.total_items} · {c.matching}: {matches.length}</p> : <span />}
      <button type="button" className={commercialButton} onClick={() => { setQuery(''); setFilters({ ...defaults, view }); }}>{c.clear}</button>
    </div>
    {hasMore ? <p className="text-sm text-slate-500 dark:text-slate-400">{c.coverage}</p> : null}
    {state.error ? <IndiceViewState compact tone="blue" variant={state.error === 'denied' ? 'restricted' : 'error'} title={c[state.error]}
      action={<button className={commercialButton} onClick={hasMore ? state.more : state.refresh} disabled={state.loading}>{c.refresh}</button>} /> : null}
    {state.loading ? <IndiceViewState compact tone="blue" variant="loading" title={c.loading} /> : null}
    {matches.length ? <>
      <div className="hidden md:block"><IndiceTableShell><IndiceOperationalTable minimumWidth={getIndiceTableMinimumWidth({ columns, actionsWidth: 190 })}>
        <IndiceTableColGroup columns={columns} actionsWidth={190} />
        <IndiceTableHeaderRow columns={columns} actions={{ label: c.actions, width: 190 }} onResize={resizeColumn} tone="blue" />
        <TableBody>{matches.map(company => <TableRow key={company.id}>
          <TableCell className="whitespace-normal break-words"><p className="font-medium">{company.name}</p><p className="mt-1 text-xs text-slate-500">{company.owner_email || c.missing}</p></TableCell>
          <TableCell>{registeredCountry(company) || c.country}</TableCell><TableCell className="whitespace-normal">{c[attentionFor(company, now)]}</TableCell>
          <TableCell className="whitespace-normal break-words">{company.distributor_company_name || c.unassigned}</TableCell>
          <TableCell><button type="button" className={commercialButton} onClick={() => setSelected(company.id)}>{c.open}</button></TableCell>
        </TableRow>)}</TableBody>
      </IndiceOperationalTable></IndiceTableShell></div>
      <ul className="grid gap-3 md:hidden">{matches.map(company => <li key={company.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="break-words font-semibold">{company.name}</h3><p className="mt-1 break-words text-sm text-slate-500">{company.owner_email || c.missing}</p>
        <p className="mt-3 text-sm">{registeredCountry(company) || c.country} · {c[attentionFor(company, now)]}</p>
        <p className="mt-1 break-words text-sm text-slate-500">{company.distributor_company_name || c.unassigned}</p>
        <button type="button" className={`${commercialButton} mt-4 w-full`} onClick={() => setSelected(company.id)}>{c.open}</button>
      </li>)}</ul>
    </> : !state.loading && !state.error ? <IndiceViewState compact tone="blue" variant="empty" title={c.empty} /> : null}
    {hasMore ? <button type="button" className={`${commercialButton} w-full`} disabled={state.loading} onClick={state.more}>{c.more}</button> : null}
    <aside className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700"><h3 className="font-medium">{c.availability}</h3><p className="mt-1 text-slate-500 dark:text-slate-400">{c.pendingConnection}</p></aside>
    {selected !== null && state.error !== 'denied' ? <CommercialAccountModal key={selected} companyId={selected} locale={locale} onClose={() => setSelected(null)} {...actions} /> : null}
  </section>;
}
