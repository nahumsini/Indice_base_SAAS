import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaFocusFilter, AgendaKanbanColumnId, DisplayTaskStatus, PeriodFilter, StatusFilter } from '../types';

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

function isPastDate(value: string | null) {
  if (!value) {
    return false;
  }

  const today = new Date();
  const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return new Date(`${value}T00:00:00`) < todayAtMidnight;
}

export function isTaskOverdue(task: AgendaTaskItem) {
  return (
    (task.isOverdue || isPastDate(task.dueDate)) &&
    task.status !== 'completed' &&
    task.status !== 'cancelled'
  );
}

export function getTaskDisplayStatus(task: AgendaTaskItem): DisplayTaskStatus {
  if (task.status === 'completed' && task.audited) {
    return 'audited';
  }

  return isTaskOverdue(task) ? 'overdue' : task.status;
}

export function taskMatchesStatusFilter(task: AgendaTaskItem, filter: StatusFilter) {
  if (filter === 'all') {
    return task.status !== 'cancelled';
  }

  if (filter === 'open') {
    return task.status === 'pending' || task.status === 'in_progress' || task.status === 'paused';
  }

  if (filter === 'pending_audit') {
    return task.status === 'completed' && !task.audited;
  }

  return getTaskDisplayStatus(task) === filter;
}

export function getTaskKanbanColumnId(task: AgendaTaskItem): AgendaKanbanColumnId {
  if (task.status === 'cancelled') {
    return 'cancelled';
  }

  if (isTaskOverdue(task)) {
    return 'overdue';
  }

  if (task.status === 'completed') {
    return task.audited ? 'audited' : 'completed';
  }

  return task.status;
}

export function taskDueDateValue(task: AgendaTaskItem) {
  return task.agendaDate || task.dueDate || null;
}

export function isTaskInDailyAgenda(task: AgendaTaskItem, todayValue: string) {
  return taskDueDateValue(task) === todayValue || isTaskOverdue(task);
}

function isTaskInMyAgenda(task: AgendaTaskItem, currentUserId: number | null) {
  if (currentUserId == null) {
    return false;
  }

  const assignedToCurrentUser = task.assignedUserId === currentUserId;
  const createdByCurrentUser = task.createdBy === currentUserId;
  const delegatedToAnotherUser = task.assignedUserCompanyId != null && task.assignedUserId !== currentUserId;

  return assignedToCurrentUser || (createdByCurrentUser && !delegatedToAnotherUser);
}

function isTaskDelegatedByCurrentUser(task: AgendaTaskItem, currentUserId: number | null) {
  if (currentUserId == null) {
    return false;
  }

  return task.createdBy === currentUserId && task.assignedUserCompanyId != null && task.assignedUserId !== currentUserId;
}

export function matchesAgendaPeriod(
  task: AgendaTaskItem,
  period: PeriodFilter,
  todayValue: string,
) {
  const taskDate = taskDueDateValue(task);

  switch (period) {
    case 'today':
      return taskDate === todayValue;
    case 'tomorrow':
      return taskDate === toRelativeDateKey(todayValue, 1);
    case 'yesterday':
      return taskDate === toRelativeDateKey(todayValue, -1);
    case 'week':
    case 'month':
    case 'custom':
      return true;
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
    case 'pendingAudit':
      return task.status === 'completed' && !task.audited;
    case 'team':
      return task.status !== 'cancelled';
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
