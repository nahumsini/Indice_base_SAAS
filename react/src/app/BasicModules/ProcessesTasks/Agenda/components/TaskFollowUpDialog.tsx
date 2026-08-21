import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BellRing,
  CalendarDays,
  CircleAlert,
  Clock3,
  Lightbulb,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Send,
  UserRound,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import { cn } from '../../../../components/ui/utils';
import {
  createProcessTaskFollowUp,
  listProcessTaskFollowUps,
  type TaskFollowUp,
  type TaskFollowUpType,
} from '../../Tasks/tasksApi';
import type { AgendaTaskItem } from '../agendaApi';

interface TaskFollowUpDialogProps {
  onChanged: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  task: AgendaTaskItem | null;
}

const entryTypes: Array<{
  description: string;
  icon: ReactNode;
  label: string;
  selectedClassName: string;
  timelineClassName: string;
  value: TaskFollowUpType;
}> = [
  {
    value: 'update',
    label: 'Avance',
    description: 'Qué cambió o qué se completó.',
    icon: <RefreshCw className="h-4 w-4" />,
    selectedClassName: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200',
    timelineClassName: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300',
  },
  {
    value: 'decision',
    label: 'Decisión',
    description: 'Acuerdo tomado por el equipo.',
    icon: <Lightbulb className="h-4 w-4" />,
    selectedClassName: 'border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200',
    timelineClassName: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/50 dark:text-violet-300',
  },
  {
    value: 'blocker',
    label: 'Bloqueo',
    description: 'Algo impide continuar.',
    icon: <CircleAlert className="h-4 w-4" />,
    selectedClassName: 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200',
    timelineClassName: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300',
  },
  {
    value: 'reminder',
    label: 'Recordatorio',
    description: 'Próxima revisión o compromiso.',
    icon: <BellRing className="h-4 w-4" />,
    selectedClassName: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
    timelineClassName: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300',
  },
];

function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatFollowUpDate(value: string | null) {
  if (!value) return 'Sin fecha';
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(parsed);
}

function formatCreatedAt(value: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

export function TaskFollowUpDialog({ onChanged, onOpenChange, open, task }: TaskFollowUpDialogProps) {
  const [items, setItems] = useState<TaskFollowUp[]>([]);
  const [entryType, setEntryType] = useState<TaskFollowUpType>('update');
  const [followUpDate, setFollowUpDate] = useState(todayInputValue);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !task) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setEntryType('update');
    setFollowUpDate(todayInputValue());
    setComment('');

    void listProcessTaskFollowUps(task.taskId)
      .then((records) => {
        if (!cancelled) setItems(records);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'No fue posible cargar la bitácora.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, task]);

  const nextFollowUpDate = useMemo(() => {
    const today = todayInputValue();
    return items
      .map((item) => item.followUpDate)
      .filter((value) => value >= today)
      .sort((left, right) => left.localeCompare(right))[0] ?? null;
  }, [items]);

  const canSave = Boolean(task && followUpDate && comment.trim() && comment.trim().length <= 2000 && !isSaving);

  const saveFollowUp = async () => {
    if (!task || !canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      const created = await createProcessTaskFollowUp(task.taskId, {
        entryType,
        followUpDate,
        comment: comment.trim(),
      });
      setItems((current) => [created, ...current]);
      setEntryType('update');
      setFollowUpDate(todayInputValue());
      setComment('');
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible guardar el seguimiento.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <IndiceModalFrame
      busy={isSaving}
      closeLabel="Cerrar"
      contentClassName="sm:max-w-4xl"
      description={task ? `${task.folio} · Registra avances, acuerdos y fechas sin perder el contexto del equipo.` : ''}
      eyebrow="Bitácora interna"
      footer={(
        <Button type="button" disabled={!canSave} onClick={() => void saveFollowUp()}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Agregar seguimiento
        </Button>
      )}
      footerLeading={(
        <Button type="button" variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      )}
      footerSummary={`${items.length} entrada${items.length === 1 ? '' : 's'}`}
      icon={<MessageSquareText className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={onOpenChange}
      open={open}
      title="Seguimiento de la tarea"
      tone="yellow"
    >
      <div className="space-y-5">
        <IndiceModalValidation messages={error ? [error] : []} />

        <section className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Tarea" value={task?.title || 'Sin título'} />
          <SummaryCard label="Seguimientos" value={String(items.length)} />
          <SummaryCard label="Próxima fecha" value={nextFollowUpDate ? formatFollowUpDate(nextFollowUpDate) : 'Sin programar'} />
        </section>

        <section className="rounded-2xl border border-[#F8C842]/55 bg-[#FFF9E8] p-4 dark:border-[#9c7110]/70 dark:bg-[#9c7110]/10">
          <div>
            <h3 className="text-base font-medium text-slate-900 dark:text-white">Nuevo seguimiento</h3>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
              La entrada mostrará quién la registró y cuándo. El comentario es visible únicamente dentro del equipo con acceso a la tarea.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {entryTypes.map((option) => {
              const selected = option.value === entryType;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  disabled={isSaving}
                  onClick={() => setEntryType(option.value)}
                  className={cn(
                    'rounded-xl border bg-white p-3 text-left transition-colors disabled:opacity-60 dark:bg-slate-900',
                    selected
                      ? option.selectedClassName
                      : 'border-slate-200 text-slate-700 hover:border-[#F8C842] dark:border-slate-700 dark:text-slate-200',
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {option.icon}
                    {option.label}
                  </span>
                  <span className="mt-1 hidden text-xs leading-4 opacity-75 sm:block">{option.description}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <label>
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <CalendarDays className="h-4 w-4 text-[#9A6B05]" /> Fecha de seguimiento
              </span>
              <Input
                type="date"
                value={followUpDate}
                disabled={isSaving}
                onChange={(event) => setFollowUpDate(event.target.value)}
              />
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Puede ser una fecha pasada o un próximo compromiso.</span>
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Comentario interno</span>
              <Textarea
                value={comment}
                disabled={isSaving}
                maxLength={2000}
                rows={4}
                placeholder="Ej. El proveedor confirmó la entrega; revisar evidencia con Operaciones el viernes."
                className="min-h-28 resize-y bg-white dark:bg-slate-950"
                onChange={(event) => setComment(event.target.value)}
              />
              <span className="mt-1 block text-right text-xs text-slate-500 dark:text-slate-400">{comment.length}/2000</span>
            </label>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-medium text-slate-900 dark:text-white">Historial del seguimiento</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Las entradas se conservan como parte de la trazabilidad operativa.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-10 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando bitácora…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
              <MessageSquareText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">Todavía no hay seguimientos</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Registra arriba el primer avance, decisión, bloqueo o recordatorio.</p>
            </div>
          ) : (
            <ol className="space-y-3">
              {items.map((item) => {
                const type = entryTypes.find((option) => option.value === item.entryType) ?? entryTypes[0];
                return (
                  <li key={item.id} className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', type.timelineClassName)}>
                            {type.icon}
                            {type.label}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatFollowUpDate(item.followUpDate)}
                          </span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{item.comment}</p>
                      </div>
                      <div className="shrink-0 text-xs text-slate-500 dark:text-slate-400 sm:max-w-52 sm:text-right">
                        <p className="flex items-center gap-1.5 sm:justify-end">
                          <UserRound className="h-3.5 w-3.5" /> {item.authorName || 'Sistema'}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 sm:justify-end">
                          <Clock3 className="h-3.5 w-3.5" /> {formatCreatedAt(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </IndiceModalFrame>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-white" title={value}>{value}</p>
    </div>
  );
}
