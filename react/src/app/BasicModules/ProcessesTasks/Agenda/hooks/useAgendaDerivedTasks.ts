import { useEffect, useMemo, useState } from 'react';
import type { ProcessCollaboratorOption } from '../../Processes/types';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import type {
  AgendaColumnId,
  AgendaFocusFilter,
  AgendaKanbanColumn,
  AgendaKanbanColumnId,
  AgendaLoadRange,
  AgendaSortState,
  OptionFilter,
  PeriodFilter,
  StatusFilter,
} from '../types';
import {
  agendaParticipantOptions,
  agendaProjectFilterValue,
  agendaProjectOptions,
  businessFilterValue,
  taskMatchesParticipantFilter,
  unitFilterValue,
  uniqueSortedOptions,
} from '../utils/agendaFilterOptions';
import {
  getTaskKanbanColumnId,
  matchesAgendaFocus,
  matchesAgendaPeriod,
  taskDueDateValue,
  taskMatchesStatusFilter,
} from '../utils/agendaTaskStatus';
import {
  getTaskScheduleDateKey,
  getTaskScheduleHour,
} from '../utils/agendaScheduleUtils';
import {
  compareAgendaSortValues,
  compareAgendaText,
  getAgendaSortValue,
} from '../utils/agendaSorting';

type VisibleSelectionState = {
  allVisibleSelected: boolean;
  selectedVisibleCount: number;
  someVisibleSelected: boolean;
};

type UseAgendaDerivedTasksOptions = {
  agendaCopy: AgendaTranslations;
  agendaKanbanColumns: AgendaKanbanColumn[];
  activeRange: AgendaLoadRange;
  agendaStatusDate: string;
  businessFilter: string;
  catalogCollaborators: ProcessCollaboratorOption[];
  collaboratorFilter: string;
  currentUserId: number | null;
  focusFilter: AgendaFocusFilter;
  isLoadingCurrentUser: boolean;
  isLoadingTasks: boolean;
  periodFilter: PeriodFilter;
  projectFilter: string;
  searchQuery: string;
  scheduleStatusDate: string;
  scheduleStatusRange: AgendaLoadRange;
  setBusinessFilter: (value: string) => void;
  setCollaboratorFilter: (value: string) => void;
  setProjectFilter: (value: string) => void;
  setUnitFilter: (value: string) => void;
  statusFilter: StatusFilter;
  tasks: AgendaTaskItem[];
  todayAgendaValue: string;
  unitFilter: string;
  visibleSelectionState: (visibleIds: readonly number[]) => VisibleSelectionState;
};

function sortAgendaTasks(
  tasksToSort: AgendaTaskItem[],
  sortState: AgendaSortState,
  agendaCopy: AgendaTranslations,
  todayAgendaValue: string,
  agendaStatusDate: string,
  activeRange: AgendaLoadRange,
) {
  return tasksToSort
    .map((task, index) => ({ index, task }))
    .sort((left, right) => {
      const comparison = compareAgendaSortValues(
        getAgendaSortValue(left.task, sortState.columnId, agendaCopy, todayAgendaValue, agendaStatusDate, activeRange),
        getAgendaSortValue(right.task, sortState.columnId, agendaCopy, todayAgendaValue, agendaStatusDate, activeRange),
        sortState.direction,
      );

      if (comparison !== 0) {
        return comparison;
      }

      const leftDate = getTaskScheduleDateKey(left.task, todayAgendaValue) ?? taskDueDateValue(left.task) ?? '';
      const rightDate = getTaskScheduleDateKey(right.task, todayAgendaValue) ?? taskDueDateValue(right.task) ?? '';
      const dateComparison = compareAgendaText(leftDate, rightDate);

      if (dateComparison !== 0) {
        return dateComparison;
      }

      const leftHour = getTaskScheduleHour(left.task, todayAgendaValue) ?? '99:99';
      const rightHour = getTaskScheduleHour(right.task, todayAgendaValue) ?? '99:99';
      const hourComparison = compareAgendaText(leftHour, rightHour);

      return hourComparison === 0 ? left.index - right.index : hourComparison;
    })
    .map(({ task }) => task);
}

function normalizeAgendaSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function taskMatchesSearch(task: AgendaTaskItem, normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  return [
    task.folio,
    task.title,
    task.description,
    task.assignedName,
    task.responsible,
    task.createdByName,
    task.creator,
    task.projectFolio,
    task.projectName,
    task.project,
    task.processFolio,
    task.processTitle,
    task.unitName,
    task.unit,
    task.businessName,
    task.business,
    task.status,
    task.priority,
    task.taskType,
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .some((value) => normalizeAgendaSearch(value).includes(normalizedQuery));
}

export function useAgendaDerivedTasks({
  agendaCopy,
  agendaKanbanColumns,
  activeRange,
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
  visibleSelectionState,
}: UseAgendaDerivedTasksOptions) {
  const [sortState, setSortState] = useState<AgendaSortState>({
    columnId: 'dueDate',
    direction: 'asc',
  });

  const periodFilteredTasks = useMemo(
    () => tasks.filter((task) => matchesAgendaPeriod(
      task,
      periodFilter,
      todayAgendaValue,
      activeRange,
      agendaStatusDate,
    )),
    [activeRange, agendaStatusDate, periodFilter, tasks, todayAgendaValue],
  );

  const focusFilteredTasks = useMemo(
    () => periodFilteredTasks.filter((task) => matchesAgendaFocus(task, focusFilter, currentUserId)),
    [currentUserId, focusFilter, periodFilteredTasks],
  );

  const normalizedSearchQuery = useMemo(() => normalizeAgendaSearch(searchQuery), [searchQuery]);

  const searchFilteredTasks = useMemo(
    () => focusFilteredTasks.filter((task) => taskMatchesSearch(task, normalizedSearchQuery)),
    [focusFilteredTasks, normalizedSearchQuery],
  );

  const scheduleFocusFilteredTasks = useMemo(
    () => tasks.filter((task) => matchesAgendaFocus(task, focusFilter, currentUserId)),
    [currentUserId, focusFilter, tasks],
  );

  const scheduleSearchFilteredTasks = useMemo(
    () => scheduleFocusFilteredTasks.filter((task) => taskMatchesSearch(task, normalizedSearchQuery)),
    [normalizedSearchQuery, scheduleFocusFilteredTasks],
  );

  const isAgendaViewLoading =
    isLoadingTasks || ((focusFilter === 'mine' || focusFilter === 'delegated') && isLoadingCurrentUser);

  const unitOptions = useMemo(
    () => uniqueSortedOptions(searchFilteredTasks, (task) => unitFilterValue(task, agendaCopy)),
    [agendaCopy, searchFilteredTasks],
  );

  const tasksMatchingSelectedUnit = useMemo(
    () =>
      unitFilter === 'all'
        ? searchFilteredTasks
        : searchFilteredTasks.filter((task) => unitFilterValue(task, agendaCopy) === unitFilter),
    [agendaCopy, searchFilteredTasks, unitFilter],
  );

  const businessOptions = useMemo(
    () => uniqueSortedOptions(tasksMatchingSelectedUnit, (task) => businessFilterValue(task, agendaCopy)),
    [agendaCopy, tasksMatchingSelectedUnit],
  );

  const tasksMatchingSelectedBusiness = useMemo(
    () =>
      businessFilter === 'all'
        ? tasksMatchingSelectedUnit
        : tasksMatchingSelectedUnit.filter((task) => businessFilterValue(task, agendaCopy) === businessFilter),
    [agendaCopy, businessFilter, tasksMatchingSelectedUnit],
  );

  const projectOptions = useMemo(
    () => agendaProjectOptions(tasksMatchingSelectedBusiness, agendaCopy),
    [agendaCopy, tasksMatchingSelectedBusiness],
  );

  const projectOptionMap = useMemo(
    () => new Map(projectOptions.map((option) => [option.value, option])),
    [projectOptions],
  );

  const tasksMatchingSelectedProject = useMemo(
    () =>
      projectFilter === 'all'
        ? tasksMatchingSelectedBusiness
        : tasksMatchingSelectedBusiness.filter((task) => agendaProjectFilterValue(task) === projectFilter),
    [projectFilter, tasksMatchingSelectedBusiness],
  );

  const collaboratorOptions = useMemo(
    () => agendaParticipantOptions(tasksMatchingSelectedProject, agendaCopy.common.unassigned),
    [agendaCopy.common.unassigned, tasksMatchingSelectedProject],
  );

  const collaboratorOptionMap = useMemo(
    () => new Map(collaboratorOptions.map((option) => [option.value, option])),
    [collaboratorOptions],
  );

  const currentUserCollaborator = useMemo(
    () =>
      currentUserId == null
        ? null
        : catalogCollaborators.find((collaborator) => collaborator.userId === currentUserId) ?? null,
    [catalogCollaborators, currentUserId],
  );

  useEffect(() => {
    if (isLoadingTasks) {
      return;
    }
    if (unitFilter !== 'all' && !unitOptions.includes(unitFilter)) {
      setUnitFilter('all');
    }
  }, [isLoadingTasks, setUnitFilter, unitFilter, unitOptions]);

  useEffect(() => {
    if (isLoadingTasks) {
      return;
    }
    if (businessFilter !== 'all' && !businessOptions.includes(businessFilter)) {
      setBusinessFilter('all');
    }
  }, [businessFilter, businessOptions, isLoadingTasks, setBusinessFilter]);

  useEffect(() => {
    if (isLoadingTasks) {
      return;
    }
    if (collaboratorFilter !== 'all' && !collaboratorOptionMap.has(collaboratorFilter)) {
      setCollaboratorFilter('all');
    }
  }, [collaboratorFilter, collaboratorOptionMap, isLoadingTasks, setCollaboratorFilter]);

  useEffect(() => {
    if (isLoadingTasks) {
      return;
    }
    if (projectFilter !== 'all' && !projectOptionMap.has(projectFilter)) {
      setProjectFilter('all');
    }
  }, [isLoadingTasks, projectFilter, projectOptionMap, setProjectFilter]);

  const handleSort = (columnId: AgendaColumnId) => {
    setSortState((currentState) =>
      currentState.columnId === columnId
        ? {
            columnId,
            direction: currentState.direction === 'asc' ? 'desc' : 'asc',
          }
        : {
            columnId,
            direction: 'asc',
          },
    );
  };

  const filteredTasks = useMemo(() => {
    const selectedCollaborator =
      collaboratorFilter === 'all' ? null : collaboratorOptionMap.get(collaboratorFilter) ?? null;

    return tasksMatchingSelectedProject.filter((task) => {
      const matchesCollaborator =
        selectedCollaborator == null || taskMatchesParticipantFilter(task, selectedCollaborator);
      const matchesStatus = taskMatchesStatusFilter(task, statusFilter, {
        referenceDate: agendaStatusDate,
        range: activeRange,
      });

      return matchesCollaborator && matchesStatus;
    });
  }, [
    activeRange,
    agendaStatusDate,
    collaboratorFilter,
    collaboratorOptionMap,
    statusFilter,
    tasksMatchingSelectedProject,
  ]);

  const scheduleTasksMatchingSelectedUnit = useMemo(
    () =>
      unitFilter === 'all'
        ? scheduleSearchFilteredTasks
        : scheduleSearchFilteredTasks.filter((task) => unitFilterValue(task, agendaCopy) === unitFilter),
    [agendaCopy, scheduleSearchFilteredTasks, unitFilter],
  );

  const scheduleTasksMatchingSelectedBusiness = useMemo(
    () =>
      businessFilter === 'all'
        ? scheduleTasksMatchingSelectedUnit
        : scheduleTasksMatchingSelectedUnit.filter((task) => businessFilterValue(task, agendaCopy) === businessFilter),
    [agendaCopy, businessFilter, scheduleTasksMatchingSelectedUnit],
  );

  const scheduleTasksMatchingSelectedProject = useMemo(
    () =>
      projectFilter === 'all'
        ? scheduleTasksMatchingSelectedBusiness
        : scheduleTasksMatchingSelectedBusiness.filter((task) => agendaProjectFilterValue(task) === projectFilter),
    [projectFilter, scheduleTasksMatchingSelectedBusiness],
  );

  const scheduleCollaboratorOptions = useMemo(
    () => agendaParticipantOptions(scheduleTasksMatchingSelectedProject, agendaCopy.common.unassigned),
    [agendaCopy.common.unassigned, scheduleTasksMatchingSelectedProject],
  );

  const scheduleCollaboratorOptionMap = useMemo(
    () => new Map(scheduleCollaboratorOptions.map((option) => [option.value, option])),
    [scheduleCollaboratorOptions],
  );

  const scheduleFilteredTasks = useMemo(() => {
    const selectedCollaborator =
      collaboratorFilter === 'all'
        ? null
        : scheduleCollaboratorOptionMap.get(collaboratorFilter) ?? collaboratorOptionMap.get(collaboratorFilter) ?? null;

    return scheduleTasksMatchingSelectedProject.filter((task) => {
      const matchesCollaborator =
        selectedCollaborator == null || taskMatchesParticipantFilter(task, selectedCollaborator);
      const matchesStatus = taskMatchesStatusFilter(task, statusFilter, {
        referenceDate: scheduleStatusDate,
        range: scheduleStatusRange,
      });

      return matchesCollaborator && matchesStatus;
    });
  }, [
    collaboratorFilter,
    collaboratorOptionMap,
    scheduleCollaboratorOptionMap,
    scheduleStatusDate,
    scheduleStatusRange,
    scheduleTasksMatchingSelectedProject,
    statusFilter,
  ]);

  const sortedTasks = useMemo(
    () => sortAgendaTasks(filteredTasks, sortState, agendaCopy, todayAgendaValue, agendaStatusDate, activeRange),
    [activeRange, agendaCopy, agendaStatusDate, filteredTasks, sortState, todayAgendaValue],
  );

  const scheduleSortedTasks = useMemo(
    () => sortAgendaTasks(
      scheduleFilteredTasks,
      sortState,
      agendaCopy,
      todayAgendaValue,
      scheduleStatusDate,
      scheduleStatusRange,
    ),
    [agendaCopy, scheduleFilteredTasks, scheduleStatusDate, scheduleStatusRange, sortState, todayAgendaValue],
  );

  const visibleTaskIds = useMemo(() => sortedTasks.map((task) => task.taskId), [sortedTasks]);
  const visibleTaskSelection = visibleSelectionState(visibleTaskIds);

  const kanbanTasksByColumn = useMemo(() => {
    const groupedTasks = new Map<AgendaKanbanColumnId, AgendaTaskItem[]>();
    agendaKanbanColumns.forEach((column) => groupedTasks.set(column.id, []));

    sortedTasks.forEach((task) => {
      groupedTasks.get(getTaskKanbanColumnId(task, agendaStatusDate, activeRange))?.push(task);
    });

    return groupedTasks;
  }, [activeRange, agendaKanbanColumns, agendaStatusDate, sortedTasks]);

  return {
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
    visibleTaskIds,
    visibleTaskSelection,
  };
}
