import type { TaskStatus } from '../Tasks/tasksApi';

export type PeriodFilter = 'all' | 'today' | 'tomorrow' | 'yesterday' | 'week' | 'month' | 'custom';
export type AgendaFocusFilter = 'mine' | 'delegated' | 'team';
export type AgendaStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'overdue' | 'audited';
export type DisplayTaskStatus = AgendaStatus | Extract<TaskStatus, 'cancelled'>;
export type CompoundStatusFilter = 'pending_overdue';
export type StatusFilter = 'all' | AgendaStatus | CompoundStatusFilter;
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
  | 'predecessor'
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
  | 'audited';

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
