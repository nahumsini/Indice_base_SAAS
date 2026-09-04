import { apiClient } from '../../../lib/apiClient';
import type {
  TaskAssignee,
  TaskAuditStatus,
  TaskContributionStatus,
  TaskDependencyType,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '../Tasks/tasksApi';

export interface AgendaTaskItem {
  id: number;
  taskId: number;
  taskType: TaskType;
  type: TaskType;
  folio: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  agendaDate: string | null;
  agendaStartTime: string | null;
  agendaEndTime: string | null;
  agendaTimeZone: string | null;
  startDate: string | null;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  completedByUserCompanyId: number | null;
  completedByUserId: number | null;
  completedByName: string | null;
  closedByName: string | null;
  completionNotes: string | null;
  assignedUserCompanyId: number | null;
  assignedUserId: number | null;
  assignedName: string | null;
  responsible: string | null;
  assignees: TaskAssignee[];
  assigneeUserCompanyIds: number[];
  assignmentMode: 'individual' | 'team';
  completionPolicy: 'all_assignees' | 'any_assignee' | 'lead';
  teamSize: number;
  teamReadyCount: number;
  teamAllReady: boolean;
  currentUserContributionStatus: TaskContributionStatus | null;
  isAssignedToCurrentUser: boolean;
  processId: number | null;
  processRunId?: number | null;
  processRunFolio?: string | null;
  processReference?: string | null;
  processRunStatus?: string | null;
  evidenceRequired?: boolean;
  processFolio: string | null;
  processTitle: string | null;
  projectId: number | null;
  projectFolio: string | null;
  projectName: string | null;
  project: string | null;
  businessId: number | null;
  businessName: string | null;
  business: string | null;
  unitId: number | null;
  unitName: string | null;
  unit: string | null;
  notes: string | null;
  completionPercent: number;
  completion: number;
  weighting: number | null;
  audited: boolean;
  auditNotes: string | null;
  auditedAt: string | null;
  auditedByUserCompanyId: number | null;
  auditedByUserId: number | null;
  auditedByName: string | null;
  auditStatus: TaskAuditStatus;
  createdBy: number | null;
  createdByName: string | null;
  creator: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  predecessorDependencyId: number | null;
  predecessorTaskId: number | null;
  predecessorTaskFolio: string | null;
  predecessorTaskTitle: string | null;
  dependencyType: TaskDependencyType | null;
  dependencyLagDays: number;
  attachments: number;
  followUpCount: number;
  lastFollowUpAt: string | null;
  nextFollowUpDate: string | null;
  isOverdue: boolean;
}

type AgendaListResponse = {
  items: Partial<AgendaTaskItem>[];
  count: number;
  from: string;
  to: string;
};

export function normalizeAgendaTask(record: Partial<AgendaTaskItem>): AgendaTaskItem {
  const taskType = (record.taskType ?? record.type ?? 'task') as TaskType;
  const completionPercent = Number(record.completionPercent ?? record.completion ?? 0);
  const auditStatus =
    record.auditStatus ??
    (record.audited ? 'audited' : record.status === 'completed' ? 'pending' : 'not_ready');
  const assignees = Array.isArray(record.assignees) ? record.assignees : [];
  const assigneeUserCompanyIds = Array.isArray(record.assigneeUserCompanyIds)
    ? record.assigneeUserCompanyIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : assignees.map((assignee) => assignee.userCompanyId);

  return {
    id: Number(record.id ?? 0),
    taskId: Number(record.taskId ?? record.id ?? 0),
    taskType,
    type: taskType,
    folio: record.folio ?? '',
    title: record.title ?? '',
    description: record.description ?? null,
    status: record.status ?? 'pending',
    priority: record.priority ?? 'medium',
    agendaDate: record.agendaDate ?? record.dueDate ?? null,
    agendaStartTime: record.agendaStartTime ?? null,
    agendaEndTime: record.agendaEndTime ?? null,
    agendaTimeZone: record.agendaTimeZone ?? null,
    startDate: record.startDate ?? null,
    dueDate: record.dueDate ?? null,
    startedAt: record.startedAt ?? null,
    completedAt: record.completedAt ?? null,
    cancelledAt: record.cancelledAt ?? null,
    completedByUserCompanyId: record.completedByUserCompanyId ?? null,
    completedByUserId: record.completedByUserId ?? null,
    completedByName: record.completedByName ?? record.closedByName ?? null,
    closedByName: record.closedByName ?? record.completedByName ?? null,
    completionNotes: record.completionNotes ?? null,
    assignedUserCompanyId: record.assignedUserCompanyId ?? null,
    assignedUserId: record.assignedUserId ?? null,
    assignedName: record.assignedName ?? null,
    responsible: record.responsible ?? record.assignedName ?? null,
    assignees,
    assigneeUserCompanyIds,
    assignmentMode: record.assignmentMode === 'team' || assignees.length > 1 ? 'team' : 'individual',
    completionPolicy:
      record.completionPolicy === 'all_assignees' || record.completionPolicy === 'any_assignee'
        ? record.completionPolicy
        : 'lead',
    teamSize: Number(record.teamSize ?? assignees.length),
    teamReadyCount: Number(
      record.teamReadyCount ?? assignees.filter((assignee) => assignee.contributionStatus === 'ready').length,
    ),
    teamAllReady: Boolean(record.teamAllReady ?? (assignees.length > 0 && assignees.every((assignee) => assignee.contributionStatus === 'ready'))),
    currentUserContributionStatus: record.currentUserContributionStatus ?? null,
    isAssignedToCurrentUser: Boolean(record.isAssignedToCurrentUser),
    processId: record.processId ?? null,
    processRunId: record.processRunId ?? null,
    processRunFolio: record.processRunFolio ?? null,
    processReference: record.processReference ?? null,
    processRunStatus: record.processRunStatus ?? null,
    evidenceRequired: Boolean(record.evidenceRequired),
    processFolio: record.processFolio ?? null,
    processTitle: record.processTitle ?? null,
    projectId: record.projectId ?? null,
    projectFolio: record.projectFolio ?? null,
    projectName: record.projectName ?? null,
    project: record.project ?? record.projectName ?? null,
    businessId: record.businessId ?? null,
    businessName: record.businessName ?? record.business ?? null,
    business: record.business ?? record.businessName ?? null,
    unitId: record.unitId ?? null,
    unitName: record.unitName ?? record.unit ?? null,
    unit: record.unit ?? record.unitName ?? null,
    notes: record.notes ?? null,
    completionPercent,
    completion: completionPercent,
    weighting: record.weighting ?? null,
    audited: Boolean(record.audited),
    auditNotes: record.auditNotes ?? null,
    auditedAt: record.auditedAt ?? null,
    auditedByUserCompanyId: record.auditedByUserCompanyId ?? null,
    auditedByUserId: record.auditedByUserId ?? null,
    auditedByName: record.auditedByName ?? null,
    auditStatus,
    createdBy: record.createdBy ?? null,
    createdByName: record.createdByName ?? record.creator ?? null,
    creator: record.creator ?? record.createdByName ?? null,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
    predecessorDependencyId: record.predecessorDependencyId ?? null,
    predecessorTaskId: record.predecessorTaskId ?? null,
    predecessorTaskFolio: record.predecessorTaskFolio ?? null,
    predecessorTaskTitle: record.predecessorTaskTitle ?? null,
    dependencyType: record.dependencyType ?? null,
    dependencyLagDays: Number(record.dependencyLagDays ?? 0),
    attachments: Number(record.attachments ?? 0),
    followUpCount: Number(record.followUpCount ?? 0),
    lastFollowUpAt: record.lastFollowUpAt ?? null,
    nextFollowUpDate: record.nextFollowUpDate ?? null,
    isOverdue: Boolean(record.isOverdue),
  };
}

export async function listAgendaTasks(from?: string, to?: string) {
  const params = new URLSearchParams();

  if (from) {
    params.set('from', from);
  }

  if (to) {
    params.set('to', to);
  }

  const query = params.toString();
  const response = await apiClient<AgendaListResponse>(`/api/v1/agenda${query ? `?${query}` : ''}`);

  return {
    items: response.items.map(normalizeAgendaTask),
    count: response.count,
    from: response.from,
    to: response.to,
  };
}
