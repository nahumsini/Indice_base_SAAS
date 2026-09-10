import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AgendaFocusFilter, PeriodFilter, StatusFilter } from '../../Agenda/types';
import type { PublicTaskKioskCompleteResponse, PublicTaskKioskTask } from '../processTaskKioskApi';
import { filterKioskTasks, getKioskTaskAgendaStatus } from '../taskKioskFilterEngine';
import type { TaskKioskTranslations } from '../translations';

export const employeeTaskCapabilities = {
  read: 'process-tasks.tasks.read@1',
  create: 'process-tasks.task.create@1',
  complete: 'process-tasks.task.complete@1',
} as const;

export const employeeTaskAllFilterValue = 'all';
const emptyFilterValue = 'empty';

export type EmployeeTaskMultiKioskAction = <T = unknown>(capability: string, payload: Record<string, unknown>) => Promise<T>;
export type EmployeeTaskAgendaView = 'agenda' | 'board';
export type EmployeeTaskDateRange = 'day' | 'week' | 'month' | 'all';
export type EmployeeTaskStatusFilter = Extract<StatusFilter, 'pending_overdue' | 'overdue' | 'pending' | 'in_progress' | 'paused' | 'completed'>;
export type EmployeeTaskCreatePriority = 'low' | 'medium' | 'high';

export interface EmployeeTaskCreateDraft {
  description: string;
  dueDate: string;
  priority: EmployeeTaskCreatePriority;
  title: string;
}

type TaskActionResponse = Partial<PublicTaskKioskCompleteResponse>;

interface UseEmployeeTaskMultiKioskWorkspaceOptions {
  bootstrapTasks: PublicTaskKioskTask[];
  canComplete: boolean;
  canCreate: boolean;
  copy: TaskKioskTranslations;
  onAction: EmployeeTaskMultiKioskAction;
  onAuthorizationFailure: (error: unknown) => boolean;
  onRefresh: () => Promise<void>;
  sessionId: string;
}

export function localEmployeeTaskDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDate(value: string, amount: number, unit: 'day' | 'month' = 'day') {
  const date = new Date(`${value}T00:00:00`);
  if (unit === 'month') date.setMonth(date.getMonth() + amount);
  else date.setDate(date.getDate() + amount);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function periodForRange(range: EmployeeTaskDateRange): PeriodFilter {
  return range === 'day' ? 'today' : range;
}

function emptyCreateDraft(): EmployeeTaskCreateDraft {
  return { description: '', dueDate: localEmployeeTaskDate(), priority: 'medium', title: '' };
}

function matchesSearch(task: PublicTaskKioskTask, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  return [task.title, task.description, task.folio, task.process_title, task.project_name, task.assigned_name]
    .some(value => value?.toLocaleLowerCase().includes(normalizedQuery));
}

function matchesOrigin(task: PublicTaskKioskTask, origin: string) {
  if (origin === employeeTaskAllFilterValue) return true;
  const [kind, rawId] = origin.split(':');
  const id = Number(rawId);
  return kind === 'project' ? task.project_id === id : kind === 'process' && task.process_id === id;
}

export function useEmployeeTaskMultiKioskWorkspace({
  bootstrapTasks,
  canComplete,
  canCreate,
  copy,
  onAction,
  onAuthorizationFailure,
  onRefresh,
  sessionId,
}: UseEmployeeTaskMultiKioskWorkspaceOptions) {
  const [tasks, setTasks] = useState(bootstrapTasks);
  const [focusFilter, setFocusFilter] = useState<AgendaFocusFilter>('mine');
  const [dateRange, setDateRange] = useState<EmployeeTaskDateRange>('day');
  const [selectedDate, setSelectedDate] = useState(localEmployeeTaskDate);
  const [statusFilter, setStatusFilterState] = useState<EmployeeTaskStatusFilter>('pending_overdue');
  const [viewMode, setViewMode] = useState<EmployeeTaskAgendaView>('agenda');
  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState(employeeTaskAllFilterValue);
  const [unitFilter, setUnitFilter] = useState(employeeTaskAllFilterValue);
  const [businessFilter, setBusinessFilter] = useState(employeeTaskAllFilterValue);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [completionPercent, setCompletionPercent] = useState(100);
  const [completionNotes, setCompletionNotes] = useState('');
  const [createDraft, setCreateDraft] = useState<EmployeeTaskCreateDraft>(emptyCreateDraft);
  const [createError, setCreateError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState<'complete' | 'create' | 'refresh' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const completeRequestInFlightRef = useRef(false);
  const createRequestInFlightRef = useRef(false);

  useEffect(() => setTasks(bootstrapTasks), [bootstrapTasks]);

  useEffect(() => {
    setFocusFilter('mine');
    setDateRange('day');
    setSelectedDate(localEmployeeTaskDate());
    setStatusFilterState('pending_overdue');
    setViewMode('agenda');
    setSearchQuery('');
    setOriginFilter(employeeTaskAllFilterValue);
    setUnitFilter(employeeTaskAllFilterValue);
    setBusinessFilter(employeeTaskAllFilterValue);
    setFiltersOpen(false);
    setSelectedTaskId(null);
    setCompletionNotes('');
    setCreateDraft(emptyCreateDraft());
    setCreateError('');
    setCreateOpen(false);
    completeRequestInFlightRef.current = false;
    createRequestInFlightRef.current = false;
    setErrorMessage('');
    setDialogError('');
    setSuccessMessage('');
  }, [sessionId]);

  const unitOptions = useMemo(() => {
    const options = new Map<string, string>();
    tasks.forEach(task => options.set(String(task.unit_id ?? emptyFilterValue), task.unit_name || copy.filters.unassignedUnit));
    return [...options.entries()].map(([value, label]) => ({ label, value }));
  }, [copy.filters.unassignedUnit, tasks]);

  const businessOptions = useMemo(() => {
    const options = new Map<string, string>();
    tasks
      .filter(task => unitFilter === employeeTaskAllFilterValue || String(task.unit_id ?? emptyFilterValue) === unitFilter)
      .forEach(task => options.set(String(task.business_id ?? emptyFilterValue), task.business_name || copy.filters.unassignedBusiness));
    return [...options.entries()].map(([value, label]) => ({ label, value }));
  }, [copy.filters.unassignedBusiness, tasks, unitFilter]);

  const originOptions = useMemo(() => {
    const options = new Map<string, string>();
    tasks.forEach((task) => {
      if (task.project_id != null && task.project_name) options.set(`project:${task.project_id}`, task.project_name);
      if (task.process_id != null && task.process_title) options.set(`process:${task.process_id}`, task.process_title);
    });
    return [...options.entries()].map(([value, label]) => ({ label, value }));
  }, [tasks]);

  const filterTasks = useCallback((focus: AgendaFocusFilter, status: StatusFilter) => (
    filterKioskTasks(tasks, {
      business: businessFilter,
      focus,
      period: periodForRange(dateRange),
      status,
      unit: unitFilter,
    }, selectedDate)
      .filter(task => matchesOrigin(task, originFilter))
      .filter(task => matchesSearch(task, searchQuery))
  ), [businessFilter, dateRange, originFilter, searchQuery, selectedDate, tasks, unitFilter]);

  const visibleTasks = useMemo(() => filterTasks(focusFilter, statusFilter), [filterTasks, focusFilter, statusFilter]);
  const openTasks = useMemo(() => filterTasks(focusFilter, 'pending_overdue'), [filterTasks, focusFilter]);
  const resolvedTasks = useMemo(() => filterTasks(focusFilter, 'completed'), [filterTasks, focusFilter]);
  const overdueTasks = useMemo(
    () => openTasks.filter(task => getKioskTaskAgendaStatus(task, selectedDate) === 'overdue'),
    [openTasks, selectedDate],
  );
  const focusCounts = useMemo(() => ({
    mine: filterTasks('mine', statusFilter).length,
    delegated: filterTasks('delegated', statusFilter).length,
    team: filterTasks('team', statusFilter).length,
  }), [filterTasks, statusFilter]);
  const selectedTask = tasks.find(task => task.id === selectedTaskId) ?? null;
  const activeFilterCount = Number(dateRange !== 'day' || selectedDate !== localEmployeeTaskDate())
    + Number(statusFilter !== 'pending_overdue')
    + Number(originFilter !== employeeTaskAllFilterValue)
    + Number(unitFilter !== employeeTaskAllFilterValue)
    + Number(businessFilter !== employeeTaskAllFilterValue);

  const handleRefresh = useCallback(async () => {
    if (busy) return;
    setBusy('refresh');
    setErrorMessage('');
    try {
      await onRefresh();
    } catch (error) {
      if (!onAuthorizationFailure(error)) setErrorMessage(copy.errors.refreshFailure);
    } finally {
      setBusy(null);
    }
  }, [busy, copy.errors.refreshFailure, onAuthorizationFailure, onRefresh]);

  const handleOpenTask = (task: PublicTaskKioskTask) => {
    setSelectedTaskId(task.id);
    setCompletionPercent(task.completion_percent > 0 ? task.completion_percent : 100);
    setCompletionNotes('');
    setDialogError('');
  };
  const handleOpenCreate = () => {
    if (!canCreate || busy || createRequestInFlightRef.current) return;
    setCreateDraft(emptyCreateDraft());
    setCreateError('');
    setCreateOpen(true);
  };
  const handleCloseCreate = () => {
    if (busy === 'create' || createRequestInFlightRef.current) return;
    setCreateOpen(false);
    setCreateError('');
  };
  const updateCreateDraft = <Field extends keyof EmployeeTaskCreateDraft>(field: Field, value: EmployeeTaskCreateDraft[Field]) => {
    setCreateDraft(current => ({ ...current, [field]: value }));
    setCreateError('');
  };
  const resetAgenda = () => {
    setFocusFilter('mine');
    setDateRange('day');
    setSelectedDate(localEmployeeTaskDate());
    setStatusFilterState('pending_overdue');
    setViewMode('agenda');
    setSearchQuery('');
    setOriginFilter(employeeTaskAllFilterValue);
    setUnitFilter(employeeTaskAllFilterValue);
    setBusinessFilter(employeeTaskAllFilterValue);
  };

  const handleCreate = async () => {
    if (!canCreate || busy || createRequestInFlightRef.current) return;
    const title = createDraft.title.trim();
    if (!title) {
      setCreateError(copy.errors.createTitleRequired);
      return;
    }
    createRequestInFlightRef.current = true;
    setBusy('create');
    setCreateError('');
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const result = await onAction<TaskActionResponse>(employeeTaskCapabilities.create, {
        title,
        description: createDraft.description.trim() || null,
        priority: createDraft.priority,
        due_date: createDraft.dueDate || null,
      });
      const receivedUpdatedItems = Array.isArray(result.items);
      if (receivedUpdatedItems) setTasks(result.items);
      setSuccessMessage(copy.success.created(result.task?.title || title));
      resetAgenda();
      setCreateOpen(false);
      setCreateDraft(emptyCreateDraft());
      if (!receivedUpdatedItems) {
        try {
          await onRefresh();
        } catch (refreshError) {
          if (!onAuthorizationFailure(refreshError)) setErrorMessage(copy.errors.refreshFailure);
        }
      }
    } catch (error) {
      if (!onAuthorizationFailure(error)) setCreateError(copy.errors.createFailure);
    } finally {
      createRequestInFlightRef.current = false;
      setBusy(null);
    }
  };

  const handleComplete = async () => {
    if (!selectedTask || !canComplete || busy || completeRequestInFlightRef.current) return;
    completeRequestInFlightRef.current = true;
    setBusy('complete');
    setDialogError('');
    setSuccessMessage('');
    try {
      const contributionFlow = selectedTask.completion_action === 'CONTRIBUTION_READY';
      const result = await onAction<TaskActionResponse>(employeeTaskCapabilities.complete, {
        completion_notes: completionNotes.trim(),
        ...(contributionFlow ? {} : { completion_percent: completionPercent }),
        resource_id: selectedTask.id,
      });
      const receivedUpdatedItems = Array.isArray(result.items);
      if (receivedUpdatedItems) setTasks(result.items);
      const contributionReady = result.action_outcome === 'CONTRIBUTION_READY'
        || (result.action_outcome === undefined && contributionFlow);
      setSuccessMessage(contributionReady
        ? copy.success.contributionReady(selectedTask.title)
        : copy.success.completed(selectedTask.title));
      if (!contributionReady && result.task?.status === 'completed') {
        setStatusFilterState('completed');
        setViewMode('agenda');
      }
      setSelectedTaskId(null);
      if (!receivedUpdatedItems) {
        try {
          await onRefresh();
        } catch (refreshError) {
          if (!onAuthorizationFailure(refreshError)) setErrorMessage(copy.errors.refreshFailure);
        }
      }
    } catch (error) {
      if (!onAuthorizationFailure(error)) setDialogError(copy.errors.completeFailure);
    } finally {
      completeRequestInFlightRef.current = false;
      setBusy(null);
    }
  };

  const setStatusFilter = (value: EmployeeTaskStatusFilter) => {
    setStatusFilterState(value);
    if (value === 'completed') setViewMode('agenda');
  };
  const showToday = () => { setSelectedDate(localEmployeeTaskDate()); setDateRange('day'); };
  const showTomorrow = () => { setSelectedDate(shiftDate(localEmployeeTaskDate(), 1)); setDateRange('day'); };
  const showWeek = () => { setSelectedDate(localEmployeeTaskDate()); setDateRange('week'); };
  const moveDate = (direction: -1 | 1) => {
    if (dateRange === 'all') return;
    const amount = dateRange === 'week' ? 7 * direction : direction;
    setSelectedDate(current => shiftDate(current, amount, dateRange === 'month' ? 'month' : 'day'));
  };
  const clearFilters = () => {
    setDateRange('day');
    setSelectedDate(localEmployeeTaskDate());
    setStatusFilterState('pending_overdue');
    setOriginFilter(employeeTaskAllFilterValue);
    setUnitFilter(employeeTaskAllFilterValue);
    setBusinessFilter(employeeTaskAllFilterValue);
  };
  const changeUnitFilter = (value: string) => {
    setUnitFilter(value);
    setBusinessFilter(employeeTaskAllFilterValue);
  };

  return {
    activeFilterCount, businessFilter, businessOptions, busy, changeUnitFilter, clearFilters,
    completionNotes, completionPercent, createDraft, createError, createOpen, dateRange, dialogError,
    errorMessage, filtersOpen, focusCounts, focusFilter, handleComplete, handleCloseCreate, handleCreate,
    handleOpenCreate, handleOpenTask, handleRefresh, moveDate, openTasks, originFilter, originOptions,
    overdueTasks, resolvedTasks, searchQuery, selectedDate, selectedTask, setBusinessFilter,
    setCompletionNotes, setCompletionPercent, setDateRange, setFiltersOpen, setFocusFilter,
    setOriginFilter, setSearchQuery, setSelectedTaskId, setStatusFilter, setViewMode, showToday,
    setSelectedDate, showTomorrow, showWeek, statusFilter, successMessage, tasks, unitFilter, unitOptions,
    updateCreateDraft, viewMode, visibleTasks,
  };
}
