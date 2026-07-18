import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router';
import {
  Columns3,
  MonitorSmartphone,
  Plus,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { ColumnasConfigModal } from '../../../components/rh/ColumnasConfigModal';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { cn } from '../../../components/ui/utils';
import { authApi } from '../../../api/auth';
import { accentButtonClass } from '../Processes/processesData';
import { TaskAuditDialog } from '../Tasks/components/TaskAuditDialog';
import { TaskFormDialog } from '../Tasks/components/TaskFormDialog';
import { TaskCompletionDialog } from '../Tasks/components/TaskCompletionDialog';
import { listAgendaTasks, type AgendaTaskItem } from './agendaApi';
import type {
  AgendaColumnId,
  AgendaFocusFilter,
  AgendaKanbanColumn,
  AgendaLoadRange,
  AgendaViewMode,
  DisplayTaskStatus,
} from './types';
import { AgendaKpiStrip } from './components/AgendaKpiStrip';
import { AgendaBulkActionsBar } from './components/AgendaBulkActionsBar';
import { AgendaBulkDialogs } from './components/AgendaBulkDialogs';
import { AgendaFilters } from './components/AgendaFilters';
import { AgendaKanbanView } from './components/AgendaKanbanView';
import { AgendaQuickTaskDialog } from './components/AgendaQuickTaskDialog';
import { AgendaReportDialog } from './components/AgendaReportDialog';
import { AgendaScheduleView } from './components/AgendaScheduleView';
import { AgendaTableView } from './components/AgendaTableView';
import { AgendaTaskActions, AgendaTaskCell } from './components/AgendaTaskCells';
import { useAgendaColumns } from './hooks/useAgendaColumns';
import { useAgendaBulkActions } from './hooks/useAgendaBulkActions';
import { useAgendaCatalogs } from './hooks/useAgendaCatalogs';
import { useAgendaDerivedTasks } from './hooks/useAgendaDerivedTasks';
import { useAgendaFilters } from './hooks/useAgendaFilters';
import { useAgendaKanbanDrop } from './hooks/useAgendaKanbanDrop';
import { useAgendaKpiMetrics } from './hooks/useAgendaKpiMetrics';
import { useAgendaScheduleState } from './hooks/useAgendaScheduleState';
import { useAgendaTaskCompletionAudit } from './hooks/useAgendaTaskCompletionAudit';
import { useAgendaTaskFormDialog } from './hooks/useAgendaTaskFormDialog';
import { useAgendaTaskKiosks } from './hooks/useAgendaTaskKiosks';
import { useAgendaTaskMutations } from './hooks/useAgendaTaskMutations';
import { useAgendaTaskState } from './hooks/useAgendaTaskState';
import { TaskAttachmentsDialog } from './components/TaskAttachmentsDialog';
import { useAgendaTranslations, type AgendaTranslations } from './translations';
import { TaskKioskManagementModal } from '../Kiosk/TaskKioskManagementModal';
import { TaskKioskConfirmationDialog } from '../Kiosk/components/TaskKioskConfirmationDialog';
import { useRowSelection } from '../../shared/operational';
import { LearningModeTitleBarBridge } from '../../../learningMode';
import {
  collaboratorCanReceiveAssignment,
  filterBusinessesForActor,
  filterUnitsForActor,
  resolveCollaboratorAssignmentScope,
} from '../shared/assignmentScope';
import {
  addDays,
  dateInputValueToDate,
  getWeekDateKeys,
  toDateInputValue,
} from './utils/agendaDateUtils';
import {
  getErrorMessage,
  isTaskInDailyAgenda,
} from './utils/agendaTaskStatus';
import { getTaskScheduleDateKey } from './utils/agendaScheduleUtils';
import {
  businessMatchesUnit,
  NO_PROJECT_VALUE,
  projectLabel,
  UNASSIGNED_RESPONSIBLE_VALUE,
} from './utils/agendaFilterOptions';
import { downloadAgendaTaskReport } from './utils/agendaTaskReportPdf';

const auditStatusClasses: Record<AgendaTaskItem['auditStatus'], string> = {
  not_ready:
    'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200',
  pending:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300',
  audited:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
};

const agendaDisplayStatusClasses: Record<DisplayTaskStatus, string> = {
  pending:
    'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200',
  in_progress:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300',
  paused:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300',
  completed:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300',
  cancelled:
    'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300',
  overdue:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300',
  audited:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
};

const NO_UNIT_VALUE = '__no_unit__';
const NO_BUSINESS_VALUE = '__no_business__';

function combineAgendaRanges(baseRange: AgendaLoadRange, rangeOverride?: AgendaLoadRange): AgendaLoadRange {
  if (!rangeOverride) {
    return baseRange;
  }

  return {
    from: rangeOverride.from < baseRange.from ? rangeOverride.from : baseRange.from,
    to: rangeOverride.to > baseRange.to ? rangeOverride.to : baseRange.to,
  };
}

function agendaStatusDateForRange(todayValue: string, range: AgendaLoadRange) {
  if (todayValue < range.from) {
    return range.from;
  }

  if (todayValue > range.to) {
    return range.to;
  }

  return todayValue;
}

function agendaEvaluationRangeForPeriod(
  period: string,
  todayValue: string,
  activeRange: AgendaLoadRange,
  customDateFrom: string,
  customDateTo: string,
): AgendaLoadRange {
  if (period === 'today') {
    return { from: todayValue, to: todayValue };
  }

  if (period === 'tomorrow') {
    const tomorrow = toDateInputValue(addDays(dateInputValueToDate(todayValue), 1));
    return { from: tomorrow, to: tomorrow };
  }

  if (period === 'yesterday') {
    const yesterday = toDateInputValue(addDays(dateInputValueToDate(todayValue), -1));
    return { from: yesterday, to: yesterday };
  }

  if (period === 'custom') {
    return { from: customDateFrom, to: customDateTo };
  }

  return activeRange;
}

function normalizeFilterLabel(value: string) {
  return value.trim().toLowerCase();
}

function parseProjectFilterId(value: string) {
  const match = /^project:(\d+)$/.exec(value);
  return match ? Number(match[1]) : null;
}

function parseCollaboratorFilter(value: string) {
  const userCompanyMatch = /^user-company:(\d+)$/.exec(value);
  if (userCompanyMatch) {
    return { type: 'userCompany' as const, id: Number(userCompanyMatch[1]), name: '' };
  }

  const userMatch = /^user:(\d+)$/.exec(value);
  if (userMatch) {
    return { type: 'user' as const, id: Number(userMatch[1]), name: '' };
  }

  const nameMatch = /^name:(.+)$/.exec(value);
  if (nameMatch) {
    return { type: 'name' as const, id: null, name: normalizeFilterLabel(nameMatch[1] ?? '') };
  }

  return null;
}

function createAgendaKanbanColumns(copy: AgendaTranslations): AgendaKanbanColumn[] {
  return [
  {
    id: 'overdue',
    label: copy.kanban.columns.overdue.label,
    description: copy.kanban.columns.overdue.description,
    accentClassName: 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/35',
    dotClassName: 'bg-rose-500',
    acceptsDrop: false,
  },
  {
    id: 'pending',
    label: copy.kanban.columns.pending.label,
    description: copy.kanban.columns.pending.description,
    accentClassName: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/45',
    dotClassName: 'bg-slate-400',
    acceptsDrop: true,
  },
  {
    id: 'in_progress',
    label: copy.kanban.columns.in_progress.label,
    description: copy.kanban.columns.in_progress.description,
    accentClassName: 'border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/35',
    dotClassName: 'bg-blue-500',
    acceptsDrop: true,
  },
  {
    id: 'paused',
    label: copy.kanban.columns.paused.label,
    description: copy.kanban.columns.paused.description,
    accentClassName: 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35',
    dotClassName: 'bg-amber-500',
    acceptsDrop: true,
  },
  {
    id: 'completed',
    label: copy.kanban.columns.completed.label,
    description: copy.kanban.columns.completed.description,
    accentClassName: 'border-violet-200 bg-violet-50 dark:border-violet-900/60 dark:bg-violet-950/35',
    dotClassName: 'bg-violet-500',
    acceptsDrop: true,
  },
  {
    id: 'audited',
    label: copy.kanban.columns.audited.label,
    description: copy.kanban.columns.audited.description,
    accentClassName: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/35',
    dotClassName: 'bg-emerald-500',
    acceptsDrop: true,
  },
  ];
}
interface AgendaProps {
  learningModeActive?: boolean;
}

export default function Agenda({ learningModeActive = false }: AgendaProps) {
  const location = useLocation();
  const todayAgendaValue = useMemo(() => toDateInputValue(new Date()), []);
  const agendaCopy = useAgendaTranslations();
  const headerCopy = agendaCopy.header;
  const periodLabels = agendaCopy.periods;
  const {
    agendaColumnWidths,
    agendaColumns,
    agendaTableColumnCount,
    agendaTableMinWidth,
    defaultAgendaColumns,
    fixedAgendaColumns,
    handleResizeStart,
    resizingColumn,
    selectionColumnWidth,
    setAgendaColumns,
    translatedAgendaColumns,
    visibleAgendaColumns,
  } = useAgendaColumns(agendaCopy);
  const {
    activeRange,
    businessFilter,
    clearFilters,
    collaboratorFilter,
    customDateFrom,
    customDateTo,
    focusFilter,
    handleCustomDateFromChange,
    handleCustomDateToChange,
    periodFilter,
    projectFilter,
    searchQuery,
    setBusinessFilter,
    setCollaboratorFilter,
    setFocusFilter,
    setPeriodFilter,
    setProjectFilter,
    setSearchQuery,
    setStatusFilter,
    setUnitFilter,
    statusFilter,
    unitFilter,
  } = useAgendaFilters(location.search);
  const agendaEvaluationRange = useMemo(
    () => agendaEvaluationRangeForPeriod(
      periodFilter,
      todayAgendaValue,
      activeRange,
      customDateFrom,
      customDateTo,
    ),
    [activeRange, customDateFrom, customDateTo, periodFilter, todayAgendaValue],
  );
  const agendaStatusDate = useMemo(
    () => agendaStatusDateForRange(todayAgendaValue, agendaEvaluationRange),
    [agendaEvaluationRange, todayAgendaValue],
  );
  const handleFocusFilterChange = useCallback(
    (nextFocus: AgendaFocusFilter) => {
      setFocusFilter(nextFocus);
      setCollaboratorFilter('all');
    },
    [setCollaboratorFilter, setFocusFilter],
  );
  const agendaKanbanColumns = useMemo(() => createAgendaKanbanColumns(agendaCopy), [agendaCopy]);
  const [viewMode, setViewMode] = useState<AgendaViewMode>('table');
  const {
    isTaskPending,
    patchTaskInAgenda,
    setManyTasksPendingState,
    setTaskPendingState,
    setTasks,
    tasks,
  } = useAgendaTaskState();
  const pendingCreatedTasksRef = useRef(new Map<number, AgendaTaskItem>());
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [agendaNotice, setAgendaNotice] = useState<string | null>(null);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const {
    catalogBusinesses,
    catalogCollaborators,
    catalogUnits,
    isProjectsCatalogReady,
    processes,
    projects,
  } = useAgendaCatalogs();
  const [attachmentsTask, setAttachmentsTask] = useState<AgendaTaskItem | null>(null);
  const [reportTask, setReportTask] = useState<AgendaTaskItem | null>(null);
  const rowSelection = useRowSelection<number>();

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      setIsLoadingCurrentUser(true);

      try {
        const session = await authApi.getSessionOrNull();
        if (isMounted) {
          setCurrentUserId(session?.user.id ?? null);
        }
      } catch {
        if (isMounted) {
          setCurrentUserId(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCurrentUser(false);
        }
      }
    };

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadAgenda = useCallback(async (rangeOverride?: AgendaLoadRange) => {
    setIsLoadingTasks(true);
    setAgendaError(null);

    try {
      const requestedRange = combineAgendaRanges(
        { from: activeRange.from, to: activeRange.to },
        rangeOverride,
      );
      const response = await listAgendaTasks(requestedRange.from, requestedRange.to);
      const serverTaskIds = new Set(response.items.map((task) => task.taskId));
      const pendingTasks: AgendaTaskItem[] = [];

      pendingCreatedTasksRef.current.forEach((task, taskId) => {
        if (serverTaskIds.has(taskId)) {
          pendingCreatedTasksRef.current.delete(taskId);
          return;
        }
        pendingTasks.push(task);
      });

      setTasks([...pendingTasks, ...response.items]);
    } catch (error) {
      setTasks([]);
      setAgendaError(getErrorMessage(error, agendaCopy.messages.loadTasks));
    } finally {
      setIsLoadingTasks(false);
    }
  }, [activeRange.from, activeRange.to, agendaCopy.messages.loadTasks]);

  const rememberCreatedTask = useCallback((task: AgendaTaskItem) => {
    pendingCreatedTasksRef.current.set(task.taskId, task);
    setTasks((currentTasks) => [
      task,
      ...currentTasks.filter((currentTask) => currentTask.taskId !== task.taskId),
    ]);
  }, [setTasks]);

  const {
    agendaSchedulePlacements,
    handleScheduleDateDrop,
    handleScheduleDragEnd,
    handleScheduleDragOver,
    handleScheduleDrop,
    handleScheduleTaskDragStart,
    scheduleDraggingTaskId,
    scheduleViewMode,
    selectedScheduleDate,
    setScheduleViewMode,
    setSelectedScheduleDate,
    updateTaskSchedulePlacement,
  } = useAgendaScheduleState({
    agendaCopy,
    loadAgenda,
    patchTaskInAgenda,
    setAgendaError,
    setTaskPendingState,
    tasks,
    todayAgendaValue,
  });

  const scheduleLoadRange = useMemo<AgendaLoadRange | null>(() => {
    if (viewMode !== 'diagram') {
      return null;
    }

    if (scheduleViewMode === 'day') {
      return { from: selectedScheduleDate, to: selectedScheduleDate };
    }

    const weekDateKeys = getWeekDateKeys(selectedScheduleDate);

    return {
      from: weekDateKeys[0] ?? selectedScheduleDate,
      to: weekDateKeys[weekDateKeys.length - 1] ?? selectedScheduleDate,
    };
  }, [scheduleViewMode, selectedScheduleDate, viewMode]);
  const scheduleStatusRange = scheduleLoadRange ?? agendaEvaluationRange;
  const scheduleStatusDate = useMemo(
    () => agendaStatusDateForRange(todayAgendaValue, scheduleStatusRange),
    [scheduleStatusRange, todayAgendaValue],
  );

  const loadVisibleAgenda = useCallback(
    () => loadAgenda(scheduleLoadRange ?? undefined),
    [loadAgenda, scheduleLoadRange],
  );

  const {
    auditNotes,
    auditTask,
    auditWeighting,
    completionNotes,
    completionPercent,
    completionTask,
    handleAuditDialogOpenChange,
    handleAuditTask,
    handleCloseTask,
    handleCompletionDialogOpenChange,
    handleConfirmAudit,
    handleConfirmComplete,
    setAuditNotes,
    setAuditWeighting,
    setCompletionNotes,
    setCompletionPercent,
  } = useAgendaTaskCompletionAudit({
    agendaCopy,
    loadAgenda: loadVisibleAgenda,
    patchTaskInAgenda,
    setAgendaError,
    setTaskPendingState,
  });

  const {
    handleCancelDeleteTaskKiosk,
    handleCancelTaskKioskTransition,
    handleConfirmDeleteTaskKiosk,
    handleConfirmTaskKioskTransition,
    handleCopyTaskKiosk,
    handleDeleteTaskKiosk,
    handleOpenTaskKiosk,
    handleRotateTaskKiosk,
    handleOpenTaskKiosks,
    handleSaveTaskKiosk,
    handleTransitionTaskKiosk,
    isTaskKioskModalOpen,
    isTaskKioskSaving,
    handleCloseTaskKiosks,
    taskKioskPendingDeletion,
    taskKioskPendingTransition,
    taskKiosks,
  } = useAgendaTaskKiosks({ setAgendaError });

  useEffect(() => {
    void loadVisibleAgenda();
  }, [loadVisibleAgenda]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const refreshAgenda = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      void loadVisibleAgenda();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAgenda();
      }
    };

    window.addEventListener('focus', refreshAgenda);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshAgenda);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadVisibleAgenda]);

  const {
    businessOptions,
    collaboratorOptions,
    currentUserCollaborator,
    filteredTasks,
    handleSort,
    isAgendaViewLoading,
    kanbanTasksByColumn,
    projectOptions,
    scheduleSortedTasks,
    sortState,
    sortedTasks,
    unitOptions,
  } = useAgendaDerivedTasks({
    agendaCopy,
    agendaKanbanColumns,
    activeRange: agendaEvaluationRange,
    agendaStatusDate,
    businessFilter,
    catalogCollaborators,
    collaboratorFilter,
    currentUserId,
    focusFilter,
    isLoadingCurrentUser,
    isLoadingTasks,
    periodFilter,
    projectFilter,
    searchQuery,
    scheduleStatusDate,
    scheduleStatusRange,
    setBusinessFilter,
    setCollaboratorFilter,
    setProjectFilter,
    setUnitFilter,
    statusFilter,
    tasks,
    todayAgendaValue,
    unitFilter,
    visibleSelectionState: rowSelection.visibleSelectionState,
  });
  const currentAssignmentScope = useMemo(
    () => resolveCollaboratorAssignmentScope(currentUserCollaborator),
    [currentUserCollaborator],
  );
  const scopedCatalogUnits = useMemo(
    () => filterUnitsForActor(catalogUnits, catalogBusinesses, currentAssignmentScope),
    [catalogBusinesses, catalogUnits, currentAssignmentScope],
  );
  const scopedCatalogBusinesses = useMemo(
    () => filterBusinessesForActor(catalogBusinesses, currentAssignmentScope),
    [catalogBusinesses, currentAssignmentScope],
  );
  const businessOptionsForUnit = useCallback(
    (unitId: number | null) => scopedCatalogBusinesses.filter((business) => businessMatchesUnit(business, unitId)),
    [scopedCatalogBusinesses],
  );

  const collaboratorOptionsForScope = useCallback(
    (unitId: number | null, businessId: number | null) =>
      catalogCollaborators.filter((collaborator) =>
        collaboratorCanReceiveAssignment(collaborator, unitId, businessId, catalogBusinesses),
      ),
    [catalogBusinesses, catalogCollaborators],
  );

  const quickTaskDate = viewMode === 'diagram' ? selectedScheduleDate : agendaStatusDate;
  const quickTaskContext = useMemo(() => {
    const selectedUnit =
      unitFilter === 'all'
        ? null
        : scopedCatalogUnits.find((unit) => normalizeFilterLabel(unit.name) === normalizeFilterLabel(unitFilter)) ?? null;
    const selectedBusiness =
      businessFilter === 'all'
        ? null
        : scopedCatalogBusinesses.find(
            (business) =>
              normalizeFilterLabel(business.name) === normalizeFilterLabel(businessFilter) &&
              businessMatchesUnit(business, selectedUnit?.id ?? null),
          ) ?? null;
    const selectedProjectId = projectFilter === 'all' || projectFilter === NO_PROJECT_VALUE
      ? null
      : parseProjectFilterId(projectFilter);
    const selectedProject = selectedProjectId != null
      ? projects.find((project) => project.id === selectedProjectId) ?? null
      : null;

    let unitId = selectedUnit?.id ?? selectedProject?.unitId ?? null;
    let businessId = selectedBusiness?.id ?? selectedProject?.businessId ?? null;
    const business = businessId != null
      ? catalogBusinesses.find((option) => option.id === businessId) ?? null
      : null;

    if (business?.unitId != null) {
      unitId = business.unitId;
    }

    const parsedCollaborator = collaboratorFilter === 'all' || collaboratorFilter === UNASSIGNED_RESPONSIBLE_VALUE
      ? null
      : parseCollaboratorFilter(collaboratorFilter);
    const selectedCollaborator = parsedCollaborator == null
      ? null
      : catalogCollaborators.find((collaborator) => {
          if (parsedCollaborator.type === 'userCompany') {
            return collaborator.userCompanyId === parsedCollaborator.id;
          }

          if (parsedCollaborator.type === 'user') {
            return collaborator.userId === parsedCollaborator.id;
          }

          return normalizeFilterLabel(collaborator.name) === parsedCollaborator.name;
        }) ?? null;
    const assignSelectedCollaborator =
      selectedCollaborator != null &&
      collaboratorCanReceiveAssignment(selectedCollaborator, unitId, businessId, catalogBusinesses);

    const context: Record<string, string> = {};

    if (assignSelectedCollaborator) {
      context.assignedName = selectedCollaborator.name;
      context.assignedUserCompanyId = selectedCollaborator.userCompanyId.toString();
    }
    if (businessId != null) {
      context.businessId = businessId.toString();
    }
    if (selectedProject?.id != null) {
      context.projectId = selectedProject.id.toString();
    }
    if (unitId != null) {
      context.unitId = unitId.toString();
    }

    return context;
  }, [
    businessFilter,
    catalogBusinesses,
    catalogCollaborators,
    collaboratorFilter,
    projectFilter,
    projects,
    scopedCatalogBusinesses,
    scopedCatalogUnits,
    unitFilter,
  ]);
  const {
    handleCreateTaskClick,
    handleEditTask,
    handleQuickTaskDialogOpenChange,
    handleSubmitQuickTask,
    handleSubmitTask,
    handleTaskDialogOpenChange,
    isQuickTaskDialogOpen,
    isSubmittingTask,
    isTaskDialogOpen,
    quickTaskTitle,
    setIsQuickTaskDialogOpen,
    setQuickTaskTitle,
    setTaskForm,
    taskDialogMode,
    taskForm,
  } = useAgendaTaskFormDialog({
    agendaCopy,
    currentUserCollaborator,
    isProjectsCatalogReady,
    loadAgenda: loadVisibleAgenda,
    onTaskCreated: rememberCreatedTask,
    projects,
    quickTaskContext,
    quickTaskDate,
    selectedScheduleDate,
    setAgendaError,
    todayAgendaValue,
  });

  const {
    cancelTask,
    deleteTask,
    handleBusinessCellChange,
    handleConfirmCancelTask,
    handleConfirmDeleteTask,
    handleDuplicateTask,
    handleProjectCellChange,
    handlePriorityCellChange,
    handleResponsibleCellChange,
    handleUnitCellChange,
    persistTaskChange,
    scopeResponsiblePatch,
    setCancelTask,
    setDeleteTask,
  } = useAgendaTaskMutations({
    agendaCopy,
    attachmentsTask,
    catalogBusinesses,
    catalogCollaborators,
    catalogUnits,
    loadAgenda: loadVisibleAgenda,
    noBusinessValue: NO_BUSINESS_VALUE,
    noProjectValue: NO_PROJECT_VALUE,
    noUnitValue: NO_UNIT_VALUE,
    patchTaskInAgenda,
    projects,
    reportTask,
    scopedCatalogBusinesses,
    setAgendaError,
    setAttachmentsTask,
    setReportTask,
    setTaskPendingState,
    tasks,
    unassignedResponsibleValue: UNASSIGNED_RESPONSIBLE_VALUE,
  });

  const {
    bulkConfirmation,
    bulkResponsibleValue,
    bulkUnitValue,
    handleBulkAssign,
    handleBulkUnitChange,
    isBulkActionRunning,
    isBulkAssignOpen,
    isBulkUnitOpen,
    runBulkTaskAction,
    setBulkConfirmation,
    setBulkResponsibleValue,
    setBulkUnitValue,
    setIsBulkAssignOpen,
    setIsBulkUnitOpen,
  } = useAgendaBulkActions({
    agendaCopy,
    attachmentsTask,
    bulkDefaultUnitValue: NO_UNIT_VALUE,
    bulkUnassignedResponsibleValue: UNASSIGNED_RESPONSIBLE_VALUE,
    catalogCollaborators,
    loadAgenda: loadVisibleAgenda,
    reportTask,
    rowSelection,
    scopedCatalogBusinesses,
    scopedCatalogUnits,
    scopeResponsiblePatch,
    setAgendaError,
    setAgendaNotice,
    setAttachmentsTask,
    setManyTasksPendingState,
    setReportTask,
    tasks,
  });

  const handleDownloadTaskReport = useCallback(
    (task: AgendaTaskItem) => downloadAgendaTaskReport(task, agendaCopy),
    [agendaCopy],
  );

  const handleKanbanDrop = useAgendaKanbanDrop({
    activeRange: agendaEvaluationRange,
    agendaStatusDate,
    agendaCopy,
    draggingTaskId,
    handleAuditTask,
    handleCloseTask,
    persistTaskChange,
    setAgendaError,
    setDraggingTaskId,
    sortedTasks,
  });

  const agendaKpiMetrics = useAgendaKpiMetrics(filteredTasks, agendaStatusDate, agendaEvaluationRange);
  const renderTaskActions = (task: AgendaTaskItem) => (
    <AgendaTaskActions
      copy={agendaCopy}
      isPending={isTaskPending(task.taskId)}
      onAuditTask={handleAuditTask}
      onCloseTask={handleCloseTask}
      onCopyTask={handleDuplicateTask}
      onDeleteTask={setDeleteTask}
      onEditTask={handleEditTask}
      onOpenReport={setReportTask}
      task={task}
    />
  );

  const renderAgendaTaskCell = (task: AgendaTaskItem, columnId: AgendaColumnId): ReactNode => (
    <AgendaTaskCell
      auditStatusClasses={auditStatusClasses}
      agendaStatusDate={agendaStatusDate}
      agendaStatusRange={agendaEvaluationRange}
      businessOptionsForUnit={businessOptionsForUnit}
      collaboratorOptionsForScope={collaboratorOptionsForScope}
      columnId={columnId}
      copy={agendaCopy}
      isPending={isTaskPending(task.taskId)}
      noBusinessValue={NO_BUSINESS_VALUE}
      noProjectValue={NO_PROJECT_VALUE}
      noUnitValue={NO_UNIT_VALUE}
      onAuditTask={handleAuditTask}
      onBusinessChange={handleBusinessCellChange}
      onEditTask={handleEditTask}
      onOpenAttachments={setAttachmentsTask}
      onPersistTaskChange={persistTaskChange}
      onRequestCancel={setCancelTask}
      onRequestComplete={handleCloseTask}
      onPriorityChange={handlePriorityCellChange}
      onProjectChange={handleProjectCellChange}
      onResponsibleChange={handleResponsibleCellChange}
      onUnitChange={handleUnitCellChange}
      onUpdateSchedulePlacement={updateTaskSchedulePlacement}
      projects={projects}
      scopedCatalogUnits={scopedCatalogUnits}
      selectedScheduleDate={selectedScheduleDate}
      task={task}
      todayAgendaValue={todayAgendaValue}
      unassignedResponsibleValue={UNASSIGNED_RESPONSIBLE_VALUE}
    />
  );

  const renderKanbanBoard = () => (
    <AgendaKanbanView
      columns={agendaKanbanColumns}
      copy={agendaCopy}
      displayStatusClasses={agendaDisplayStatusClasses}
      draggingTaskId={draggingTaskId}
      isLoading={isAgendaViewLoading}
      isTaskPending={isTaskPending}
      kanbanTasksByColumn={kanbanTasksByColumn}
      onAuditTask={handleAuditTask}
      onCloseTask={handleCloseTask}
      onDrop={handleKanbanDrop}
      onEditTask={handleEditTask}
      onOpenAttachments={setAttachmentsTask}
      onSetDraggingTaskId={setDraggingTaskId}
      sortedTaskCount={sortedTasks.length}
      statusReferenceDate={agendaStatusDate}
      statusReferenceRange={agendaEvaluationRange}
    />
  );

  const renderAgendaDiagram = () => (
    <AgendaScheduleView
      agendaSchedulePlacements={agendaSchedulePlacements}
      copy={agendaCopy}
      displayStatusClasses={agendaDisplayStatusClasses}
      isLoading={isAgendaViewLoading}
      isTaskPending={isTaskPending}
      onCancelTask={setCancelTask}
      onCloseTask={handleCloseTask}
      onDeleteTask={setDeleteTask}
      onEditTask={handleEditTask}
      onOpenAttachments={setAttachmentsTask}
      onPersistTaskChange={persistTaskChange}
      onScheduleDateDrop={handleScheduleDateDrop}
      onScheduleDragEnd={handleScheduleDragEnd}
      onScheduleDragOver={handleScheduleDragOver}
      onScheduleDrop={handleScheduleDrop}
      onScheduleTaskDragStart={handleScheduleTaskDragStart}
      onScheduleViewModeChange={setScheduleViewMode}
      onSelectedScheduleDateChange={setSelectedScheduleDate}
      onUpdateTaskSchedulePlacement={updateTaskSchedulePlacement}
      scheduleDraggingTaskId={scheduleDraggingTaskId}
      scheduleViewMode={scheduleViewMode}
      selectedScheduleDate={selectedScheduleDate}
      sortedTasks={scheduleSortedTasks}
      todayAgendaValue={todayAgendaValue}
    />
  );

  const headerActions = (
    <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#9A6B05] shadow-none hover:bg-[#F4C84A] hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto"
        onClick={() => setIsColumnsModalOpen(true)}
      >
        <Columns3 className="h-4 w-4" />
        {headerCopy.actions.columns}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-[#9A6B05] shadow-none hover:border-[#F4C84A]/50 hover:bg-[#F4C84A]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-[#FEF3C7] sm:w-auto"
        onClick={handleOpenTaskKiosks}
      >
        <MonitorSmartphone className="h-5 w-5" />
        {headerCopy.actions.kiosk}
      </Button>
      <Button
        type="button"
        className={cn('h-10 w-full gap-2 rounded-xl px-4 text-sm font-semibold sm:w-auto', accentButtonClass)}
        onClick={handleCreateTaskClick}
      >
        <Plus className="h-4 w-4" />
        {headerCopy.actions.create}
      </Button>
    </div>
  );

  return (
    <>
      <LearningModeTitleBarBridge actions={headerActions}>
        <section className="mb-5 rounded-lg border border-[#F4C84A]/30 bg-[#F4C84A]/10 p-4 shadow-sm dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#F4C84A]/40 bg-white/70 text-xl shadow-sm dark:bg-slate-800" aria-hidden="true">
                {headerCopy.emoji}
              </span>
              <div className="min-w-0">
                <h2 className="mb-1 text-xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-2xl">
                  {headerCopy.title}
                </h2>
                <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                  {headerCopy.subtitle}
                </p>
              </div>
            </div>
            {headerActions}
          </div>
        </section>
      </LearningModeTitleBarBridge>

      {agendaError ? (
        <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{agendaError}</span>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl border-red-200 bg-white px-4 text-red-700 shadow-none dark:border-red-900/60 dark:bg-slate-800 dark:text-red-200"
              onClick={() => {
                void loadVisibleAgenda();
              }}
            >
              {agendaCopy.common.retry}
            </Button>
          </div>
        </section>
      ) : null}

      {agendaNotice ? (
        <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{agendaNotice}</span>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl border-emerald-200 bg-white px-4 text-emerald-700 shadow-none dark:border-emerald-900/60 dark:bg-slate-800 dark:text-emerald-200"
              onClick={() => setAgendaNotice(null)}
            >
              {agendaCopy.common.close}
            </Button>
          </div>
        </section>
      ) : null}

      <AgendaFilters
        businessFilter={businessFilter}
        businessOptions={businessOptions}
        collaboratorFilter={collaboratorFilter}
        collaboratorOptions={collaboratorOptions}
        copy={agendaCopy}
        customDateFrom={customDateFrom}
        customDateTo={customDateTo}
        focusFilter={focusFilter}
        focusLabels={agendaCopy.focus}
        onBusinessFilterChange={setBusinessFilter}
        onCollaboratorFilterChange={setCollaboratorFilter}
        onCustomDateFromChange={handleCustomDateFromChange}
        onCustomDateToChange={handleCustomDateToChange}
        onFocusFilterChange={handleFocusFilterChange}
        onPeriodFilterChange={setPeriodFilter}
        onProjectFilterChange={setProjectFilter}
        onSearchQueryChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
        onUnitFilterChange={setUnitFilter}
        onViewModeChange={setViewMode}
        periodFilter={periodFilter}
        periodLabels={periodLabels}
        projectFilter={projectFilter}
        projectOptions={projectOptions}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        unitFilter={unitFilter}
        unitOptions={unitOptions}
        viewMode={viewMode}
      />

      {!learningModeActive ? (
        <AgendaKpiStrip copy={agendaCopy.kpiStrip} isLoading={isAgendaViewLoading} metrics={agendaKpiMetrics} />
      ) : null}

      {viewMode === 'table' && rowSelection.selectedCount > 0 ? (
        <AgendaBulkActionsBar
          copy={agendaCopy}
          isRunning={isBulkActionRunning}
          onClearSelection={rowSelection.clearSelection}
          onComplete={() => setBulkConfirmation('complete')}
          onDelete={() => setBulkConfirmation('delete')}
          onDuplicate={() => {
            void runBulkTaskAction('duplicate');
          }}
          onOpenAssign={() => setIsBulkAssignOpen(true)}
          onOpenUnit={() => setIsBulkUnitOpen(true)}
          onPriorityChange={(priority) => {
            void runBulkTaskAction('priority', { priority });
          }}
          selectedCount={rowSelection.selectedCount}
        />
      ) : null}

      {viewMode === 'table' ? (
        <AgendaTableView
          agendaColumnWidths={agendaColumnWidths}
          agendaCopy={agendaCopy}
          agendaTableColumnCount={agendaTableColumnCount}
          agendaTableMinWidth={agendaTableMinWidth}
          filteredTasks={filteredTasks}
          fixedAgendaColumns={fixedAgendaColumns}
          handleResizeStart={handleResizeStart}
          handleSort={handleSort}
          isAgendaViewLoading={isAgendaViewLoading}
          isTaskPending={isTaskPending}
          onClearFilters={clearFilters}
          onCreateTask={handleCreateTaskClick}
          renderAgendaTaskCell={renderAgendaTaskCell}
          renderTaskActions={renderTaskActions}
          resizingColumn={resizingColumn}
          rowSelection={rowSelection}
          selectionColumnWidth={selectionColumnWidth}
          sortState={sortState}
          sortedTasks={sortedTasks}
          visibleAgendaColumns={visibleAgendaColumns}
        />
      ) : viewMode === 'kanban' ? (
        renderKanbanBoard()
      ) : (
        renderAgendaDiagram()
      )}

      <ColumnasConfigModal
        isOpen={isColumnsModalOpen}
        onClose={() => setIsColumnsModalOpen(false)}
        columns={translatedAgendaColumns}
        defaultColumns={defaultAgendaColumns}
        fixedColumns={fixedAgendaColumns}
        theme="processes"
        onSave={setAgendaColumns}
      />

      <TaskKioskManagementModal
        isOpen={isTaskKioskModalOpen}
        isSaving={isTaskKioskSaving}
        kiosks={taskKiosks}
        unitOptions={catalogUnits}
        businessOptions={catalogBusinesses}
        onClose={handleCloseTaskKiosks}
        onSave={handleSaveTaskKiosk}
        onDelete={handleDeleteTaskKiosk}
        onCopy={handleCopyTaskKiosk}
        onOpen={handleOpenTaskKiosk}
        onRotate={handleRotateTaskKiosk}
        onTransition={handleTransitionTaskKiosk}
      />

      <TaskKioskConfirmationDialog
        open={Boolean(taskKioskPendingDeletion)}
        title={`${agendaCopy.common.delete} ${agendaCopy.header.actions.kiosk}`}
        itemName={taskKioskPendingDeletion?.name}
        description="La definición del kiosko se eliminará físicamente. Las tareas, evidencias y auditoría funcional permanecerán intactas."
        error={agendaError}
        confirmLabel={agendaCopy.common.delete}
        cancelLabel={agendaCopy.common.cancel}
        busy={isTaskKioskSaving}
        onCancel={handleCancelDeleteTaskKiosk}
        onConfirm={() => {
          void handleConfirmDeleteTaskKiosk();
        }}
      />

      <TaskKioskConfirmationDialog
        open={Boolean(taskKioskPendingTransition)}
        title={taskKioskPendingTransition?.transition === 'revoke'
          ? 'Revocar kiosko'
          : taskKioskPendingTransition?.transition === 'rotate'
            ? 'Rotar liga del kiosko'
            : 'Desactivar kiosko'}
        itemName={taskKioskPendingTransition?.kiosk.name}
        description={taskKioskPendingTransition?.transition === 'rotate'
          ? 'La liga actual dejará de funcionar y la nueva liga solo se mostrará durante esta sesión administrativa.'
          : taskKioskPendingTransition?.transition === 'revoke'
            ? 'La revocación es definitiva. Para recuperar el acceso será necesario crear un kiosko nuevo.'
            : 'El acceso quedará suspendido y las sesiones activas se cerrarán de inmediato.'}
        error={agendaError}
        confirmLabel={taskKioskPendingTransition?.transition === 'revoke'
          ? 'Revocar definitivamente'
          : taskKioskPendingTransition?.transition === 'rotate'
            ? 'Rotar y emitir una sola vez'
            : 'Desactivar'}
        cancelLabel={agendaCopy.common.cancel}
        busy={isTaskKioskSaving}
        onCancel={handleCancelTaskKioskTransition}
        onConfirm={() => { void handleConfirmTaskKioskTransition(); }}
      />

      <TaskFormDialog
        error={agendaError}
        copy={agendaCopy}
        open={isTaskDialogOpen}
        onOpenChange={handleTaskDialogOpenChange}
        mode={taskDialogMode}
        layout={taskDialogMode === 'create' ? 'quickCreate' : 'full'}
        onSubmit={handleSubmitTask}
        form={taskForm}
        isSubmitting={isSubmittingTask}
        processes={processes}
        projects={projects}
        unitOptions={catalogUnits}
        businessOptions={catalogBusinesses}
        collaboratorOptions={catalogCollaborators}
        currentUserCollaborator={currentUserCollaborator}
        setForm={setTaskForm}
      />

      <Button
        type="button"
        title={agendaCopy.quickAdd.buttonLabel}
        aria-label={agendaCopy.quickAdd.buttonLabel}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 h-12 w-12 rounded-full border border-[#F4C84A]/60 bg-[#F4C84A] p-0 text-slate-950 shadow-lg shadow-[#F4C84A]/25 hover:bg-[#E5B835] sm:bottom-6 sm:right-6"
        onClick={() => setIsQuickTaskDialogOpen(true)}
      >
        <Plus className="h-5 w-5" />
      </Button>

      <AgendaQuickTaskDialog
        copy={agendaCopy}
        error={agendaError}
        isSubmitting={isSubmittingTask}
        onOpenChange={handleQuickTaskDialogOpenChange}
        onSubmit={handleSubmitQuickTask}
        onTitleChange={setQuickTaskTitle}
        open={isQuickTaskDialogOpen}
        title={quickTaskTitle}
      />

      <TaskCompletionDialog
        copy={agendaCopy.completionDialog}
        error={agendaError}
        open={Boolean(completionTask)}
        onOpenChange={handleCompletionDialogOpenChange}
        task={completionTask}
        completionNotes={completionNotes}
        completionPercent={completionPercent}
        onCompletionNotesChange={setCompletionNotes}
        onCompletionPercentChange={setCompletionPercent}
        onConfirm={() => {
          void handleConfirmComplete();
        }}
        isSubmitting={completionTask ? isTaskPending(completionTask.taskId) : false}
      />

      <TaskAuditDialog
        copy={agendaCopy.auditDialog}
        error={agendaError}
        open={Boolean(auditTask)}
        onOpenChange={handleAuditDialogOpenChange}
        task={auditTask}
        weighting={auditWeighting}
        auditNotes={auditNotes}
        onWeightingChange={setAuditWeighting}
        onAuditNotesChange={setAuditNotes}
        onConfirm={() => {
          void handleConfirmAudit();
        }}
        isSubmitting={auditTask ? isTaskPending(auditTask.taskId) : false}
      />

      <TaskAttachmentsDialog
        commonCopy={agendaCopy.common}
        copy={agendaCopy.attachmentsDialog}
        open={Boolean(attachmentsTask)}
        task={attachmentsTask}
        onOpenChange={(open) => {
          if (!open) {
            setAttachmentsTask(null);
          }
        }}
        onChanged={loadVisibleAgenda}
      />

      <AgendaReportDialog
        copy={agendaCopy}
        onDownload={handleDownloadTaskReport}
        onOpenChange={(open) => {
          if (!open) {
            setReportTask(null);
          }
        }}
        task={reportTask}
      />

      <AgendaBulkDialogs
        bulkResponsibleValue={bulkResponsibleValue}
        bulkUnitValue={bulkUnitValue}
        collaborators={catalogCollaborators}
        copy={agendaCopy}
        isAssignOpen={isBulkAssignOpen}
        isRunning={isBulkActionRunning}
        isUnitOpen={isBulkUnitOpen}
        noUnitValue={NO_UNIT_VALUE}
        onAssignConfirm={handleBulkAssign}
        onAssignOpenChange={setIsBulkAssignOpen}
        onResponsibleValueChange={setBulkResponsibleValue}
        onUnitConfirm={handleBulkUnitChange}
        onUnitOpenChange={setIsBulkUnitOpen}
        onUnitValueChange={setBulkUnitValue}
        selectedCount={rowSelection.selectedCount}
        unassignedResponsibleValue={UNASSIGNED_RESPONSIBLE_VALUE}
        units={scopedCatalogUnits}
      />

      <ConfirmDeleteDialog
        isVisible={bulkConfirmation === 'delete'}
        title={agendaCopy.deleteDialog.title}
        itemName={`${rowSelection.selectedCount} tarea${rowSelection.selectedCount === 1 ? '' : 's'}`}
        description={agendaCopy.deleteDialog.description}
        confirmLabel={agendaCopy.deleteDialog.confirm}
        cancelLabel={agendaCopy.common.cancel}
        confirmDisabled={isBulkActionRunning}
        onCancel={() => setBulkConfirmation(null)}
        onConfirm={() => {
          void runBulkTaskAction('delete');
        }}
      />

      <ConfirmDeleteDialog
        isVisible={bulkConfirmation === 'complete'}
        title={agendaCopy.actions.closeTask}
        itemName={`${rowSelection.selectedCount} tarea${rowSelection.selectedCount === 1 ? '' : 's'}`}
        description="Cierra las tareas seleccionadas usando el flujo existente de cierre."
        confirmLabel={agendaCopy.actions.closeTask}
        cancelLabel={agendaCopy.common.cancel}
        confirmDisabled={isBulkActionRunning}
        onCancel={() => setBulkConfirmation(null)}
        onConfirm={() => {
          void runBulkTaskAction('complete');
        }}
      />

      <ConfirmDeleteDialog
        isVisible={Boolean(cancelTask)}
        title={agendaCopy.common.cancel}
        itemName={cancelTask?.title}
        description="La tarea quedará cancelada y conservará su historial para consulta."
        confirmLabel={agendaCopy.common.cancel}
        cancelLabel={agendaCopy.common.close}
        confirmDisabled={cancelTask ? isTaskPending(cancelTask.taskId) : false}
        onCancel={() => setCancelTask(null)}
        onConfirm={() => {
          void handleConfirmCancelTask();
        }}
      />

      <ConfirmDeleteDialog
        isVisible={Boolean(deleteTask)}
        title={agendaCopy.deleteDialog.title}
        itemName={deleteTask?.title}
        description={agendaCopy.deleteDialog.description}
        confirmLabel={agendaCopy.deleteDialog.confirm}
        cancelLabel={agendaCopy.common.cancel}
        confirmDisabled={deleteTask ? isTaskPending(deleteTask.taskId) : false}
        onCancel={() => setDeleteTask(null)}
        onConfirm={() => {
          void handleConfirmDeleteTask();
        }}
      />
    </>
  );
}
