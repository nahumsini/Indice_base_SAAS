import { TableCell } from '../../../../components/ui/table';
import type { TaskMeasurements } from '../measurements';
import type { TaskKpiEntity, TaskKpiWorkspaceCopy } from '../translations/workspaceCopy';
export function measurementColumns(c: TaskKpiWorkspaceCopy, entity: TaskKpiEntity) {
  return [
    { id: 'workloadMeasure', label: c.open },
    { id: 'deliveryMeasure', label: c.onTime },
    { id: 'qualityMeasure', label: c.quality },
    ...(entity === 'processes' ? [{ id: 'runMeasure', label: c.runs }] : []),
    ...(entity === 'projects' ? [{ id: 'projectDeadline', label: c.projectLate }] : []),
  ];
}
export function measurementSortValue(m: TaskMeasurements | null, column: string, deadlineExceeded?: boolean): number | null | undefined {
  switch (column) {
    case 'workloadMeasure': return m?.openTasks ?? null;
    case 'deliveryMeasure': return m?.onTimeRate ?? null;
    case 'qualityMeasure': return m?.averageRating ?? null;
    case 'runMeasure': return m?.runsWithLateTasks ?? null;
    case 'projectDeadline': return deadlineExceeded ? 1 : 0;
    default: return undefined;
  }
}
export function KpiMeasurementCells({ m, visible, c, locale, deadlineExceeded }: {
  m: TaskMeasurements | null; visible: Set<string>; c: TaskKpiWorkspaceCopy; locale: string; deadlineExceeded?: boolean;
}) {
  const n = (value: number | null | undefined, suffix = '') => value == null ? c.noSample : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)}${suffix}`;
  const detail = 'mt-1 text-xs text-slate-500 dark:text-slate-400';
  return <>
    {visible.has('workloadMeasure') ? <TableCell className="px-4 py-3">{n(m?.openTasks)}<p className={detail}>{c.late}: {n(m?.lateOpenTasks)} · {c.highPriority}: {n(m?.highPriorityOpenTasks)}</p></TableCell> : null}
    {visible.has('deliveryMeasure') ? <TableCell className="px-4 py-3">{n(m?.onTimeRate, '%')}<p className={detail}>{n(m?.onTimeDeliveries)} / {n(m?.eligibleDeliveries)}</p></TableCell> : null}
    {visible.has('qualityMeasure') ? <TableCell className="px-4 py-3">{n(m?.averageRating, '/5')}<p className={detail}>{c.sample}: {n(m?.ratedTasks)}</p></TableCell> : null}
    {visible.has('runMeasure') ? <TableCell className="px-4 py-3">{n(m?.observedRuns)}<p className={detail}>{c.lateRuns}: {n(m?.runsWithLateTasks)} · {c.completeRuns}: {n(m?.fullyObservedCompletedRuns)}</p></TableCell> : null}
    {visible.has('projectDeadline') ? <TableCell className="px-4 py-3"><span className={deadlineExceeded ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500'}>{deadlineExceeded ? c.projectLate : '—'}</span></TableCell> : null}
  </>;
}
