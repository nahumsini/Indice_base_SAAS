import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  CheckCircle2,
  ListChecks,
} from 'lucide-react';
import { useParams } from 'react-router';
import { LoadingBarOverlay } from '../../../components/LoadingBarOverlay';
import { KioskIdentityGate } from '../../../components/kiosk-engine/KioskIdentityGate';
import { KioskPublicShell } from '../../../components/kiosk-engine/KioskPublicShell';
import { KioskWorkspaceTabs } from '../../../components/kiosk-engine/KioskWorkspacePrimitives';
import { Button } from '../../../components/ui/button';
import {
  processTaskKioskApi,
  uploadPublicTaskAttachment,
  type PublicTaskKioskBootstrapResponse,
  type PublicTaskKioskAssignmentOption,
  type PublicTaskKioskCreateTaskPayload,
  type PublicTaskKioskTask,
  type PublicTaskKioskIdentifyResponse,
} from './processTaskKioskApi';
import { PublicTaskKioskDialogs } from './components/PublicTaskKioskDialogs';
import {
  PublicTaskKioskEmptyState,
  PublicTaskKioskFiltersSheet,
  PublicTaskKioskHeader,
  PublicTaskKioskIdentityCard,
  PublicTaskKioskSessionBanners,
  PublicTaskKioskSummaryStrip,
  PublicTaskKioskTaskCard,
  PublicTaskKioskToolbar,
  TaskKioskFilterField,
  TaskKioskFilterSelect,
} from './components/PublicTaskKioskWorkspaceSections';
import { useTaskKioskLocaleControls, useTaskKioskTranslations } from './hooks/useTaskKioskTranslations';
import type { TaskKioskLocale, TaskKioskTranslations } from './translations';
import type { AgendaFocusFilter, PeriodFilter } from '../Agenda/types';
import { filterKioskTasks } from './taskKioskFilterEngine';
import {
  normalizedTaskKioskEvidenceContentType,
  runTaskCompletionWithBestEffortEvidence,
  taskKioskAcceptedEvidenceTypes,
  taskKioskFilesFromInput,
  taskKioskMaxEvidenceFiles,
  taskKioskMaxEvidenceSizeBytes,
} from './publicTaskKioskEvidence';
import {
  completeKioskIdempotentOperation,
  executeKioskMutationWithMismatchRecovery,
  kioskIdempotencyKeyFor,
} from './kioskIdempotency';
import { useKioskSessionBoundary } from './hooks/useKioskSessionBoundary';

const allFilterValue = 'all';
const emptyFilterValue = 'empty';
const openTaskStatuses = new Set<PublicTaskKioskTask['status']>(['pending', 'in_progress', 'paused']);
const responsibleRequestTimeoutMs = 15000;

class RequestTimeoutError extends Error {
  constructor() {
    super('Request timed out');
    this.name = 'RequestTimeoutError';
  }
}

function publicTaskKioskErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (/credential validation failed|invalid (?:employee )?pin|pin (?:is )?invalid/i.test(message)) {
    return fallback;
  }
  if (!message || /internal server error|status\s*500|unexpected server error/i.test(message)) {
    return fallback;
  }
  return message;
}

type TaskKioskTab = 'open' | 'resolved';

type TaskCreateFormState = {
  title: string;
  description: string;
  priority: PublicTaskKioskCreateTaskPayload['priority'];
  unitId: string;
  businessId: string;
  assignedUserCompanyId: string;
  dueDate: string;
};

type KioskCollaboratorOption = PublicTaskKioskAssignmentOption['collaborators'][number];

const defaultCreateForm: TaskCreateFormState = {
  title: '',
  description: '',
  priority: 'medium',
  unitId: '',
  businessId: '',
  assignedUserCompanyId: '',
  dueDate: '',
};

function todayDateInputValue() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function defaultCreateFormForSession(): TaskCreateFormState {
  return {
    ...defaultCreateForm,
    dueDate: todayDateInputValue(),
  };
}

function numericFormValue(value: string) {
  if (!value || value === allFilterValue || value === emptyFilterValue) {
    return null;
  }
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function withRequestTimeout<T>(request: Promise<T>, timeoutMs: number, onTimeout: () => void) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      onTimeout();
      reject(new RequestTimeoutError());
    }, timeoutMs);

    request
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeoutId));
  });
}

function normalizeScopeName(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function isCorporateScopeName(value?: string | null) {
  const normalizedValue = normalizeScopeName(value);
  return [
    'corporate office',
    'corporate',
    'head office',
    'holding',
    'oficina central',
    'oficina corporativa',
    'corporativo',
    'sede principal',
  ].includes(normalizedValue);
}

function isHeadquarterBusinessName(value?: string | null) {
  const normalizedValue = normalizeScopeName(value);
  return (
    ['headquarter', 'headquarters', 'headquater', 'hq'].includes(normalizedValue) ||
    normalizedValue.endsWith(' headquarter') ||
    normalizedValue.endsWith(' headquarters') ||
    normalizedValue.endsWith(' headquater') ||
    normalizedValue.endsWith(' hq') ||
    normalizedValue.startsWith('sede ') ||
    normalizedValue.includes(' sede') ||
    normalizedValue.startsWith('matriz ') ||
    normalizedValue.includes(' matriz')
  );
}

function isCorporateCollaborator(collaborator: KioskCollaboratorOption) {
  return (
    (collaborator.unit_id == null && collaborator.business_id == null) ||
    isCorporateScopeName(collaborator.unit_name) ||
    isCorporateScopeName(collaborator.business_name)
  );
}

function isUnitLevelCollaborator(collaborator: KioskCollaboratorOption, unitId: number | null) {
  return (
    unitId != null &&
    collaborator.unit_id === unitId &&
    (collaborator.business_id == null || isHeadquarterBusinessName(collaborator.business_name))
  );
}

function collaboratorOptionsForScope(
  assignmentOptions: PublicTaskKioskAssignmentOption | null,
  unitId: number | null,
  businessId: number | null,
) {
  if (!assignmentOptions) {
    return [];
  }

  const selectedBusiness = assignmentOptions.businesses.find((business) => business.id === businessId);
  const effectiveUnitId = unitId ?? selectedBusiness?.unit_id ?? null;

  return assignmentOptions.collaborators.filter((collaborator) => {
    if (isCorporateCollaborator(collaborator)) {
      return true;
    }
    if (businessId != null) {
      return (
        collaborator.business_id === businessId ||
        isUnitLevelCollaborator(collaborator, effectiveUnitId)
      );
    }
    return isUnitLevelCollaborator(collaborator, effectiveUnitId);
  });
}

function formatDate(value: string | null, locale: TaskKioskLocale, emptyLabel: string) {
  if (!value) {
    return emptyLabel;
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateTime(value: string | null, locale: TaskKioskLocale, emptyLabel: string) {
  if (!value) {
    return emptyLabel;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

function filterLabels(locale: TaskKioskLocale) {
  const isSpanish = locale.startsWith('es');
  return {
    focus: isSpanish ? 'Enfoque' : 'Focus',
    period: isSpanish ? 'Periodo' : 'Period',
    mine: isSpanish ? 'Mis tareas' : 'My tasks',
    delegated: isSpanish ? 'Delegadas por mi' : 'Delegated by me',
    team: isSpanish ? 'Equipo visible' : 'Visible team',
    allPeriod: isSpanish ? 'Todo' : 'All',
    today: isSpanish ? 'Hoy' : 'Today',
    tomorrow: isSpanish ? 'Mañana' : 'Tomorrow',
    yesterday: isSpanish ? 'Ayer' : 'Yesterday',
    week: isSpanish ? 'Semana' : 'Week',
    month: isSpanish ? 'Mes' : 'Month',
    evidenceHint: isSpanish ? 'Foto o archivo, maximo 5 evidencias.' : 'Photo or file, up to 5 evidence files.',
    view: isSpanish ? 'Ver detalle' : 'View details',
    attachments: isSpanish ? 'evidencias' : 'evidence',
    createdEvidenceTitle: isSpanish ? 'Evidencia inicial' : 'Initial evidence',
    createdEvidenceBody: isSpanish
      ? 'Adjunta fotos, PDF o archivos para que la tarea nazca con contexto.'
      : 'Attach photos, PDFs, or files so the task starts with context.',
    filters: isSpanish ? 'Filtros' : 'Filters',
    filtersDescription: isSpanish
      ? 'Ajusta qué tareas quieres consultar. Los cambios se aplican al instante.'
      : 'Choose which tasks you want to review. Changes apply immediately.',
    applyFilters: isSpanish ? 'Ver tareas' : 'View tasks',
    clearFilters: isSpanish ? 'Restablecer' : 'Reset',
    takePhoto: isSpanish ? 'Tomar foto' : 'Take photo',
    chooseFile: isSpanish ? 'Elegir archivo' : 'Choose file',
    taskDetails: isSpanish ? 'Información de la tarea' : 'Task information',
    close: isSpanish ? 'Cerrar' : 'Close',
  };
}

function taskTypeLabel(taskType: PublicTaskKioskTask['task_type'] | undefined, copy: TaskKioskTranslations) {
  return {
    task: copy.task.task,
    'project-task': copy.task.projectTask,
    process: copy.task.process,
  }[taskType ?? 'task'];
}

export default function PublicTaskKioskPage() {
  const { deviceToken } = useParams();
  const copy = useTaskKioskTranslations();
  const { selectedLocale } = useTaskKioskLocaleControls();
  const [bootstrap, setBootstrap] = useState<PublicTaskKioskBootstrapResponse | null>(null);
  const [identity, setIdentity] = useState<PublicTaskKioskIdentifyResponse | null>(null);
  const [pin, setPin] = useState('');
  const [tasks, setTasks] = useState<PublicTaskKioskTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [activeTaskTab, setActiveTaskTab] = useState<TaskKioskTab>('open');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [createTaskForm, setCreateTaskForm] = useState<TaskCreateFormState>(defaultCreateForm);
  const [createEvidenceFiles, setCreateEvidenceFiles] = useState<File[]>([]);
  const [responsibleTaskId, setResponsibleTaskId] = useState<number | null>(null);
  const [responsibleUserCompanyId, setResponsibleUserCompanyId] = useState('');
  const [responsibleError, setResponsibleError] = useState<string | null>(null);
  const [isAssigningResponsible, setIsAssigningResponsible] = useState(false);
  const [focusFilter, setFocusFilter] = useState<AgendaFocusFilter>('mine');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('today');
  const [unitFilter, setUnitFilter] = useState(allFilterValue);
  const [businessFilter, setBusinessFilter] = useState(allFilterValue);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionPercent, setCompletionPercent] = useState('100');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [didSessionExpire, setDidSessionExpire] = useState(false);

  const resetKioskSession = useCallback(() => {
    setIdentity(null);
    setTasks([]);
    setPin('');
    setSelectedTaskId(null);
    setResponsibleTaskId(null);
    setIsTaskModalOpen(false);
    setIsCreateTaskModalOpen(false);
    setIsFiltersOpen(false);
    setCompletionNotes('');
    setCompletionPercent('100');
    setEvidenceFiles([]);
    setCreateEvidenceFiles([]);
    setResponsibleError(null);
    setSuccessMessage(null);
    setDidSessionExpire(false);
  }, []);

  const expireKioskSession = useCallback(() => {
    resetKioskSession();
    setDidSessionExpire(true);
  }, [resetKioskSession]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!deviceToken) {
        setError(copy.errors.missingLink);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await processTaskKioskApi.getPublicBootstrap(deviceToken);
        if (isMounted) {
          setBootstrap(response);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(publicTaskKioskErrorMessage(loadError, copy.errors.loadFailure));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [copy.errors.loadFailure, copy.errors.missingLink, deviceToken]);

  const { isOnline, isSessionExpiring } = useKioskSessionBoundary({
    active: Boolean(identity),
    expiresAt: identity?.expires_at,
    inactivityTimeoutSeconds: bootstrap?.inactivity_timeout_seconds ?? 1800,
    onExpire: expireKioskSession,
  });

  const refreshKioskTasks = useCallback(async () => {
    if (!deviceToken || !identity?.identification_token || !isOnline) return;
    try {
      const response = await processTaskKioskApi.listPublicTasks(
        deviceToken,
        identity.identification_token,
      );
      setTasks(response.items);
    } catch {
      // Keep the last usable list on transient refresh failures. Explicit actions
      // still surface their errors and the session boundary handles expiration.
    }
  }, [deviceToken, identity?.identification_token, isOnline]);

  useEffect(() => {
    if (!identity) return undefined;
    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'hidden') void refreshKioskTasks();
    };
    const intervalId = window.setInterval(refreshWhenVisible, 20_000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [identity, refreshKioskTasks]);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );
  const responsibleTask = useMemo(
    () => tasks.find((task) => task.id === responsibleTaskId) ?? null,
    [responsibleTaskId, tasks],
  );

  const assignmentOptions = identity?.assignment_options ?? null;

  const unitOptions = useMemo(() => {
    const optionMap = new Map<string, string>();
    assignmentOptions?.units.forEach((unit) => {
      optionMap.set(String(unit.id), unit.name);
    });
    tasks.forEach((task) => {
      const value = task.unit_id === null ? emptyFilterValue : String(task.unit_id);
      if (!optionMap.has(value)) {
        optionMap.set(value, task.unit_name || copy.filters.unassignedUnit);
      }
    });
    return Array.from(optionMap.entries()).map(([value, label]) => ({ value, label }));
  }, [assignmentOptions, copy.filters.unassignedUnit, tasks]);

  const businessOptions = useMemo(() => {
    const optionMap = new Map<string, string>();
    assignmentOptions?.businesses
      .filter((business) => unitFilter === allFilterValue || String(business.unit_id ?? emptyFilterValue) === unitFilter)
      .forEach((business) => {
        optionMap.set(String(business.id), business.name);
      });
    tasks
      .filter((task) => unitFilter === allFilterValue || String(task.unit_id ?? emptyFilterValue) === unitFilter)
      .forEach((task) => {
        const value = task.business_id === null ? emptyFilterValue : String(task.business_id);
        if (!optionMap.has(value)) {
          optionMap.set(value, task.business_name || copy.filters.unassignedBusiness);
        }
      });
    return Array.from(optionMap.entries()).map(([value, label]) => ({ value, label }));
  }, [assignmentOptions, copy.filters.unassignedBusiness, tasks, unitFilter]);

  const createBusinessOptions = useMemo(() => {
    if (!assignmentOptions) {
      return [];
    }
    const selectedUnitId = numericFormValue(createTaskForm.unitId);
    return assignmentOptions.businesses.filter(
      (business) => selectedUnitId == null || business.unit_id === selectedUnitId,
    );
  }, [assignmentOptions, createTaskForm.unitId]);

  const createCollaboratorOptions = useMemo(() => {
    const selectedUnitId = numericFormValue(createTaskForm.unitId);
    const selectedBusinessId = numericFormValue(createTaskForm.businessId);
    return collaboratorOptionsForScope(assignmentOptions, selectedUnitId, selectedBusinessId);
  }, [assignmentOptions, createTaskForm.businessId, createTaskForm.unitId]);

  const responsibleCollaboratorOptions = useMemo(
    () =>
      collaboratorOptionsForScope(
        assignmentOptions,
        responsibleTask?.unit_id ?? null,
        responsibleTask?.business_id ?? null,
      ),
    [assignmentOptions, responsibleTask?.business_id, responsibleTask?.unit_id],
  );

  const baseTaskFilters = useMemo(
    () => ({
      focus: focusFilter,
      period: periodFilter,
      unit: unitFilter,
      business: businessFilter,
    }),
    [businessFilter, focusFilter, periodFilter, unitFilter],
  );

  const openTasks = useMemo(
    () => filterKioskTasks(tasks, { ...baseTaskFilters, status: 'pending_overdue' }),
    [baseTaskFilters, tasks],
  );
  const resolvedTasks = useMemo(
    () => filterKioskTasks(tasks, { ...baseTaskFilters, status: 'completed' }),
    [baseTaskFilters, tasks],
  );
  const visibleTasks = activeTaskTab === 'open' ? openTasks : resolvedTasks;
  const overdueTasksCount = openTasks.filter((task) => task.is_overdue).length;
  const pointLabel = bootstrap?.kiosk.name ?? copy.header.defaultPoint;
  const scopeLabel = bootstrap?.scope_label ?? copy.header.defaultScope;
  const currentTimeLabel = new Date().toLocaleTimeString(selectedLocale, { hour: '2-digit', minute: '2-digit' });
  const labels = useMemo(() => filterLabels(selectedLocale), [selectedLocale]);
  const focusFilterLabel = focusFilter === 'mine'
    ? labels.mine
    : focusFilter === 'delegated'
      ? labels.delegated
      : labels.team;
  const periodFilterLabel = {
    all: labels.allPeriod,
    today: labels.today,
    tomorrow: labels.tomorrow,
    yesterday: labels.yesterday,
    week: labels.week,
    month: labels.month,
    custom: labels.allPeriod,
  }[periodFilter];
  const scopedFilterCount = Number(unitFilter !== allFilterValue) + Number(businessFilter !== allFilterValue);
  const activeFilterCount = Number(focusFilter !== 'mine')
    + Number(periodFilter !== 'today')
    + scopedFilterCount;
  const filterSummary = `${focusFilterLabel} · ${periodFilterLabel}${scopedFilterCount > 0 ? ` · +${scopedFilterCount}` : ''}`;

  useEffect(() => {
    if (!selectedTask) {
      setCompletionPercent('100');
      setEvidenceFiles([]);
      return;
    }

    setCompletionPercent(String(selectedTask.completion_percent > 0 ? selectedTask.completion_percent : 100));
    setEvidenceFiles([]);
  }, [selectedTask?.id]);

  useEffect(() => {
    if (!identity) {
      setCreateTaskForm(defaultCreateFormForSession());
      return;
    }

    setCreateTaskForm({
      ...defaultCreateFormForSession(),
      unitId: identity.assignment_options?.default_unit_id?.toString() ?? '',
      businessId: identity.assignment_options?.default_business_id?.toString() ?? '',
      assignedUserCompanyId: identity.user.id.toString(),
    });
    setActiveTaskTab('open');
  }, [identity?.identification_token]);

  const handleIdentify = async () => {
    if (!isOnline) {
      setError(copy.session.offline);
      return;
    }
    if (!deviceToken || pin.length !== 5) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await processTaskKioskApi.identifyPublicUser(deviceToken, pin);
      setIdentity(response);
      setTasks(response.tasks);
      setSelectedTaskId(null);
      setFocusFilter('mine');
      setPeriodFilter('today');
      setUnitFilter(allFilterValue);
      setBusinessFilter(allFilterValue);
      setActiveTaskTab('open');
      setPin('');
      setDidSessionExpire(false);
    } catch (identifyError) {
      setError(publicTaskKioskErrorMessage(identifyError, copy.errors.identifyFailure));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!isOnline) {
      setError(copy.session.offline);
      return;
    }
    if (!deviceToken || !identity?.identification_token || !selectedTask) {
      return;
    }
    const parsedCompletion = Number(completionPercent || 100);
    if (!Number.isInteger(parsedCompletion) || parsedCompletion < 0 || parsedCompletion > 100) {
      setError(copy.errors.progressInvalid);
      return;
    }
    setIsSubmitting(true);
    setIsUploadingEvidence(evidenceFiles.length > 0);
    setError(null);
    setSuccessMessage(null);
    try {
      const completionPayload = {
        identification_token: identity.identification_token,
        completion_notes: completionNotes,
        completion_percent: parsedCompletion,
      };
      const operation = `process-tasks:complete:${selectedTask.id}`;
      const completionResult = await runTaskCompletionWithBestEffortEvidence({
        uploadEvidence: () => uploadTaskEvidence(selectedTask.id, evidenceFiles),
        completeTask: () => executeKioskMutationWithMismatchRecovery({
          operation,
          payload: completionPayload,
          request: (idempotencyKey) => processTaskKioskApi.completePublicTask(
            deviceToken,
            selectedTask.id,
            completionPayload,
            idempotencyKey,
          ),
        }),
      });
      const { response } = completionResult;
      const evidenceWarning = completionResult.evidenceFailure === 'TASK_EVIDENCE_PARTIAL_FAILURE'
        ? copy.errors.completionPartialUploadFailure
        : completionResult.evidenceFailure === 'TASK_EVIDENCE_UPLOAD_FAILED'
          ? copy.errors.completionUploadFailure
          : null;
      completeKioskIdempotentOperation(operation);
      setTasks(response.items);
      setSelectedTaskId(null);
      setIsTaskModalOpen(false);
      setCompletionNotes('');
      setCompletionPercent('100');
      setEvidenceFiles([]);
      setSuccessMessage(copy.success.completed(selectedTask.title));
      setError(evidenceWarning);
    } catch (completeError) {
      setError(publicTaskKioskErrorMessage(completeError, copy.errors.completeFailure));
    } finally {
      setIsUploadingEvidence(false);
      setIsSubmitting(false);
    }
  };

  const handleCreateTask = async () => {
    if (!isOnline) {
      setError(copy.session.offline);
      return;
    }
    if (!deviceToken || !identity?.identification_token) {
      return;
    }
    const title = createTaskForm.title.trim();
    if (!title) {
      setError(copy.errors.createTitleRequired);
      return;
    }

    setIsSubmitting(true);
    setIsUploadingEvidence(createEvidenceFiles.length > 0);
    setError(null);
    setSuccessMessage(null);
    try {
      const createPayload: PublicTaskKioskCreateTaskPayload = {
        identification_token: identity.identification_token,
        title,
        description: createTaskForm.description.trim() || null,
        priority: createTaskForm.priority,
        startDate: null,
        dueDate: createTaskForm.dueDate || todayDateInputValue(),
        unitId: numericFormValue(createTaskForm.unitId),
        businessId: numericFormValue(createTaskForm.businessId),
        assignedUserCompanyId: numericFormValue(createTaskForm.assignedUserCompanyId) ?? identity.user.id,
        assignedName:
          createCollaboratorOptions.find(
            (collaborator) => String(collaborator.user_company_id) === createTaskForm.assignedUserCompanyId,
          )?.full_name ?? identity.user.full_name,
      };
      const operation = 'process-tasks:create';
      const response = await executeKioskMutationWithMismatchRecovery({
        operation,
        payload: createPayload,
        request: (idempotencyKey) => processTaskKioskApi.createPublicTask(
          deviceToken,
          createPayload,
          idempotencyKey,
        ),
      });
      completeKioskIdempotentOperation(operation);
      setTasks(response.items);

      let evidenceWarning: string | null = null;
      if (createEvidenceFiles.length > 0) {
        try {
          await uploadTaskEvidence(response.task.id, createEvidenceFiles);
          const refreshedTasks = await processTaskKioskApi.listPublicTasks(
            deviceToken,
            identity.identification_token,
          );
          setTasks(refreshedTasks.items);
        } catch (uploadError) {
          evidenceWarning = uploadError instanceof Error && uploadError.message === 'TASK_EVIDENCE_PARTIAL_FAILURE'
            ? copy.errors.partialUploadFailure
            : uploadError instanceof Error && uploadError.message === 'TASK_EVIDENCE_UPLOAD_FAILED'
              ? copy.errors.uploadFailure
              : publicTaskKioskErrorMessage(uploadError, copy.errors.uploadFailure);
        }
      }

      setIsCreateTaskModalOpen(false);
      setActiveTaskTab('open');
      setCreateTaskForm({
        ...defaultCreateFormForSession(),
        unitId: assignmentOptions?.default_unit_id?.toString() ?? '',
        businessId: assignmentOptions?.default_business_id?.toString() ?? '',
        assignedUserCompanyId: identity.user.id.toString(),
      });
      setCreateEvidenceFiles([]);
      setSuccessMessage(copy.success.created(title));
      setError(evidenceWarning);
    } catch (createError) {
      setError(publicTaskKioskErrorMessage(createError, copy.errors.createFailure));
    } finally {
      setIsUploadingEvidence(false);
      setIsSubmitting(false);
    }
  };

  const handleAssignResponsible = async () => {
    if (!isOnline) {
      setResponsibleError(copy.session.offline);
      setError(copy.session.offline);
      return;
    }
    if (!deviceToken || !identity?.identification_token || !responsibleTask) {
      return;
    }
    const assignedUserCompanyId = numericFormValue(responsibleUserCompanyId);
    if (!assignedUserCompanyId) {
      setResponsibleError(copy.errors.responsibleRequired);
      return;
    }

    const selectedCollaborator = responsibleCollaboratorOptions.find(
      (collaborator) => collaborator.user_company_id === assignedUserCompanyId,
    );

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), responsibleRequestTimeoutMs);

    setIsAssigningResponsible(true);
    setResponsibleError(null);
    setError(null);
    setSuccessMessage(null);
    try {
      const responsiblePayload = {
        identification_token: identity.identification_token,
        assignedUserCompanyId,
        assignedName: selectedCollaborator?.full_name ?? null,
      };
      const operation = `process-tasks:responsible:${responsibleTask.id}`;
      const response = await withRequestTimeout(
        processTaskKioskApi.assignPublicTaskResponsible(
          deviceToken,
          responsibleTask.id,
          responsiblePayload,
          kioskIdempotencyKeyFor(operation, responsiblePayload),
          { signal: controller.signal },
        ),
        responsibleRequestTimeoutMs,
        () => controller.abort(),
      );
      completeKioskIdempotentOperation(operation);
      setTasks(response.items);
      setResponsibleTaskId(null);
      setResponsibleUserCompanyId('');
      setSuccessMessage(copy.success.responsibleUpdated(responsibleTask.title));
    } catch (assignError) {
      const message = assignError instanceof Error && ['AbortError', 'RequestTimeoutError'].includes(assignError.name)
        ? copy.errors.responsibleTimeout
        : publicTaskKioskErrorMessage(assignError, copy.errors.responsibleFailure);
      setResponsibleError(message);
      setError(message);
    } finally {
      window.clearTimeout(timeoutId);
      setIsAssigningResponsible(false);
    }
  };

  const uploadTaskEvidence = async (taskId: number, files: File[]) => {
    if (!deviceToken || !identity?.identification_token || files.length === 0) {
      return;
    }
    let uploadedFiles = 0;
    for (const file of files.slice(0, taskKioskMaxEvidenceFiles)) {
      if (file.size > taskKioskMaxEvidenceSizeBytes) {
        throw new Error(copy.errors.fileTooLarge(file.name));
      }
      const contentType = normalizedTaskKioskEvidenceContentType(file);
      if (!contentType || !taskKioskAcceptedEvidenceTypes.has(contentType)) {
        throw new Error(copy.errors.unsupportedEvidence(file.name));
      }
      try {
      const presigned = await processTaskKioskApi.presignPublicTaskAttachmentUpload(deviceToken, taskId, {
        identification_token: identity.identification_token,
        file_name: file.name,
        content_type: contentType,
        size_bytes: file.size,
      });
      await uploadPublicTaskAttachment(
        presigned.upload_url,
        file,
        contentType,
        presigned.upload_headers ?? {},
      );
      const registerPayload = {
        identification_token: identity.identification_token,
        object_key: presigned.object_key,
        original_filename: file.name,
        mime_type: contentType,
        size_bytes: file.size,
        logical_file_id: `${file.name}:${file.size}:${file.lastModified}`,
      };
      const operation = `process-tasks:attachment:${taskId}:${file.name}:${file.size}:${file.lastModified}`;
      await processTaskKioskApi.registerPublicTaskAttachment(
        deviceToken,
        taskId,
        registerPayload,
        kioskIdempotencyKeyFor(operation, registerPayload),
      );
      completeKioskIdempotentOperation(operation);
      uploadedFiles += 1;
      } catch (uploadError) {
        if (uploadedFiles > 0) {
          throw new Error('TASK_EVIDENCE_PARTIAL_FAILURE');
        }
        throw new Error('TASK_EVIDENCE_UPLOAD_FAILED');
      }
    }
  };

  const handleEvidenceFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEvidenceFiles(taskKioskFilesFromInput(event.target.files));
  };

  const handleCreateEvidenceFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCreateEvidenceFiles(taskKioskFilesFromInput(event.target.files));
  };

  const handleUnitFilterChange = (value: string) => {
    setUnitFilter(value);
    setBusinessFilter(allFilterValue);
  };

  const openTaskCompletionModal = (task: PublicTaskKioskTask) => {
    setSelectedTaskId(task.id);
    setCompletionNotes('');
    setCompletionPercent(String(task.completion_percent > 0 ? task.completion_percent : 100));
    setEvidenceFiles([]);
    setIsTaskModalOpen(true);
  };

  const openResponsibleModal = (task: PublicTaskKioskTask) => {
    const options = collaboratorOptionsForScope(assignmentOptions, task.unit_id, task.business_id);
    const currentAssignedId = task.assigned_user_company_id?.toString() ?? identity?.user.id.toString() ?? '';
    const nextResponsibleId = options.some((collaborator) => String(collaborator.user_company_id) === currentAssignedId)
      ? currentAssignedId
      : options[0]?.user_company_id.toString() ?? currentAssignedId;

    setResponsibleTaskId(task.id);
    setResponsibleUserCompanyId(nextResponsibleId);
    setResponsibleError(null);
    setIsAssigningResponsible(false);
  };

  const closeTaskCompletionModal = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    setIsTaskModalOpen(false);
    setCompletionNotes('');
    setEvidenceFiles([]);
  }, [isSubmitting]);

  const closeResponsibleModal = useCallback(() => {
    if (isAssigningResponsible) {
      return;
    }
    setResponsibleTaskId(null);
    setResponsibleUserCompanyId('');
    setResponsibleError(null);
  }, [isAssigningResponsible]);

  return (
    <>
      <KioskPublicShell
        loadingOverlay={<LoadingBarOverlay isVisible={isLoading} title={copy.loading.title} description={copy.loading.description} />}
        banners={<PublicTaskKioskSessionBanners
          copy={copy}
          isOnline={isOnline}
          isSessionExpiring={isSessionExpiring}
        />}
        header={<PublicTaskKioskHeader
          copy={copy}
          currentTimeLabel={currentTimeLabel}
          pointLabel={pointLabel}
          scopeLabel={scopeLabel}
        />}
        errorMessage={error}
        maxWidthClassName="max-w-[480px]"
        minimalContent={!identity}
        successMessage={successMessage}
        sessionExpiredMessage={didSessionExpire ? copy.session.expired : null}
      >
        {!identity ? (
              <KioskIdentityGate
                backspaceLabel={copy.pin.deleteKey}
                clearLabel={copy.pin.deleteKey}
                description={copy.pin.description}
                disabled={!isOnline || isLoading}
                isSubmitting={isSubmitting}
                onPinChange={(value) => {
                  setPin(value);
                  if (error) setError(null);
                }}
                onSubmit={() => void handleIdentify()}
                pinAriaLabel={copy.pin.placeholder}
                pinLength={5}
                pinValue={pin}
                privacyMessage={copy.pin.privacy}
                submitLabel={copy.pin.continue}
                title={copy.pin.title}
                tone="yellow"
              />
            ) : (
              <section className="space-y-3 pb-[env(safe-area-inset-bottom)]">
                <KioskWorkspaceTabs<TaskKioskTab>
                  activeBackgroundColor="#F4C84A"
                  activeTextClassName="text-[#5F4003]"
                  activeValue={activeTaskTab}
                  ariaLabel={copy.header.badge}
                  items={[
                    { badge: openTasks.length, icon: <ListChecks className="h-4 w-4" />, label: copy.tabs.open(openTasks.length).replace(/\s*\([^)]*\)\s*$/, ''), value: 'open' },
                    { badge: resolvedTasks.length, icon: <CheckCircle2 className="h-4 w-4" />, label: copy.tabs.resolved(resolvedTasks.length).replace(/\s*\([^)]*\)\s*$/, ''), value: 'resolved' },
                  ]}
                  onChange={setActiveTaskTab}
                  tone="yellow"
                />

                <PublicTaskKioskIdentityCard
                  verifiedLabel={copy.identity.eyebrow}
                  name={identity.user.full_name}
                  detail={identity.user.position_title || identity.user.department || identity.user.user_code || copy.identity.fallbackStatus}
                  initials={identity.user.full_name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || '??'}
                  scopeLabel={scopeLabel}
                  resetLabel={copy.identity.reset}
                  onReset={resetKioskSession}
                />

                <PublicTaskKioskSummaryStrip
                  openLabel={copy.sidebar.openTasks}
                  openValue={openTasks.length}
                  overdueLabel={copy.task.overdue}
                  overdueValue={overdueTasksCount}
                  resolvedLabel={copy.tabs.resolved(resolvedTasks.length).replace(/[()0-9]/g, '').trim()}
                  resolvedValue={resolvedTasks.length}
                />

                <PublicTaskKioskToolbar
                  activeFilterCount={activeFilterCount}
                  createLabel={copy.actions.createTask}
                  filterLabel={labels.filters}
                  filterSummary={filterSummary}
                  onCreate={() => {
                    setError(null);
                    setIsCreateTaskModalOpen(true);
                  }}
                  onOpenFilters={() => setIsFiltersOpen(true)}
                />

                {tasks.length === 0 ? (
                  <PublicTaskKioskEmptyState title={copy.empty.title} body={copy.empty.body} />
                ) : visibleTasks.length === 0 ? (
                  <div>
                    <PublicTaskKioskEmptyState
                      icon={<ListChecks className="h-7 w-7" />}
                      title={activeTaskTab === 'open' ? copy.empty.filteredTitle : copy.empty.resolvedTitle}
                      body={activeTaskTab === 'open' ? copy.empty.filteredBody : copy.empty.resolvedBody}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="mx-auto mt-3 flex h-11 rounded-xl border-[#F4C84A]/60 px-4 text-sm font-medium text-[#7A5204] hover:bg-[#F4C84A]/10"
                      onClick={() => {
                        setFocusFilter('mine');
                        setPeriodFilter('today');
                        setUnitFilter(allFilterValue);
                        setBusinessFilter(allFilterValue);
                      }}
                    >
                      {labels.clearFilters}
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {visibleTasks.map((task) => (
                      <PublicTaskKioskTaskCard
                        key={task.id}
                        attachmentsLabel={labels.attachments}
                        copy={copy}
                        dueLabel={copy.task.due}
                        formattedDueDate={formatDate(task.due_date, selectedLocale, copy.errors.noDate)}
                        onOpen={() => openTaskCompletionModal(task)}
                        task={task}
                        taskType={taskTypeLabel(task.task_type, copy)}
                        viewLabel={labels.view}
                      />
                    ))}
                  </div>
                )}
              </section>
        )}
      </KioskPublicShell>

      <PublicTaskKioskFiltersSheet
        applyLabel={labels.applyFilters}
        clearLabel={labels.clearFilters}
        description={labels.filtersDescription}
        isOpen={Boolean(identity) && isFiltersOpen}
        onClear={() => {
          setFocusFilter('mine');
          setPeriodFilter('today');
          setUnitFilter(allFilterValue);
          setBusinessFilter(allFilterValue);
        }}
        onClose={() => setIsFiltersOpen(false)}
        title={labels.filters}
      >
        <div className="grid gap-4">
          <TaskKioskFilterField label={labels.focus}>
            <TaskKioskFilterSelect value={focusFilter} onChange={(value) => setFocusFilter(value as AgendaFocusFilter)}>
              <option value="mine">{labels.mine}</option>
              <option value="delegated">{labels.delegated}</option>
              <option value="team">{labels.team}</option>
            </TaskKioskFilterSelect>
          </TaskKioskFilterField>
          <TaskKioskFilterField label={labels.period}>
            <TaskKioskFilterSelect value={periodFilter} onChange={(value) => setPeriodFilter(value as PeriodFilter)}>
              <option value="all">{labels.allPeriod}</option>
              <option value="today">{labels.today}</option>
              <option value="tomorrow">{labels.tomorrow}</option>
              <option value="yesterday">{labels.yesterday}</option>
              <option value="week">{labels.week}</option>
              <option value="month">{labels.month}</option>
            </TaskKioskFilterSelect>
          </TaskKioskFilterField>
          <TaskKioskFilterField label={copy.filters.unit}>
            <TaskKioskFilterSelect value={unitFilter} onChange={handleUnitFilterChange}>
              <option value={allFilterValue}>{copy.filters.allUnits}</option>
              {unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </TaskKioskFilterSelect>
          </TaskKioskFilterField>
          <TaskKioskFilterField label={copy.filters.business}>
            <TaskKioskFilterSelect value={businessFilter} onChange={setBusinessFilter}>
              <option value={allFilterValue}>{copy.filters.allBusinesses}</option>
              {businessOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </TaskKioskFilterSelect>
          </TaskKioskFilterField>
        </div>
      </PublicTaskKioskFiltersSheet>

      <PublicTaskKioskDialogs
        assignmentOptions={assignmentOptions}
        closeResponsibleModal={closeResponsibleModal}
        closeTaskCompletionModal={closeTaskCompletionModal}
        completionNotes={completionNotes}
        completionPercent={completionPercent}
        copy={copy}
        createBusinessOptions={createBusinessOptions}
        createCollaboratorOptions={createCollaboratorOptions}
        createEvidenceFiles={createEvidenceFiles}
        createTaskForm={createTaskForm}
        evidenceFiles={evidenceFiles}
        errorMessage={error}
        formatDate={formatDate}
        formatDateTime={formatDateTime}
        handleAssignResponsible={handleAssignResponsible}
        handleCompleteTask={handleCompleteTask}
        handleCreateEvidenceFilesChange={handleCreateEvidenceFilesChange}
        handleCreateTask={handleCreateTask}
        handleEvidenceFilesChange={handleEvidenceFilesChange}
        identity={identity}
        isAssigningResponsible={isAssigningResponsible}
        isCreateTaskModalOpen={isCreateTaskModalOpen}
        isOnline={isOnline}
        isSubmitting={isSubmitting}
        isTaskModalOpen={isTaskModalOpen}
        isUploadingEvidence={isUploadingEvidence}
        labels={labels}
        openTaskStatuses={openTaskStatuses}
        openResponsibleModal={(task) => {
          closeTaskCompletionModal();
          openResponsibleModal(task);
        }}
        responsibleCollaboratorOptions={responsibleCollaboratorOptions}
        responsibleError={responsibleError}
        responsibleTask={responsibleTask}
        responsibleUserCompanyId={responsibleUserCompanyId}
        scopeLabel={scopeLabel}
        selectedLocale={selectedLocale}
        selectedTask={selectedTask}
        setCompletionNotes={setCompletionNotes}
        setCompletionPercent={setCompletionPercent}
        setCreateEvidenceFiles={setCreateEvidenceFiles}
        setCreateTaskForm={setCreateTaskForm}
        setIsCreateTaskModalOpen={setIsCreateTaskModalOpen}
        setResponsibleUserCompanyId={setResponsibleUserCompanyId}
        taskTypeLabel={taskTypeLabel}
      />
    </>
  );
}
