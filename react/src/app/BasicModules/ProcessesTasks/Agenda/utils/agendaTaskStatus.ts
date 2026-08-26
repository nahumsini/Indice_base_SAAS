import type { AgendaTaskItem } from '../agendaApi';
import type {
  AgendaFocusFilter,
  AgendaKanbanColumnId,
  AgendaLoadRange,
  AgendaStatus,
  DisplayTaskStatus,
  PeriodFilter,
  StatusFilter,
} from '../types';

export const maximumAuditWeighting = 5;

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function normalizeWeighting(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(maximumAuditWeighting, value));
}

export function formatWeightingScore(value: number | null | undefined, emptyLabel: string) {
  const normalizedWeighting = normalizeWeighting(value);
  return normalizedWeighting == null ? emptyLabel : `${normalizedWeighting}/${maximumAuditWeighting}`;
}

export function taskDueDateValue(task: AgendaTaskItem) {
  return task.agendaDate || task.dueDate || null;
}

function dateKeyFromDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  return value.slice(0, 10);
}

function todayDateKey() {
  return toDateKey(new Date());
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDateInRange(dateKey: string | null, range: AgendaLoadRange) {
  return Boolean(dateKey && dateKey >= range.from && dateKey <= range.to);
}

function taskExistsByDate(task: AgendaTaskItem, dateKey: string) {
  const createdDate = dateKeyFromDateTime(task.createdAt);
  return !createdDate || createdDate <= dateKey;
}

function taskClosedDateValue(task: AgendaTaskItem) {
  return dateKeyFromDateTime(task.completedAt) ?? dateKeyFromDateTime(task.cancelledAt);
}

function taskClosedBeforeDate(task: AgendaTaskItem, dateKey: string) {
  const closedDate = taskClosedDateValue(task);
  return Boolean(closedDate && closedDate < dateKey);
}

function taskClosedByDate(task: AgendaTaskItem, dateKey: string) {
  const closedDate = taskClosedDateValue(task);
  return Boolean(closedDate && closedDate <= dateKey);
}

function currentOpenStatus(task: AgendaTaskItem): Extract<AgendaStatus, 'in_progress' | 'paused'> | null {
  return task.status === 'in_progress' || task.status === 'paused' ? task.status : null;
}

export function getTaskAgendaStatus(
  task: AgendaTaskItem,
  referenceDate: string = todayDateKey(),
): AgendaStatus | null {
  if (!taskExistsByDate(task, referenceDate)) {
    return null;
  }

  const openStatus = currentOpenStatus(task);

  if (openStatus) {
    return openStatus;
  }

  const auditedDate = dateKeyFromDateTime(task.auditedAt);
  const completedDate = dateKeyFromDateTime(task.completedAt);
  const cancelledDate = dateKeyFromDateTime(task.cancelledAt);

  if (task.status === 'completed' && auditedDate === referenceDate) {
    return 'audited';
  }

  if (task.status === 'completed' && completedDate === referenceDate) {
    return task.audited && auditedDate && auditedDate <= referenceDate ? 'audited' : 'completed';
  }

  if (
    (task.status === 'completed' && completedDate && completedDate < referenceDate)
    || (task.status === 'cancelled' && cancelledDate && cancelledDate <= referenceDate)
  ) {
    return null;
  }

  if (task.status === 'completed' && !completedDate) {
    return task.audited ? 'audited' : 'completed';
  }

  const agendaDate = taskDueDateValue(task);

  if (agendaDate) {
    if (agendaDate < referenceDate) {
      return 'overdue';
    }

    if (agendaDate === referenceDate) {
      return 'pending';
    }

    return null;
  }

  return null;
}

export function getTaskAgendaStatusInRange(
  task: AgendaTaskItem,
  range: AgendaLoadRange,
  referenceDate: string,
): AgendaStatus | null {
  const boundedReferenceDate =
    referenceDate < range.from ? range.from : referenceDate > range.to ? range.to : referenceDate;

  if (!taskExistsByDate(task, range.to)) {
    return null;
  }

  const openStatus = currentOpenStatus(task);

  if (openStatus) {
    return openStatus;
  }

  const auditedDate = dateKeyFromDateTime(task.auditedAt);
  const completedDate = dateKeyFromDateTime(task.completedAt);
  const cancelledDate = dateKeyFromDateTime(task.cancelledAt);

  if (task.status === 'completed' && isDateInRange(auditedDate, range)) {
    return 'audited';
  }

  if (task.status === 'completed' && isDateInRange(completedDate, range)) {
    return task.audited && auditedDate && auditedDate <= range.to ? 'audited' : 'completed';
  }

  if (task.status === 'completed' && completedDate && completedDate < range.from) {
    return null;
  }

  if (task.status === 'cancelled' && cancelledDate && cancelledDate <= range.to) {
    return null;
  }

  if (task.status === 'completed' && !completedDate) {
    return task.audited ? 'audited' : 'completed';
  }

  const agendaDate = taskDueDateValue(task);

  if (agendaDate) {
    if (agendaDate < range.from && !taskClosedBeforeDate(task, range.from)) {
      return 'overdue';
    }

    if (isDateInRange(agendaDate, range)) {
      if (agendaDate < boundedReferenceDate && !taskClosedByDate(task, boundedReferenceDate)) {
        return 'overdue';
      }

      return 'pending';
    }
  }

  return null;
}

function resolveTaskAgendaStatus(
  task: AgendaTaskItem,
  options: { referenceDate?: string; range?: AgendaLoadRange } = {},
) {
  const referenceDate = options.referenceDate ?? todayDateKey();
  return options.range
    ? getTaskAgendaStatusInRange(task, options.range, referenceDate)
    : getTaskAgendaStatus(task, referenceDate);
}

export function isTaskOverdue(task: AgendaTaskItem, referenceDate: string = todayDateKey()) {
  return getTaskAgendaStatus(task, referenceDate) === 'overdue';
}

export function getTaskDisplayStatus(
  task: AgendaTaskItem,
  referenceDate: string = todayDateKey(),
  range?: AgendaLoadRange,
): DisplayTaskStatus {
  const agendaStatus = resolveTaskAgendaStatus(task, { referenceDate, range });

  if (agendaStatus) {
    return agendaStatus;
  }

  if (task.status === 'completed' && task.audited) {
    return 'audited';
  }

  return task.status;
}

export function taskMatchesStatusFilter(
  task: AgendaTaskItem,
  filter: StatusFilter,
  options: { referenceDate?: string; range?: AgendaLoadRange } = {},
) {
  const agendaStatus = resolveTaskAgendaStatus(task, options);

  if (filter === 'all') {
    return agendaStatus != null;
  }

  if (filter === 'pending_overdue') {
    return agendaStatus === 'pending' || agendaStatus === 'overdue';
  }

  return agendaStatus === filter;
}

export function getTaskKanbanColumnId(
  task: AgendaTaskItem,
  referenceDate: string = todayDateKey(),
  range?: AgendaLoadRange,
): AgendaKanbanColumnId {
  return resolveTaskAgendaStatus(task, { referenceDate, range }) ?? 'pending';
}

export function isTaskInDailyAgenda(task: AgendaTaskItem, todayValue: string) {
  return getTaskAgendaStatus(task, todayValue) != null;
}

function isTaskInMyAgenda(task: AgendaTaskItem, currentUserId: number | null) {
  if (currentUserId == null) {
    return false;
  }

  const assignedToCurrentUser =
    task.assignedUserId === currentUserId || task.assignees.some((assignee) => assignee.userId === currentUserId);
  const createdByCurrentUser = task.createdBy === currentUserId;
  const delegatedToAnotherUser = task.assigneeUserCompanyIds.length > 0 && !assignedToCurrentUser;

  return assignedToCurrentUser || (createdByCurrentUser && !delegatedToAnotherUser);
}

function isTaskDelegatedByCurrentUser(task: AgendaTaskItem, currentUserId: number | null) {
  if (currentUserId == null) {
    return false;
  }

  const assignedToAnotherUser = task.assignees.length > 0
    ? task.assignees.some((assignee) => assignee.userId != null && assignee.userId !== currentUserId)
    : task.assignedUserId != null && task.assignedUserId !== currentUserId;

  return task.createdBy === currentUserId && assignedToAnotherUser;
}

export function matchesAgendaPeriod(
  task: AgendaTaskItem,
  period: PeriodFilter,
  todayValue: string,
  range?: AgendaLoadRange,
  referenceDate: string = todayValue,
) {
  switch (period) {
    case 'all':
      return true;
    case 'today':
      return getTaskAgendaStatus(task, todayValue) != null;
    case 'tomorrow':
      return getTaskAgendaStatus(task, toRelativeDateKey(todayValue, 1)) != null;
    case 'yesterday':
      return getTaskAgendaStatus(task, toRelativeDateKey(todayValue, -1)) != null;
    case 'week':
    case 'month':
    case 'custom':
      return range ? getTaskAgendaStatusInRange(task, range, referenceDate) != null : true;
  }
}

export function matchesAgendaFocus(
  task: AgendaTaskItem,
  focus: AgendaFocusFilter,
  currentUserId: number | null,
) {
  switch (focus) {
    case 'mine':
      return isTaskInMyAgenda(task, currentUserId);
    case 'delegated':
      return isTaskDelegatedByCurrentUser(task, currentUserId);
    case 'team':
      return true;
  }
}

function toRelativeDateKey(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + amount);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
