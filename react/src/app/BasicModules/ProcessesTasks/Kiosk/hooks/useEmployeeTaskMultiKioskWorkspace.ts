import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PeriodFilter } from '../../Agenda/types';
import type {
  PublicTaskKioskCompleteResponse,
  PublicTaskKioskTask,
} from '../processTaskKioskApi';
import { matchesKioskPeriod } from '../taskKioskFilterEngine';
import type { TaskKioskTranslations } from '../translations';

export const employeeTaskCapabilities = {
  read: 'process-tasks.tasks.read@1',
  create: 'process-tasks.task.create@1',
  complete: 'process-tasks.task.complete@1',
} as const;

export const employeeTaskAllFilterValue = 'all';
const emptyFilterValue = 'empty';

export type EmployeeTaskMultiKioskAction = <T = unknown>(
  capability: string,
  payload: Record<string, unknown>,
) => Promise<T>;
export type EmployeeTaskTab = 'open' | 'resolved';
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

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function emptyCreateDraft(): EmployeeTaskCreateDraft {
  return {
    description: '',
    dueDate: localToday(),
    priority: 'medium',
    title: '',
  };
}

function sortTasks(tasks: PublicTaskKioskTask[], resolved: boolean) {
  return [...tasks].sort((left, right) => {
    if (resolved) {
      return (right.completed_at ?? right.created_at ?? '').localeCompare(
        left.completed_at ?? left.created_at ?? '',
      );
    }
    if (left.is_overdue !== right.is_overdue) return left.is_overdue ? -1 : 1;
    return (left.due_date ?? '9999-12-31').localeCompare(right.due_date ?? '9999-12-31');
  });
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
  const [activeTab, setActiveTab] = useState<EmployeeTaskTab>('open');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
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

  useEffect(() => {
    setTasks(bootstrapTasks);
  }, [bootstrapTasks]);

  useEffect(() => {
    setActiveTab('open');
    setPeriodFilter('all');
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
    tasks.forEach((task) => options.set(
      String(task.unit_id ?? emptyFilterValue),
      task.unit_name || copy.filters.unassignedUnit,
    ));
    return [...options.entries()].map(([value, label]) => ({ label, value }));
  }, [copy.filters.unassignedUnit, tasks]);

  const businessOptions = useMemo(() => {
    const options = new Map<string, string>();
    tasks
      .filter(task => unitFilter === employeeTaskAllFilterValue
        || String(task.unit_id ?? emptyFilterValue) === unitFilter)
      .forEach((task) => options.set(
        String(task.business_id ?? emptyFilterValue),
        task.business_name || copy.filters.unassignedBusiness,
      ));
    return [...options.entries()].map(([value, label]) => ({ label, value }));
  }, [copy.filters.unassignedBusiness, tasks, unitFilter]);

  const scopedTasks = useMemo(() => tasks.filter(task => (
    matchesKioskPeriod(task, periodFilter)
    && (unitFilter === employeeTaskAllFilterValue
      || String(task.unit_id ?? emptyFilterValue) === unitFilter)
    && (businessFilter === employeeTaskAllFilterValue
      || String(task.business_id ?? emptyFilterValue) === businessFilter)
  )), [businessFilter, periodFilter, tasks, unitFilter]);
  const openTasks = useMemo(
    () => sortTasks(scopedTasks.filter(task => task.status !== 'completed'), false),
    [scopedTasks],
  );
  const resolvedTasks = useMemo(
    () => sortTasks(scopedTasks.filter(task => task.status === 'completed'), true),
    [scopedTasks],
  );
  const visibleTasks = activeTab === 'open' ? openTasks : resolvedTasks;
  const selectedTask = tasks.find(task => task.id === selectedTaskId) ?? null;
  const activeFilterCount = Number(periodFilter !== 'all')
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

  const updateCreateDraft = <Field extends keyof EmployeeTaskCreateDraft>(
    field: Field,
    value: EmployeeTaskCreateDraft[Field],
  ) => {
    setCreateDraft(current => ({ ...current, [field]: value }));
    setCreateError('');
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
      setActiveTab('open');
      setPeriodFilter('all');
      setUnitFilter(employeeTaskAllFilterValue);
      setBusinessFilter(employeeTaskAllFilterValue);
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
      setActiveTab(result.task?.status === 'completed' ? 'resolved' : 'open');
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

  const clearFilters = () => {
    setPeriodFilter('all');
    setUnitFilter(employeeTaskAllFilterValue);
    setBusinessFilter(employeeTaskAllFilterValue);
  };

  const changeUnitFilter = (value: string) => {
    setUnitFilter(value);
    setBusinessFilter(employeeTaskAllFilterValue);
  };

  return {
    activeFilterCount,
    activeTab,
    businessFilter,
    businessOptions,
    busy,
    changeUnitFilter,
    clearFilters,
    completionNotes,
    completionPercent,
    createDraft,
    createError,
    createOpen,
    dialogError,
    errorMessage,
    filtersOpen,
    handleComplete,
    handleCloseCreate,
    handleCreate,
    handleOpenCreate,
    handleOpenTask,
    handleRefresh,
    openTasks,
    periodFilter,
    resolvedTasks,
    selectedTask,
    setActiveTab,
    setBusinessFilter,
    setCompletionNotes,
    setCompletionPercent,
    setFiltersOpen,
    setSelectedTaskId,
    setPeriodFilter,
    successMessage,
    tasks,
    unitFilter,
    unitOptions,
    updateCreateDraft,
    visibleTasks,
  };
}
