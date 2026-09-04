import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, History } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import { listProcessRuns, type ProcessRun } from '../processesApi';
import type { ProcessRecord } from '../types';

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function taskStatusLabel(status: string, es: boolean) {
  const labels: Record<string, readonly [string, string]> = {
    pending: ['Pendiente', 'Pending'],
    in_progress: ['En progreso', 'In progress'],
    paused: ['Pausada', 'Paused'],
    completed: ['Completada', 'Completed'],
    cancelled: ['Cancelada', 'Cancelled'],
  };
  const label = labels[status];
  return label ? label[es ? 0 : 1] : status;
}

export function ProcessRunsDialog({
  locale,
  onOpenChange,
  open,
  process,
}: {
  locale: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  process: ProcessRecord | null;
}) {
  const es = locale.toLowerCase().startsWith('es');
  const [runs, setRuns] = useState<ProcessRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !process) return;
    setRuns([]); setLoading(true); setError(null);
    void listProcessRuns(process.id)
      .then((response) => setRuns(response.items))
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Unable to load process runs.'))
      .finally(() => setLoading(false));
  }, [open, process]);

  return <IndiceModalFrame
    busy={loading}
    closeLabel={es ? 'Cerrar' : 'Close'}
    contentClassName="sm:!max-w-[960px]"
    description={process ? `${process.folio} · ${process.title}` : undefined}
    footer={<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{es ? 'Cerrar' : 'Close'}</Button>}
    footerSummary={`${runs.length} ${es ? 'ejecuciones' : 'runs'}`}
    icon={<History className="h-5 w-5" />}
    modalType="operational-workspace"
    onOpenChange={onOpenChange}
    open={open}
    title={es ? 'Ver ejecuciones' : 'View runs'}
    tone="yellow"
  >
    <div className="space-y-4">
      <IndiceModalValidation messages={error ? [error] : []} />
      {!loading && runs.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">{es ? 'Este proceso todavía no tiene ejecuciones.' : 'This process has no runs yet.'}</div> : null}
      {runs.map((run) => {
        const resolved = run.completedTasks + run.cancelledTasks;
        return <details key={run.id} className="group rounded-2xl border bg-white p-4 open:shadow-sm dark:bg-slate-800">
          <summary className="cursor-pointer list-none">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div><div className="flex flex-wrap items-center gap-2"><strong>{run.reference}</strong><span className="rounded-full border px-2 py-0.5 text-xs">{run.folio}</span><span className="rounded-full border px-2 py-0.5 text-xs">v{run.version}</span></div><p className="mt-1 text-sm text-slate-500">{run.startDate} · {run.coordinator || (es ? 'Sin coordinador' : 'No coordinator')}</p></div>
              <div className="text-sm md:text-right"><strong>{run.completedTasks}/{run.totalTasks}</strong><p className="text-slate-500">{resolved}/{run.totalTasks} {es ? 'resueltas' : 'resolved'}</p></div>
              <StatusBadge run={run} es={es} />
            </div>
          </summary>
          <div className="mt-4 space-y-2 border-t pt-4">{run.tasks.map((task) => {
            const waiting = task.status === 'pending' && task.scheduledDate > localToday();
            return <div key={task.id} className="grid gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900 md:grid-cols-[1fr_auto]"><div><p className="text-sm font-medium">{task.folio} · {task.title}</p><p className="mt-1 text-xs text-slate-500">{es ? 'Etapa' : 'Stage'} {task.stage} · {task.assignees.join(', ') || (es ? 'Sin responsable' : 'Unassigned')}{task.evidenceRequired ? ` · ${task.attachmentCount} ${es ? 'evidencias' : 'evidence files'}` : ''}</p></div><div className="text-xs md:text-right"><p className="font-medium">{waiting ? (es ? 'En espera' : 'Waiting') : taskStatusLabel(task.status, es)}</p><p className="text-slate-500">{task.scheduledDate} → {task.dueDate}</p></div></div>;
          })}</div>
        </details>;
      })}
    </div>
  </IndiceModalFrame>;
}

function StatusBadge({ run, es }: { run: ProcessRun; es: boolean }) {
  const incident = run.status === 'finalized_with_incidents';
  const done = run.status === 'finalized';
  const label = incident ? (es ? 'Finalizada con incidencias' : 'Finalized with incidents')
    : done ? (es ? 'Finalizada' : 'Finalized')
      : run.status === 'in_progress' ? (es ? 'En progreso' : 'In progress') : (es ? 'Pendiente' : 'Pending');
  return <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${incident || run.requiresAttention ? 'border-amber-300 bg-amber-50 text-amber-800' : done ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>{incident || run.requiresAttention ? <AlertTriangle className="h-3.5 w-3.5" /> : done ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}{label}{run.hasDelays ? ` · ${es ? 'con retrasos' : 'delayed'}` : ''}</span>;
}
