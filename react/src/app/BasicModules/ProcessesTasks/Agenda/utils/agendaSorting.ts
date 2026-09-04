import type { TaskPriority } from '../../Tasks/tasksApi';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import type { AgendaColumnId, AgendaLoadRange, AgendaSortDirection, AgendaSortValue } from '../types';
import { getTaskScheduleHour } from './agendaScheduleUtils';
import { clampPercent, getTaskDisplayStatus } from './agendaTaskStatus';

const agendaSortCollator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

const agendaPrioritySortRank: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function sortableDateValue(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedDate = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
  const time = parsedDate.getTime();

  return Number.isNaN(time) ? null : time;
}

export function compareAgendaText(leftValue: string, rightValue: string) {
  return agendaSortCollator.compare(leftValue, rightValue);
}

export function getAgendaSortValue(
  task: AgendaTaskItem,
  columnId: AgendaColumnId,
  copy: AgendaTranslations,
  todayValue?: string,
  agendaStatusDate?: string,
  agendaStatusRange?: AgendaLoadRange,
): AgendaSortValue {
  switch (columnId) {
    case 'folio':
      return task.folio;
    case 'reference':
      return task.processReference ?? '';
    case 'type':
      return copy.taskTypes[task.taskType];
    case 'unit':
      return task.unitName ?? task.unit ?? '';
    case 'business':
      return task.businessName ?? task.business ?? '';
    case 'title':
      return task.title;
    case 'description':
      return task.description ?? '';
    case 'createdAt':
      return sortableDateValue(task.createdAt);
    case 'startDate':
      return sortableDateValue(task.startDate);
    case 'dueDate':
      return sortableDateValue(task.dueDate);
    case 'predecessor':
      return task.predecessorTaskFolio ?? task.predecessorTaskTitle ?? '';
    case 'agendaTime':
      return getTaskScheduleHour(task, todayValue) ?? null;
    case 'status':
      return copy.statuses[getTaskDisplayStatus(task, agendaStatusDate, agendaStatusRange)];
    case 'creator':
      return task.createdByName ?? task.creator ?? '';
    case 'responsible':
      return task.assignedName ?? task.responsible ?? '';
    case 'priority':
      return agendaPrioritySortRank[task.priority] ?? 0;
    case 'attachments':
      return task.attachments;
    case 'project':
      return task.projectName ?? task.project ?? task.projectFolio ?? '';
    case 'completion':
      return clampPercent(task.completionPercent);
    case 'notes':
      return task.notes ?? '';
    case 'weighting':
      return task.weighting;
    case 'auditNotes':
      return task.audited ? task.auditNotes ?? '' : copy.auditStatuses[task.auditStatus];
  }
}

export function compareAgendaSortValues(
  leftValue: AgendaSortValue,
  rightValue: AgendaSortValue,
  direction: AgendaSortDirection,
) {
  const leftIsEmpty = leftValue == null || leftValue === '';
  const rightIsEmpty = rightValue == null || rightValue === '';

  if (leftIsEmpty && rightIsEmpty) {
    return 0;
  }

  if (leftIsEmpty) {
    return 1;
  }

  if (rightIsEmpty) {
    return -1;
  }

  const result =
    typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : compareAgendaText(String(leftValue), String(rightValue));

  return direction === 'asc' ? result : result * -1;
}
