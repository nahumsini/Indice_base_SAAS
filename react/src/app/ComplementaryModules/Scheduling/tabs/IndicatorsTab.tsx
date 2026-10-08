import { useCallback, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { Link } from 'react-router';
import { IndiceTitleBar } from '../../../components/frontend-os/IndiceTitleBar';
import { IndiceFilterBar } from '../../../components/frontend-os/IndiceFilterBar';
import { IndiceFilterDisclosureActions, useIndiceFilterDisclosureCopy } from '../../../components/frontend-os/IndiceFilterDisclosure';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import { schedulingApi } from '../services/schedulingApi';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { ActionButton, controlClass, Feedback, Field, panelClass } from '../components/SchedulingPrimitives';
import { dateInput, dateScope } from '../utils/dateScope';
import { schedulingEmoji, schedulingTone } from '../utils/schedulingIdentity';

export default function IndicatorsTab({ copy, locale, canInspect }: { copy: SchedulingCopy; locale: string; canInspect: boolean }) {
  const defaults = { from: dateInput(new Date(Date.now() - 30 * 86400000)), to: dateInput(new Date(Date.now() + 30 * 86400000)) };
  const [range, setRange] = useState(defaults);
  const filterCopy = useIndiceFilterDisclosureCopy();
  const query = useSchedulingQuery(useCallback((signal: AbortSignal) => schedulingApi.metrics(dateScope(range.from, range.to), signal), [range.from, range.to]));
  useWorkspaceNavigationMemory({ moduleKey: 'scheduling', tabKey: 'indicators', state: range, defaults, urlFields: { from: 'from', to: 'to' },
    onRestore: state => { if (/^\d{4}-\d{2}-\d{2}$/.test(state.from) && /^\d{4}-\d{2}-\d{2}$/.test(state.to)) setRange(state); } });
  return <>
    <IndiceTitleBar tone={schedulingTone} title={copy.indicators} subtitle={copy.metricsHint} icon={schedulingEmoji.indicators} actions={<ActionButton onClick={query.reload} disabled={query.loading}><RotateCw className="h-4 w-4"/>{copy.refresh}</ActionButton>} />
    <IndiceFilterBar title={copy.filters} summary={<IndiceFilterDisclosureActions tone={schedulingTone} showAdvancedToggle={false}
      activeAdvancedCount={0} isAdvancedOpen={false} advancedLabel={filterCopy.moreFilters} onToggleAdvanced={()=>{}}
      hasActiveFilters={range.from!==defaults.from||range.to!==defaults.to} clearLabel={filterCopy.clearFilters} onClear={()=>setRange(defaults)}/> }>
      {(['from', 'to'] as const).map(key => <Field key={key} label={copy[key]}><input className={controlClass} type="date" value={range[key]} onChange={e => setRange({ ...range, [key]: e.target.value })} /></Field>)}</IndiceFilterBar>
    {query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}</Feedback> : query.data && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{([
        [copy.REQUESTED, query.data.requests, 'REQUESTED'], [copy.CONFIRMED, query.data.confirmed, 'CONFIRMED'], [copy.COMPLETED, query.data.completed, 'COMPLETED'], [copy.NO_SHOW, query.data.noShow, 'NO_SHOW'], [copy.CANCELLED, query.data.cancelled, 'CANCELLED'],
        [copy.attendance, query.data.attendanceRate === null ? '—' : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(query.data.attendanceRate)}%`, null],
      ] as const).map(([label, value, status]) => <section key={label} className={panelClass}><h3 className="text-sm font-medium text-slate-500 dark:text-slate-300">{label}</h3>
        <p className="mt-3 text-3xl font-medium">{typeof value === 'number' ? new Intl.NumberFormat(locale).format(value) : value}</p>
        {status && canInspect && <Link className="mt-3 inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-[#B63B32] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:text-[#FFB0AA]" to={`/scheduling/calendar?${new URLSearchParams({ ...range, status, view: 'table' })}`}>{copy.inspect}</Link>}
        {!status && <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-300">{query.data!.attendanceRate === null ? copy.noAttendance : copy.attendanceFormula}</p>}</section>)}</div>
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.sourceMetrics}</p>
    </>}
  </>;
}
