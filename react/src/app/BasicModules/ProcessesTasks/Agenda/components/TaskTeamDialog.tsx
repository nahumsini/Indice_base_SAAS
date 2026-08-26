import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, History, Loader2, Save, UsersRound } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import {
  listProcessTaskEvents,
  patchProcessTask,
  updateProcessTaskContribution,
  type TaskAssignee,
  type TaskContributionStatus,
  type TaskEvent,
} from '../../Tasks/tasksApi';
import type { ProcessCollaboratorOption } from '../../Processes/types';
import {
  TaskAssigneeSelector,
  type TaskAssigneeSelection,
  type TaskAssigneeSelectorOption,
} from '../../shared/TaskAssigneeSelector';
import type { AgendaTaskItem } from '../agendaApi';

interface TaskTeamDialogProps {
  collaboratorOptions: ProcessCollaboratorOption[];
  currentUserCompanyId?: number | null;
  onChanged: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  task: AgendaTaskItem | null;
}

const statusStyles: Record<TaskContributionStatus, string> = {
  pending: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  working: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300',
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300',
};

const statusLabels: Record<TaskContributionStatus, string> = {
  pending: 'Pendiente',
  working: 'Trabajando',
  ready: 'Parte lista',
};

function eventLabel(event: TaskEvent) {
  const actor = event.actorName || 'Sistema';
  const subject = event.subjectName || '';

  switch (event.eventType) {
    case 'task_created':
      return `${actor} creó la tarea`;
    case 'assignee_added':
      return `${actor} agregó a ${subject || 'una persona'} al equipo`;
    case 'assignee_removed':
      return `${actor} retiró a ${subject || 'una persona'} del equipo`;
    case 'assignee_role_changed':
      return `${subject || actor} cambió de rol en el equipo`;
    case 'contribution_working':
      return `${actor} comenzó a trabajar en su parte`;
    case 'contribution_ready':
      return `${actor} marcó su parte como lista`;
    case 'contribution_pending':
      return `${actor} volvió a marcar su parte como pendiente`;
    case 'task_completed':
      return `${actor} cerró la tarea del equipo`;
    case 'task_reopened':
      return `${actor} reabrió la tarea`;
    case 'task_audited':
      return `${actor} auditó la tarea`;
    case 'task_cancelled':
      return `${actor} canceló la tarea`;
    case 'follow_up_added':
      return `${actor} agregó una nota de seguimiento`;
    default:
      return `${actor} actualizó la tarea`;
  }
}

function eventDate(value: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function TaskTeamDialog({
  collaboratorOptions,
  currentUserCompanyId = null,
  onChanged,
  onOpenChange,
  open,
  task,
}: TaskTeamDialogProps) {
  const [members, setMembers] = useState<TaskAssignee[]>([]);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TaskContributionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserCompanyIds, setSelectedUserCompanyIds] = useState<number[]>([]);
  const [leadUserCompanyId, setLeadUserCompanyId] = useState<number | null>(null);
  const [savedUserCompanyIds, setSavedUserCompanyIds] = useState<number[]>([]);
  const [savedLeadUserCompanyId, setSavedLeadUserCompanyId] = useState<number | null>(null);

  useEffect(() => {
    const nextMembers = task?.assignees ?? [];
    const nextIds = task?.assigneeUserCompanyIds.length
      ? task.assigneeUserCompanyIds
      : task?.assignedUserCompanyId != null
        ? [task.assignedUserCompanyId]
        : [];
    const nextLeadId = task?.assignedUserCompanyId ?? nextIds[0] ?? null;

    setMembers(nextMembers);
    setSelectedUserCompanyIds(nextIds);
    setLeadUserCompanyId(nextLeadId);
    setSavedUserCompanyIds(nextIds);
    setSavedLeadUserCompanyId(nextLeadId);
  }, [task]);

  useEffect(() => {
    if (!open || !task) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void listProcessTaskEvents(task.taskId)
      .then((items) => {
        if (!cancelled) setEvents(items);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'No fue posible cargar la trazabilidad.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, task]);

  const currentMember = useMemo(() => members.find((member) => member.isCurrentUser) ?? null, [members]);
  const assignmentOptions = useMemo(() => {
    const options: TaskAssigneeSelectorOption[] = collaboratorOptions.map((collaborator) => ({
      email: collaborator.email,
      name: collaborator.name,
      userCompanyId: collaborator.userCompanyId,
    }));
    members.forEach((member) => {
      if (options.some((option) => option.userCompanyId === member.userCompanyId)) return;
      options.push({
        email: member.email,
        name: member.name || `Usuario #${member.userCompanyId}`,
        userCompanyId: member.userCompanyId,
      });
    });
    return options.sort((left, right) => {
      if (left.userCompanyId === currentUserCompanyId) return -1;
      if (right.userCompanyId === currentUserCompanyId) return 1;
      return left.name.localeCompare(right.name, 'es-MX');
    });
  }, [collaboratorOptions, currentUserCompanyId, members]);
  const assignmentsChanged = useMemo(() => {
    const selected = [...selectedUserCompanyIds].sort((left, right) => left - right);
    const saved = [...savedUserCompanyIds].sort((left, right) => left - right);
    return leadUserCompanyId !== savedLeadUserCompanyId
      || selected.length !== saved.length
      || selected.some((id, index) => id !== saved[index]);
  }, [leadUserCompanyId, savedLeadUserCompanyId, savedUserCompanyIds, selectedUserCompanyIds]);
  const readyCount = members.filter((member) => member.contributionStatus === 'ready').length;
  const progress = members.length > 0 ? Math.round((readyCount / members.length) * 100) : 0;
  const assignmentLocked = task?.status === 'completed' || task?.status === 'cancelled';
  const isBusy = pendingStatus != null || isSavingAssignments;

  const updateAssignmentSelection = ({ leadUserCompanyId: nextLeadId, userCompanyIds }: TaskAssigneeSelection) => {
    setLeadUserCompanyId(nextLeadId);
    setSelectedUserCompanyIds(userCompanyIds);
    setError(null);
  };

  const saveAssignments = async () => {
    if (!task || leadUserCompanyId == null || selectedUserCompanyIds.length === 0) {
      setError('Selecciona al menos una persona responsable.');
      return;
    }
    if (selectedUserCompanyIds.length > 2) {
      setError('La asignación rápida permite un máximo de dos personas.');
      return;
    }

    const lead = assignmentOptions.find((option) => option.userCompanyId === leadUserCompanyId);
    if (!lead) {
      setError('No fue posible identificar a la persona responsable principal.');
      return;
    }

    setIsSavingAssignments(true);
    setError(null);
    try {
      const updated = await patchProcessTask(task.taskId, {
        assignedName: lead.name,
        assignedUserCompanyId: lead.userCompanyId,
        assigneeUserCompanyIds: selectedUserCompanyIds,
      });
      setMembers(updated.assignees);
      setSelectedUserCompanyIds(updated.assigneeUserCompanyIds);
      setLeadUserCompanyId(updated.assignedUserCompanyId);
      setSavedUserCompanyIds(updated.assigneeUserCompanyIds);
      setSavedLeadUserCompanyId(updated.assignedUserCompanyId);
      setEvents(await listProcessTaskEvents(task.taskId));
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible guardar a las personas responsables.');
    } finally {
      setIsSavingAssignments(false);
    }
  };

  const markContribution = async (status: TaskContributionStatus) => {
    if (!task) return;
    setPendingStatus(status);
    setError(null);
    try {
      const updated = await updateProcessTaskContribution(task.taskId, status);
      setMembers(updated.assignees);
      setEvents(await listProcessTaskEvents(task.taskId));
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible actualizar tu participación.');
    } finally {
      setPendingStatus(null);
    }
  };

  return (
    <IndiceModalFrame
      busy={isBusy}
      closeLabel="Cerrar"
      description={task ? `${task.folio} · Cada integrante entrega su parte; el coordinador realiza el cierre final.` : ''}
      footer={(
        <>
          <Button type="button" variant="outline" disabled={isBusy} onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            type="button"
            disabled={isBusy || assignmentLocked || !assignmentsChanged || leadUserCompanyId == null || selectedUserCompanyIds.length === 0}
            onClick={() => void saveAssignments()}
          >
            {isSavingAssignments ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar responsables
          </Button>
        </>
      )}
      footerSummary={task ? `${readyCount}/${members.length} partes listas` : undefined}
      icon={<UsersRound className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={onOpenChange}
      open={open}
      title="Responsables y trabajo en equipo"
      tone="yellow"
    >
      <div className="space-y-5">
        <IndiceModalValidation messages={error ? [error] : []} />

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">¿Quién realizará la tarea?</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Elige una o dos personas. Selecciona tu nombre si también harás una parte; la primera persona será la responsable principal.
            </p>
          </div>
          <TaskAssigneeSelector
            copy={{
              lead: 'Responsable principal',
              limit: (max) => `Máximo ${max} personas`,
              makeLead: 'Hacer responsable principal',
              selected: (count, max) => `${count} de ${max} seleccionados`,
              you: 'Tú',
            }}
            currentUserCompanyId={currentUserCompanyId}
            disabled={isBusy || assignmentLocked}
            leadUserCompanyId={leadUserCompanyId}
            maxSelections={2}
            onChange={updateAssignmentSelection}
            options={assignmentOptions}
            selectedUserCompanyIds={selectedUserCompanyIds}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{task?.title}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {readyCount === members.length && members.length > 0
                  ? 'El equipo está listo para que el coordinador cierre la tarea.'
                  : `Faltan ${Math.max(0, members.length - readyCount)} aportaciones por entregar.`}
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
              {progress}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">Personas responsables</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {members.map((member) => (
              <div key={member.userCompanyId} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8C842]/20 text-sm font-medium text-[#8A6200]">
                  {(member.name || '?').slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{member.name || `Usuario #${member.userCompanyId}`}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {member.role === 'lead' ? 'Coordinador' : 'Colaborador'}{member.isCurrentUser ? ' · Tú' : ''}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${statusStyles[member.contributionStatus]}`}>
                  {statusLabels[member.contributionStatus]}
                </span>
              </div>
            ))}
          </div>
        </section>

        {currentMember && task?.status !== 'completed' && task?.status !== 'cancelled' ? (
          <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
            <p className="text-sm font-medium text-blue-950 dark:text-blue-100">Actualiza tu aportación</p>
            <p className="mt-1 text-xs leading-5 text-blue-700 dark:text-blue-300">
              Este estado es individual y queda registrado en la trazabilidad del equipo.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pendingStatus != null || currentMember.contributionStatus === 'working'}
                onClick={() => void markContribution('working')}
              >
                {pendingStatus === 'working' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}
                Estoy trabajando
              </Button>
              <Button
                type="button"
                disabled={pendingStatus != null || currentMember.contributionStatus === 'ready'}
                onClick={() => void markContribution('ready')}
              >
                {pendingStatus === 'ready' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Mi parte está lista
              </Button>
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">Trazabilidad</h3>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando actividad…
            </div>
          ) : events.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500 dark:bg-slate-900/60">Todavía no hay actividad registrada.</p>
          ) : (
            <ol className="space-y-2">
              {events.map((event) => (
                <li key={event.id} className="border-l-2 border-[#F8C842] py-1 pl-3">
                  <p className="text-sm text-slate-700 dark:text-slate-200">{eventLabel(event)}</p>
                  {event.detail ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{event.detail}</p> : null}
                  <time className="mt-1 block text-[11px] text-slate-400">{eventDate(event.createdAt)}</time>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </IndiceModalFrame>
  );
}
