import type { TaskStatus } from '../Tasks/tasksApi';

export type PeriodFilter = 'today' | 'tomorrow' | 'yesterday' | 'week' | 'month' | 'custom';
export type AgendaFocusFilter = 'mine' | 'delegated' | 'team' | 'pendingAudit';
export type DisplayTaskStatus = TaskStatus | 'overdue' | 'audited';
export type OpenStatusFilter = 'open';
export type AuditPendingStatusFilter = 'pending_audit';
export type StatusFilter = 'all' | DisplayTaskStatus | OpenStatusFilter | AuditPendingStatusFilter;
export type OptionFilter = 'all' | string;
export type AgendaViewMode = 'table' | 'kanban' | 'diagram';
export type AgendaScheduleViewMode = 'day' | 'week' | 'list';

export type AgendaLoadRange = {
  from: string;
  to: string;
};

export type AgendaColumnId =
  | 'folio'
  | 'type'
  | 'unit'
  | 'business'
  | 'title'
  | 'description'
  | 'createdAt'
  | 'startDate'
  | 'dueDate'
  | 'agendaTime'
  | 'status'
  | 'creator'
  | 'responsible'
  | 'priority'
  | 'attachments'
  | 'project'
  | 'completion'
  | 'notes'
  | 'weighting'
  | 'auditNotes';

export type AgendaFixedColumnId = 'actions';
export type AgendaTableColumnId = AgendaColumnId | AgendaFixedColumnId;
export type AgendaSortDirection = 'asc' | 'desc';
export type AgendaSortValue = string | number | null;

export type AgendaSchedulePlacement = {
  date: string;
  hour: string | null;
};

export type AgendaSchedulePlacements = Record<string, AgendaSchedulePlacement>;

export type AgendaKanbanColumnId =
  | 'overdue'
  | 'pending'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'audited'
  | 'cancelled';

export interface AgendaSortState {
  columnId: AgendaColumnId;
  direction: AgendaSortDirection;
}

export interface AgendaParticipantFilterOption {
  value: string;
  label: string;
  userId: number | null;
  userCompanyId: number | null;
  normalizedName: string;
}

export interface AgendaProjectFilterOption {
  value: string;
  label: string;
}

export type AgendaKanbanColumn = {
  id: AgendaKanbanColumnId;
  label: string;
  description: string;
  accentClassName: string;
  dotClassName: string;
  acceptsDrop: boolean;
};
