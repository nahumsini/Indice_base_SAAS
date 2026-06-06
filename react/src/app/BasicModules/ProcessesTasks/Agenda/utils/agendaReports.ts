import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import { clampPercent, formatWeightingScore, getTaskDisplayStatus } from './agendaTaskStatus';

export function formatDate(value: string | null, includeTime = false) {
  if (!value) {
    return 'Sin fecha';
  }

  const date = includeTime ? new Date(value) : new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime
      ? {
          hour: '2-digit' as const,
          minute: '2-digit' as const,
        }
      : {}),
  }).format(date);
}

export function reportValue(value: string | number | null | undefined, fallback: string) {
  if (value == null || value === '') {
    return fallback;
  }

  return String(value);
}

export function taskReportRows(task: AgendaTaskItem, copy: AgendaTranslations) {
  const fields = copy.report.fields;

  return [
    [fields.folio, task.folio],
    [fields.type, copy.taskTypes[task.taskType]],
    [fields.title, task.title],
    [fields.description, task.description ?? copy.common.noDescription],
    [fields.unit, task.unitName ?? (task.unitId ? `${fields.unit} #${task.unitId}` : copy.form.empty.unit)],
    [fields.business, task.businessName ?? (task.businessId ? `${fields.business} #${task.businessId}` : copy.form.empty.business)],
    [fields.project, task.projectName ?? (task.projectId ? `${fields.project} #${task.projectId}` : copy.form.empty.project)],
    [fields.process, task.processTitle ?? (task.processId ? `${fields.process} #${task.processId}` : copy.form.empty.process)],
    [fields.status, copy.statuses[getTaskDisplayStatus(task)]],
    [fields.priority, copy.priorities[task.priority]],
    [fields.creator, task.createdByName ?? task.creator ?? copy.common.noRecord],
    [fields.responsible, task.assignedName ?? copy.common.unassigned],
    [fields.createdAt, task.createdAt ? formatDate(task.createdAt, true) : copy.common.noDate],
    [fields.startDate, task.startDate ? formatDate(task.startDate) : copy.common.noDate],
    [fields.dueDate, task.dueDate ? formatDate(task.dueDate) : copy.common.noDate],
    [fields.closedAt, task.completedAt ? formatDate(task.completedAt, true) : copy.common.pending],
    [fields.completion, `${clampPercent(task.completionPercent)}%`],
    [fields.weighting, formatWeightingScore(task.weighting, copy.table.noWeighting)],
    [fields.notes, task.notes ?? copy.common.noNotes],
    [fields.auditNotes, task.auditNotes ?? copy.common.noAuditNotes],
  ];
}
