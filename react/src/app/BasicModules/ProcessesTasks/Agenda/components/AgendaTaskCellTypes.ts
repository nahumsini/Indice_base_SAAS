import type {
  ProcessBusinessOption,
  ProcessUnitOption,
} from '../../Processes/types';
import type { ProjectRecord } from '../../Projects/projectsApi';
import type { TaskPayload } from '../../Tasks/tasksApi';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaColumnId, AgendaLoadRange } from '../types';
import type { AgendaTranslations } from '../translations';

export type AgendaTaskActionsProps = {
  copy: AgendaTranslations;
  isPending: boolean;
  onAuditTask: (task: AgendaTaskItem) => void;
  onCloseTask: (task: AgendaTaskItem) => void;
  onCopyTask: (task: AgendaTaskItem) => void | Promise<void>;
  onDeleteTask: (task: AgendaTaskItem) => void;
  onEditTask: (task: AgendaTaskItem) => void;
  onOpenFollowUps: (task: AgendaTaskItem) => void;
  onOpenReport: (task: AgendaTaskItem) => void;
  onOpenTeam: (task: AgendaTaskItem) => void;
  task: AgendaTaskItem;
};

export type AgendaTaskCellProps = {
  auditStatusClasses: Record<AgendaTaskItem['auditStatus'], string>;
  agendaStatusDate: string;
  agendaStatusRange: AgendaLoadRange;
  businessOptionsForUnit: (unitId: number | null) => ProcessBusinessOption[];
  columnId: AgendaColumnId;
  copy: AgendaTranslations;
  isPending: boolean;
  noBusinessValue: string;
  noProjectValue: string;
  noUnitValue: string;
  onAuditTask: (task: AgendaTaskItem) => void;
  onBusinessChange: (task: AgendaTaskItem, value: string) => void;
  onEditTask: (task: AgendaTaskItem) => void;
  onOpenAttachments: (task: AgendaTaskItem) => void;
  onOpenFollowUps: (task: AgendaTaskItem) => void;
  onOpenTeam: (task: AgendaTaskItem) => void;
  onPersistTaskChange: (task: AgendaTaskItem, patch: Partial<TaskPayload>) => void | Promise<void>;
  onRequestCancel: (task: AgendaTaskItem) => void;
  onRequestComplete: (task: AgendaTaskItem) => void;
  onPriorityChange: (task: AgendaTaskItem, value: string) => void;
  onProjectChange: (task: AgendaTaskItem, value: string) => void;
  onUnitChange: (task: AgendaTaskItem, value: string) => void;
  onUpdateSchedulePlacement: (taskId: number, dateKey: string, hour: string | null) => void;
  projects: ProjectRecord[];
  scopedCatalogUnits: ProcessUnitOption[];
  selectedScheduleDate: string;
  task: AgendaTaskItem;
  todayAgendaValue: string;
};
