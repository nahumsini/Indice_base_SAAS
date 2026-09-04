import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Play } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../../../../components/ui/button';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import { Input } from '../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import {
  createOccasionalProcessRun,
  listOccasionalProcesses,
  previewOccasionalProcessRun,
  type OccasionalProcessOption,
  type ProcessRun,
  type ProcessRunPreview,
} from '../../Processes/processesApi';

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function OccasionalProcessDialog({
  locale,
  onCreated,
  onOpenChange,
  open,
}: {
  locale: string;
  onCreated: (run: ProcessRun) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const es = locale.toLowerCase().startsWith('es');
  const navigate = useNavigate();
  const [options, setOptions] = useState<OccasionalProcessOption[]>([]);
  const [processId, setProcessId] = useState('');
  const [reference, setReference] = useState('');
  const [startDate, setStartDate] = useState(localToday);
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<ProcessRunPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const selected = useMemo(() => options.find((option) => option.id === Number(processId)), [options, processId]);
  const empty = !loading && options.length === 0;

  useEffect(() => {
    if (!open) return;
    setProcessId(''); setReference(''); setNotes(''); setPreview(null); setError(null);
    setStartDate(localToday());
    setIdempotencyKey(globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
    setLoading(true);
    void listOccasionalProcesses()
      .then((response) => setOptions(response.items))
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Unable to load occasional processes.'))
      .finally(() => setLoading(false));
  }, [open]);

  const loadPreview = async () => {
    if (!processId || !reference.trim()) return;
    setLoading(true); setError(null);
    try {
      setPreview(await previewOccasionalProcessRun({ processId: Number(processId), reference: reference.trim(), startDate }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to preview process run.');
    } finally {
      setLoading(false);
    }
  };

  const createRun = async () => {
    if (!preview) return;
    setLoading(true); setError(null);
    try {
      const run = await createOccasionalProcessRun({
        processId: preview.processId,
        reference: reference.trim(),
        startDate,
        notes: notes.trim() || undefined,
        allowDuplicateReference: preview.duplicateReference,
      }, idempotencyKey);
      onCreated(run);
      onOpenChange(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to start process.');
    } finally {
      setLoading(false);
    }
  };

  return <IndiceModalFrame
    busy={loading}
    closeLabel={es ? 'Cerrar' : 'Close'}
    contentClassName="sm:!max-w-[760px]"
    description={es ? 'Elige una plantilla, identifica esta ejecución y revisa todas las tareas antes de crearlas.' : 'Choose a template, identify this run and review every task before creating it.'}
    footer={<>
      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{es ? 'Cancelar' : 'Cancel'}</Button>
      {!preview && !empty
        ? <Button type="button" disabled={loading || !processId || !reference.trim() || !startDate} onClick={() => void loadPreview()}>{es ? 'Revisar tareas' : 'Review tasks'}</Button>
        : preview ? <Button type="button" disabled={loading} onClick={() => void createRun()}><Play className="h-4 w-4" />{preview.duplicateReference ? (es ? 'Crear de todas formas' : 'Create anyway') : (es ? 'Activar proceso' : 'Start process')}</Button> : null}
    </>}
    footerSummary={selected ? `${selected.folio} · ${selected.taskCount} ${es ? 'tareas' : 'tasks'}` : undefined}
    icon={<CalendarPlus className="h-5 w-5" />}
    modalType="standard-form"
    onOpenChange={onOpenChange}
    open={open}
    title={es ? 'Proceso ocasional' : 'Occasional process'}
    tone="yellow"
  >
    <div className="space-y-5">
      <IndiceModalValidation messages={error ? [error] : []} />
      {!preview && empty ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 px-6 py-10 text-center dark:border-amber-900/70 dark:bg-amber-950/20">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#9A6B05] shadow-sm ring-1 ring-amber-200 dark:bg-slate-900 dark:ring-amber-900/70">
            <CalendarPlus className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-base font-medium text-slate-900 dark:text-white">
            {es ? 'Todavía no hay procesos ocasionales' : 'There are no occasional processes yet'}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
            {es
              ? 'Crea una plantilla en Procesos y selecciona Ocasional en el paso Activación. Después podrás iniciarla aquí con una referencia.'
              : 'Create a template in Processes and select Occasional in the Activation step. Then you can start it here with a reference.'}
          </p>
          <Button
            type="button"
            className="mt-5 bg-[#F4C84A] text-slate-950 shadow-sm hover:bg-[#E7B92F]"
            onClick={() => {
              onOpenChange(false);
              navigate('/processes-tasks/processes');
            }}
          >
            {es ? 'Ir a Procesos' : 'Go to Processes'}
          </Button>
        </div>
      ) : !preview ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium">{es ? 'Proceso' : 'Process'}</label><Select value={processId} onValueChange={setProcessId}><SelectTrigger><SelectValue placeholder={es ? 'Selecciona un proceso ocasional' : 'Select an occasional process'} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.id} value={String(option.id)}>{option.folio} · {option.title} · {option.taskCount}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><label className="text-sm font-medium">{es ? 'Referencia' : 'Reference'}</label><Input value={reference} maxLength={220} placeholder="Depa 303 · Linda Vista" onChange={(event) => setReference(event.target.value)} /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{es ? 'Fecha de inicio' : 'Start date'}</label><Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
        <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium">{es ? 'Notas de esta ejecución' : 'Run notes'}</label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
        {startDate < localToday() ? <p className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{es ? 'La fecha está en el pasado; algunas tareas pueden nacer vencidas.' : 'The date is in the past; some tasks may be created overdue.'}</p> : null}
      </div> : <div className="space-y-4">
        {preview.duplicateReference ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{es ? `Ya existen ${preview.matchingRuns} ejecuciones con esta referencia. Verifica que no sea un doble clic.` : `${preview.matchingRuns} runs already use this reference. Check that this is intentional.`}</div> : null}
        <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900"><p className="font-medium">{reference}</p><p className="mt-1 text-sm text-slate-500">{startDate} · v{preview.version}</p></div>
        <div className="space-y-2">{preview.tasks.map((task) => <div key={task.templateId} className="grid gap-2 rounded-xl border p-4 sm:grid-cols-[1fr_auto]"><div><p className="font-medium">{task.position}. {task.title}</p><p className="mt-1 text-sm text-slate-500">{es ? 'Etapa' : 'Stage'} {task.stage} · {task.assignees.join(', ') || (es ? 'Sin responsable' : 'Unassigned')}{task.evidenceRequired ? ` · ${es ? 'Evidencia obligatoria' : 'Evidence required'}` : ''}</p></div><div className="text-sm sm:text-right"><p>{task.scheduledDate}</p><p className="text-slate-500">{es ? 'Vence' : 'Due'} {task.dueDate}</p></div></div>)}</div>
        <Button type="button" variant="ghost" onClick={() => setPreview(null)}>{es ? '← Cambiar datos' : '← Change details'}</Button>
      </div>}
    </div>
  </IndiceModalFrame>;
}
