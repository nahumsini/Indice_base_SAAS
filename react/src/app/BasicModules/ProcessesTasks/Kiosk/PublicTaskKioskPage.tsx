import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  ArrowRight,
  CalendarCheck2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Eye,
  FileUp,
  Image as ImageIcon,
  KeyRound,
  ListChecks,
  Paperclip,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { useParams } from 'react-router';
import { LoadingBarOverlay } from '../../../components/LoadingBarOverlay';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import {
  processTaskKioskApi,
  uploadPublicTaskAttachment,
  type PublicTaskKioskBootstrapResponse,
  type PublicTaskKioskAssignmentOption,
  type PublicTaskKioskTask,
  type PublicTaskKioskIdentifyResponse,
} from './processTaskKioskApi';
import { ProgressSlider } from '../shared/ProgressSlider';
import { TaskKioskLanguageSelector, TaskPinKeypad } from './components/PublicTaskKioskControls';
import { useTaskKioskLocaleControls, useTaskKioskTranslations } from './hooks/useTaskKioskTranslations';
import type { TaskKioskLocale, TaskKioskTranslations } from './translations';
import type { AgendaFocusFilter, PeriodFilter } from '../Agenda/types';
import { filterKioskTasks } from './taskKioskFilterEngine';

const maxEvidenceSizeBytes = 10 * 1024 * 1024;
const maxEvidenceFiles = 5;
const acceptedEvidenceTypes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
]);
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

type TaskKioskTab = 'open' | 'resolved';

type TaskCreateFormState = {
  title: string;
  unitId: string;
  businessId: string;
  assignedUserCompanyId: string;
  dueDate: string;
};

type KioskCollaboratorOption = PublicTaskKioskAssignmentOption['collaborators'][number];

const defaultCreateForm: TaskCreateFormState = {
  title: '',
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
  };
}

function taskTypeLabel(taskType: PublicTaskKioskTask['task_type'] | undefined, copy: TaskKioskTranslations) {
  return {
    task: copy.task.task,
    'project-task': copy.task.projectTask,
    process: copy.task.process,
  }[taskType ?? 'task'];
}

function contentTypeFromName(fileName: string) {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.jfif')) return 'image/jpeg';
  if (lowerName.endsWith('.gif')) return 'image/gif';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  if (lowerName.endsWith('.heic')) return 'image/heic';
  if (lowerName.endsWith('.heif')) return 'image/heif';
  if (lowerName.endsWith('.doc')) return 'application/msword';
  if (lowerName.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lowerName.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (lowerName.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lowerName.endsWith('.csv')) return 'text/csv';
  if (lowerName.endsWith('.txt')) return 'text/plain';

  return '';
}

function normalizedFileContentType(file: File) {
  const browserType = file.type.trim().toLowerCase();
  const normalizedBrowserType = browserType === 'image/jpg' || browserType === 'image/pjpeg' ? 'image/jpeg' : browserType;

  if (acceptedEvidenceTypes.has(normalizedBrowserType)) {
    return normalizedBrowserType;
  }

  return contentTypeFromName(file.name);
}

export default function PublicTaskKioskPage() {
  const { deviceToken } = useParams();
  const copy = useTaskKioskTranslations();
  const {
    detectedLocale,
    localeOptions,
    selectedLocale,
    setTaskKioskLocale,
  } = useTaskKioskLocaleControls();
  const [bootstrap, setBootstrap] = useState<PublicTaskKioskBootstrapResponse | null>(null);
  const [identity, setIdentity] = useState<PublicTaskKioskIdentifyResponse | null>(null);
  const [pin, setPin] = useState('');
  const [tasks, setTasks] = useState<PublicTaskKioskTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [activeTaskTab, setActiveTaskTab] = useState<TaskKioskTab>('open');
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
          setError(loadError instanceof Error ? loadError.message : copy.errors.loadFailure);
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
    if (!deviceToken || pin.length < 5) {
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
    } catch (identifyError) {
      setError(identifyError instanceof Error ? identifyError.message : copy.errors.identifyFailure);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async () => {
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
      await uploadTaskEvidence(selectedTask.id, evidenceFiles);

      const response = await processTaskKioskApi.completePublicTask(deviceToken, selectedTask.id, {
        identification_token: identity.identification_token,
        completion_notes: completionNotes,
        completion_percent: parsedCompletion,
      });
      setTasks(response.items);
      setSelectedTaskId(null);
      setIsTaskModalOpen(false);
      setCompletionNotes('');
      setCompletionPercent('100');
      setEvidenceFiles([]);
      setSuccessMessage(copy.success.completed(selectedTask.title));
    } catch (completeError) {
      if (completeError instanceof Error && completeError.message === 'TASK_EVIDENCE_UPLOAD_FAILED') {
        setError(copy.errors.uploadFailure);
      } else {
        setError(completeError instanceof Error ? completeError.message : copy.errors.completeFailure);
      }
    } finally {
      setIsUploadingEvidence(false);
      setIsSubmitting(false);
    }
  };

  const handleCreateTask = async () => {
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
      const response = await processTaskKioskApi.createPublicTask(deviceToken, {
        identification_token: identity.identification_token,
        title,
        description: null,
        priority: 'medium',
        startDate: null,
        dueDate: createTaskForm.dueDate || todayDateInputValue(),
        unitId: numericFormValue(createTaskForm.unitId),
        businessId: numericFormValue(createTaskForm.businessId),
        assignedUserCompanyId: numericFormValue(createTaskForm.assignedUserCompanyId) ?? identity.user.id,
        assignedName:
          createCollaboratorOptions.find(
            (collaborator) => String(collaborator.user_company_id) === createTaskForm.assignedUserCompanyId,
          )?.full_name ?? identity.user.full_name,
      });
      await uploadTaskEvidence(response.task.id, createEvidenceFiles);
      setTasks(response.items);
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
    } catch (createError) {
      if (createError instanceof Error && createError.message === 'TASK_EVIDENCE_UPLOAD_FAILED') {
        setError(copy.errors.uploadFailure);
      } else {
        setError(createError instanceof Error ? createError.message : copy.errors.createFailure);
      }
    } finally {
      setIsUploadingEvidence(false);
      setIsSubmitting(false);
    }
  };

  const handleAssignResponsible = async () => {
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
      const response = await withRequestTimeout(
        processTaskKioskApi.assignPublicTaskResponsible(deviceToken, responsibleTask.id, {
          identification_token: identity.identification_token,
          assignedUserCompanyId,
          assignedName: selectedCollaborator?.full_name ?? null,
        }, {
          signal: controller.signal,
        }),
        responsibleRequestTimeoutMs,
        () => controller.abort(),
      );
      setTasks(response.items);
      setResponsibleTaskId(null);
      setResponsibleUserCompanyId('');
      setSuccessMessage(copy.success.responsibleUpdated(responsibleTask.title));
    } catch (assignError) {
      const message = assignError instanceof Error && ['AbortError', 'RequestTimeoutError'].includes(assignError.name)
        ? copy.errors.responsibleTimeout
        : assignError instanceof Error
          ? assignError.message
          : copy.errors.responsibleFailure;
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
    for (const file of files.slice(0, maxEvidenceFiles)) {
      if (file.size > maxEvidenceSizeBytes) {
        throw new Error(copy.errors.fileTooLarge(file.name));
      }
      const contentType = normalizedFileContentType(file);
      if (!contentType || !acceptedEvidenceTypes.has(contentType)) {
        throw new Error(copy.errors.unsupportedEvidence(file.name));
      }
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
      await processTaskKioskApi.registerPublicTaskAttachment(deviceToken, taskId, {
        identification_token: identity.identification_token,
        object_key: presigned.object_key,
        original_filename: file.name,
        mime_type: contentType,
        size_bytes: file.size,
      });
    }
  };

  const filesFromInput = (event: ChangeEvent<HTMLInputElement>) => (
    Array.from(event.target.files ?? []).slice(0, maxEvidenceFiles)
  );

  const handleEvidenceFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEvidenceFiles(filesFromInput(event));
  };

  const handleCreateEvidenceFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCreateEvidenceFiles(filesFromInput(event));
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

  const closeTaskCompletionModal = () => {
    if (isSubmitting) {
      return;
    }
    setIsTaskModalOpen(false);
    setCompletionNotes('');
    setEvidenceFiles([]);
  };

  const closeResponsibleModal = () => {
    if (isAssigningResponsible) {
      return;
    }
    setResponsibleTaskId(null);
    setResponsibleUserCompanyId('');
    setResponsibleError(null);
  };

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-4 sm:py-4">
      <LoadingBarOverlay
        isVisible={isLoading}
        title={copy.loading.title}
        description={copy.loading.description}
      />

      <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col overflow-hidden bg-white dark:bg-slate-950 sm:min-h-[calc(100vh-2rem)] sm:rounded-lg sm:border sm:border-slate-200 sm:shadow-sm sm:dark:border-slate-800">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950 sm:static sm:px-5 sm:py-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-stretch">
            <div className="rounded-lg border border-[#F4C84A]/30 bg-[linear-gradient(135deg,_#fff8dc_0%,_#ffffff_58%,_#fff4c2_100%)] p-3 shadow-sm dark:border-[#F4C84A]/25 dark:bg-[linear-gradient(135deg,_#3a2700_0%,_#020617_58%,_#0f172a_100%)] sm:p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#F4C84A] text-slate-950 shadow-sm">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-2xl font-black leading-none text-slate-950 dark:text-white">Indice</p>
                      <p className="mt-1 text-sm font-bold text-[#9A6B05] dark:text-[#FDE68A]">{copy.header.badge}</p>
                    </div>
                    <TaskKioskLanguageSelector
                      copy={copy}
                      detectedLocale={detectedLocale}
                      locale={selectedLocale}
                      localeOptions={localeOptions}
                      onLocaleChange={setTaskKioskLocale}
                    />
                  </div>

                  <div className="mt-3 rounded-lg border border-[#F4C84A]/25 bg-white/80 px-3 py-3 dark:border-[#F4C84A]/20 dark:bg-slate-950/60">
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#9A6B05] dark:text-[#FDE68A]" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6B05] dark:text-[#FDE68A]">
                          {identity ? copy.identity.eyebrow : copy.header.title}
                        </p>
                        <p className="mt-1 text-sm font-bold leading-5 text-slate-950 dark:text-white">
                          {identity ? identity.user.full_name : copy.header.subtitle}
                        </p>
                        {identity ? (
                          <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                            {identity.user.position_title || identity.user.department || identity.user.user_code || copy.identity.fallbackStatus}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0 rounded-lg border border-[#F4C84A]/25 bg-[#F4C84A]/8 px-4 py-3 dark:border-[#F4C84A]/25 dark:bg-[#F4C84A]/10">
                <div className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  <CalendarCheck2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{copy.header.point}</span>
                </div>
                <p className="mt-2 truncate text-base font-bold text-[#9A6B05] dark:text-[#FDE68A]">{pointLabel}</p>
              </div>
              <div className="min-w-0 rounded-lg border border-slate-200 bg-white/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/75">
                <div className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  <Clock3 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{copy.header.time}</span>
                </div>
                <p className="mt-2 truncate text-base font-bold text-slate-950 dark:text-white">{currentTimeLabel}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 bg-slate-50/80 px-3 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:bg-slate-900/55 sm:px-5 sm:py-5">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent sm:rounded-lg sm:border sm:border-slate-200 sm:bg-white sm:p-5 sm:shadow-sm sm:dark:border-slate-800 sm:dark:bg-slate-950">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                {successMessage}
              </div>
            ) : null}

            {!identity ? (
              <section className="mt-3 rounded-lg border border-[#F4C84A]/25 bg-[#F4C84A]/8 p-3 shadow-sm dark:border-[#F4C84A]/25 dark:bg-[#F4C84A]/10 sm:mt-0 sm:p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9A6B05] dark:text-[#FDE68A]">{copy.steps.pin}</p>
                    <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{copy.pin.title}</h1>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.pin.description}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F4C84A] text-slate-950 shadow-sm">
                    <KeyRound className="h-6 w-6" />
                  </div>
                </div>

                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">{copy.pin.placeholder}</label>
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_12rem]">
                  <Input
                    value={pin}
                    inputMode="numeric"
                    maxLength={5}
                    placeholder={copy.pin.placeholder}
                    autoFocus
                    autoComplete="off"
                    enterKeyHint="done"
                    className="h-16 rounded-lg border-[#F4C84A]/35 bg-white text-center text-2xl font-black tracking-[0.35em] text-slate-950 shadow-inner outline-none placeholder:tracking-normal dark:border-[#F4C84A]/30 dark:bg-slate-950 dark:text-white sm:h-24 sm:text-4xl sm:tracking-[0.42em]"
                    disabled={isSubmitting}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 5))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleIdentify();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    className="h-14 rounded-lg bg-[#F4C84A] px-6 text-base font-black text-slate-950 shadow-sm hover:bg-[#E5B835] disabled:opacity-45 sm:h-24"
                    disabled={pin.length < 5 || isSubmitting}
                    onClick={() => void handleIdentify()}
                  >
                    <KeyRound className="h-5 w-5" />
                    {copy.pin.continue}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
                <div className="mt-4 max-w-none sm:max-w-xl">
                  <TaskPinKeypad value={pin} disabled={isSubmitting} deleteLabel={copy.pin.deleteKey} onChange={setPin} />
                </div>
              </section>
            ) : (
              <section className="mt-3 space-y-4 pb-28 sm:mt-0 sm:space-y-5 sm:pb-0">
                <div className="overflow-hidden rounded-lg border border-[#F4C84A]/35 bg-white shadow-sm dark:border-[#F4C84A]/20 dark:bg-slate-950">
                  <div className="bg-[#F4C84A] px-4 py-3 text-slate-950">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/55">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7A5204]">{copy.header.badge}</p>
                          <h1 className="truncate text-xl font-black">Kiosko de tareas</h1>
                        </div>
                      </div>
                      <Button type="button" variant="outline" className="h-10 shrink-0 gap-2 rounded-lg border-white/45 bg-white/45 px-3 text-slate-950 hover:bg-white/70" onClick={() => setIdentity(null)}>
                        <RefreshCw className="h-4 w-4" />
                        {copy.identity.reset}
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#F4C84A] text-base font-black text-slate-950 shadow-sm sm:h-16 sm:w-16 sm:text-xl">
                        {identity.user.full_name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '??'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">{copy.identity.eyebrow}</p>
                        <p className="mt-1 truncate text-xl font-black text-slate-950 dark:text-white sm:text-2xl">{identity.user.full_name}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {identity.user.position_title || identity.user.department || identity.user.user_code || copy.identity.fallbackStatus}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#F4C84A]/30 bg-[#F4C84A]/10 px-3 py-2 text-sm font-black text-[#7A5204] dark:text-[#FDE68A]">
                      {scopeLabel}
                    </div>
                  </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{copy.sidebar.openTasks}</p>
                    <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{openTasks.length}</p>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 shadow-sm dark:border-red-900/60 dark:bg-red-950/35">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-600 dark:text-red-200">{copy.task.overdue}</p>
                    <p className="mt-1 text-2xl font-black text-red-700 dark:text-red-100">{overdueTasksCount}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{copy.tabs.resolved(resolvedTasks.length).replace(/[()0-9]/g, '').trim()}</p>
                    <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{resolvedTasks.length}</p>
                  </div>
                  <div className="rounded-lg border border-[#F4C84A]/25 bg-[#F4C84A]/8 px-3 py-3 shadow-sm dark:border-[#F4C84A]/25 dark:bg-[#F4C84A]/10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A6B05] dark:text-[#FDE68A]">{copy.header.scope}</p>
                    <p className="mt-1 truncate text-sm font-black text-slate-950 dark:text-white">{scopeLabel}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="grid gap-3 sm:grid-cols-2 lg:flex-1">
                      <label className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{labels.focus}</span>
                        <select
                          value={focusFilter}
                          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-[#F4C84A] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          onChange={(event) => setFocusFilter(event.target.value as AgendaFocusFilter)}
                        >
                          <option value="mine">{labels.mine}</option>
                          <option value="delegated">{labels.delegated}</option>
                          <option value="team">{labels.team}</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{labels.period}</span>
                        <select
                          value={periodFilter}
                          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-[#F4C84A] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
                        >
                          <option value="all">{labels.allPeriod}</option>
                          <option value="today">{labels.today}</option>
                          <option value="tomorrow">{labels.tomorrow}</option>
                          <option value="yesterday">{labels.yesterday}</option>
                          <option value="week">{labels.week}</option>
                          <option value="month">{labels.month}</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{copy.filters.unit}</span>
                        <select
                          value={unitFilter}
                          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-[#F4C84A] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          onChange={(event) => handleUnitFilterChange(event.target.value)}
                        >
                          <option value={allFilterValue}>{copy.filters.allUnits}</option>
                          {unitOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{copy.filters.business}</span>
                        <select
                          value={businessFilter}
                          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-[#F4C84A] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          onChange={(event) => setBusinessFilter(event.target.value)}
                        >
                          <option value={allFilterValue}>{copy.filters.allBusinesses}</option>
                          {businessOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <Button
                      type="button"
                      className="h-11 rounded-lg bg-[#F4C84A] px-4 text-sm font-black text-slate-950 shadow-sm hover:bg-[#E5B835]"
                      onClick={() => setIsCreateTaskModalOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {copy.actions.createTask}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:inline-grid sm:grid-cols-2">
                  {([
                    ['open', copy.tabs.open(openTasks.length)],
                    ['resolved', copy.tabs.resolved(resolvedTasks.length)],
                  ] as const).map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      className={`rounded-lg px-4 py-2 text-sm font-black transition ${
                        activeTaskTab === tab
                          ? 'bg-[#F4C84A] text-slate-950 shadow-sm'
                          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
                      }`}
                      onClick={() => setActiveTaskTab(tab)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {tasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                    <h3 className="mt-4 text-xl font-black">{copy.empty.title}</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{copy.empty.body}</p>
                  </div>
                ) : visibleTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
                    <ListChecks className="mx-auto h-12 w-12 text-[#9A6B05]" />
                    <h3 className="mt-4 text-xl font-black">{activeTaskTab === 'open' ? copy.empty.filteredTitle : copy.empty.resolvedTitle}</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {activeTaskTab === 'open' ? copy.empty.filteredBody : copy.empty.resolvedBody}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-5 h-10 rounded-lg border-[#F4C84A]/50 px-4 text-sm font-black text-[#7A5204] hover:bg-[#F4C84A]/10"
                      onClick={() => {
                        setFocusFilter('team');
                        setPeriodFilter('all');
                        setUnitFilter(allFilterValue);
                        setBusinessFilter(allFilterValue);
                      }}
                    >
                      {labels.allPeriod}
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {visibleTasks.map((task) => (
                      <article
                        key={task.id}
                        className={`overflow-hidden rounded-lg border bg-white shadow-sm transition hover:shadow-md dark:bg-slate-950 ${
                          task.is_overdue
                            ? 'border-red-200 hover:border-red-300 dark:border-red-900/60'
                            : 'border-slate-200 hover:border-[#F4C84A]/60 dark:border-slate-800'
                        }`}
                      >
                        <div className="grid gap-0 sm:grid-cols-[minmax(0,1fr)_13rem]">
                          <div className="min-w-0 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                  {task.unit_name || copy.filters.unassignedUnit}
                                </p>
                                <p className="mt-1 truncate text-sm font-bold text-[#9A6B05] dark:text-[#FDE68A]">
                                  {task.business_name || copy.filters.unassignedBusiness}
                                </p>
                              </div>
                              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                                task.is_overdue
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200'
                                  : 'bg-[#F4C84A]/15 text-[#9A6B05] dark:bg-[#F4C84A]/15 dark:text-[#FDE68A]'
                              }`}>
                                {task.is_overdue ? copy.task.overdue : taskTypeLabel(task.task_type, copy)}
                              </span>
                            </div>

                            <h3 className="mt-3 text-lg font-black leading-6 text-slate-950 dark:text-white">{task.title}</h3>
                            {task.description ? (
                              <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{task.description}</p>
                            ) : null}
                          </div>

                          <div className="border-t border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70 sm:border-l sm:border-t-0">
                            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-1">
                              <div className="rounded-lg bg-white px-3 py-2 dark:bg-slate-950">
                                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{copy.task.due}</dt>
                                <dd className="mt-1 font-black">{formatDate(task.due_date, selectedLocale, copy.errors.noDate)}</dd>
                              </div>
                              <div className="rounded-lg bg-white px-3 py-2 dark:bg-slate-950">
                                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{copy.task.created}</dt>
                                <dd className="mt-1 font-black">{formatDateTime(task.created_at, selectedLocale, copy.errors.noDate)}</dd>
                              </div>
                            </dl>

                            <button
                              type="button"
                              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900 transition hover:border-[#F4C84A] hover:bg-[#F4C84A]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                              onClick={() => openTaskCompletionModal(task)}
                            >
                              <Eye className="h-4 w-4" />
                              {labels.view}
                            </button>

                            {openTaskStatuses.has(task.status) ? (
                              <button
                                type="button"
                                className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-black text-slate-900 transition hover:border-[#F4C84A] hover:bg-[#F4C84A]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                onClick={() => openResponsibleModal(task)}
                              >
                                <span className="min-w-0 truncate">{task.assigned_name || identity.user.full_name}</span>
                                <span className="shrink-0 text-[11px] font-black uppercase tracking-[0.12em] text-[#9A6B05] dark:text-[#FDE68A]">
                                  {copy.task.changeResponsible}
                                </span>
                              </button>
                            ) : (
                              <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-950">
                                {task.assigned_name || identity.user.full_name}
                              </div>
                            )}

                            {task.can_complete && openTaskStatuses.has(task.status) ? (
                              <Button
                                type="button"
                                className="mt-2 h-11 w-full rounded-lg bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700"
                                onClick={() => openTaskCompletionModal(task)}
                              >
                                <ClipboardCheck className="mr-2 h-4 w-4" />
                                {copy.task.closeTask}
                              </Button>
                            ) : (
                              <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                                {task.status === 'completed'
                                  ? copy.task.resolved
                                  : task.is_created_by_current_user
                                    ? copy.task.createdByYou
                                    : copy.task.assignedElsewhere}
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </section>
      </main>

      {identity && isCreateTaskModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-kiosk-create-title"
        >
          <section className="max-h-[92vh] w-full overflow-hidden rounded-t-[24px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-xl sm:rounded-lg">
            <div className="bg-[#F4C84A] px-5 py-4 text-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/45">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7A5204]">{copy.create.eyebrow}</p>
                    <h2 id="task-kiosk-create-title" className="mt-1 text-2xl font-black">{copy.create.title}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-800/80">{copy.create.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/45 text-slate-800 transition hover:bg-white/70"
                  aria-label={copy.create.closeModal}
                  onClick={() => {
                    setCreateEvidenceFiles([]);
                    setIsCreateTaskModalOpen(false);
                  }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(92vh-12rem)] overflow-y-auto bg-slate-50 px-5 py-5 dark:bg-slate-900/60">
            <div className="grid gap-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F4C84A]/20 text-[#9A6B05]">
                    <ListChecks className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-slate-950 dark:text-white">{copy.create.titleLabel}</p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.create.description}</p>
                  </div>
                </div>
                <div className="grid gap-4">
                  <label className="space-y-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.create.titleLabel}</span>
                    <Input
                      value={createTaskForm.title}
                      disabled={isSubmitting}
                      placeholder={copy.create.titlePlaceholder}
                      className="h-12 rounded-lg"
                      onChange={(event) => setCreateTaskForm((current) => ({ ...current, title: event.target.value }))}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.create.dueDateLabel}</span>
                    <Input
                      type="date"
                      value={createTaskForm.dueDate}
                      disabled={isSubmitting}
                      className="h-12 rounded-lg"
                      onChange={(event) => setCreateTaskForm((current) => ({ ...current, dueDate: event.target.value }))}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-slate-950 dark:text-white">{copy.header.scope}</p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{scopeLabel}</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <label className="space-y-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.create.unitLabel}</span>
                    <select
                      value={createTaskForm.unitId}
                      disabled={isSubmitting}
                      className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      onChange={(event) =>
                        setCreateTaskForm((current) => ({
                          ...current,
                          unitId: event.target.value,
                          businessId: '',
                          assignedUserCompanyId: identity.user.id.toString(),
                        }))
                      }
                    >
                      <option value="">{copy.create.selectUnit}</option>
                      {assignmentOptions?.units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.create.businessLabel}</span>
                    <select
                      value={createTaskForm.businessId}
                      disabled={isSubmitting}
                      className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      onChange={(event) =>
                        setCreateTaskForm((current) => ({
                          ...current,
                          businessId: event.target.value,
                          assignedUserCompanyId: identity.user.id.toString(),
                        }))
                      }
                    >
                      <option value="">{copy.create.selectBusiness}</option>
                      {createBusinessOptions.map((business) => (
                        <option key={business.id} value={business.id}>
                          {business.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.create.responsibleLabel}</span>
                    <select
                      value={createTaskForm.assignedUserCompanyId || identity.user.id.toString()}
                      disabled={isSubmitting}
                      className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      onChange={(event) => setCreateTaskForm((current) => ({ ...current, assignedUserCompanyId: event.target.value }))}
                    >
                      {!createCollaboratorOptions.some((collaborator) => collaborator.user_company_id === identity.user.id) ? (
                        <option value={identity.user.id}>{identity.user.full_name}</option>
                      ) : null}
                      {createCollaboratorOptions.map((collaborator) => (
                        <option key={collaborator.user_company_id} value={collaborator.user_company_id}>
                          {collaborator.full_name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-[#F4C84A]/35 bg-white p-4 shadow-sm dark:border-[#F4C84A]/25 dark:bg-slate-950">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#9A6B05] shadow-sm">
                    <Camera className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-slate-950 dark:text-white">{labels.createdEvidenceTitle}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{labels.createdEvidenceBody}</p>
                  </div>
                </div>
                <label className="mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#9A6B05]/35 bg-white px-4 py-4 text-center text-sm font-bold text-slate-700 transition hover:bg-[#F4C84A]/10 dark:bg-slate-950 dark:text-slate-200">
                  <FileUp className="h-6 w-6 text-[#9A6B05]" />
                  {labels.evidenceHint}
                  <input
                    type="file"
                    className="sr-only"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    disabled={isSubmitting}
                    onChange={handleCreateEvidenceFilesChange}
                  />
                </label>
                {createEvidenceFiles.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {createEvidenceFiles.map((file) => (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <Paperclip className="h-4 w-4 text-[#9A6B05]" />
                        <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            </div>

            <div className="flex items-center justify-between gap-3 bg-[#F4C84A] px-5 py-4 text-slate-950">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-lg border-white/45 bg-transparent px-4 text-sm font-black text-slate-950 hover:bg-white/20"
                disabled={isSubmitting}
                onClick={() => {
                  setCreateEvidenceFiles([]);
                  setIsCreateTaskModalOpen(false);
                }}
              >
                {copy.create.closeModal}
              </Button>
              <Button
                type="button"
                className="h-11 rounded-lg bg-white px-5 text-sm font-black text-[#7A5204] hover:bg-white/90"
                disabled={isSubmitting}
                onClick={() => void handleCreateTask()}
              >
                <Plus className="mr-2 h-5 w-5" />
                {isUploadingEvidence ? copy.selectedTask.uploadingEvidence : copy.create.submit}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {identity && responsibleTask ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-kiosk-responsible-title"
        >
          <section className="max-h-[92vh] w-full overflow-hidden rounded-t-[24px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-md sm:rounded-lg">
            <div className="bg-[#F4C84A] px-5 py-4 text-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7A5204]">{copy.responsible.eyebrow}</p>
                <h2 id="task-kiosk-responsible-title" className="mt-1 text-2xl font-black">{copy.responsible.title}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-800/80">{copy.responsible.description}</p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/45 text-slate-800 transition hover:bg-white/70"
                aria-label={copy.responsible.closeModal}
                onClick={closeResponsibleModal}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            </div>

            <div className="px-5 py-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {responsibleTask.unit_name || copy.filters.unassignedUnit} / {responsibleTask.business_name || copy.filters.unassignedBusiness}
              </p>
              <h3 className="mt-2 text-lg font-black text-slate-950 dark:text-white">{responsibleTask.title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {copy.task.due} {formatDate(responsibleTask.due_date, selectedLocale, copy.errors.noDate)}
              </p>
            </div>

            <label className="mt-5 block space-y-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.responsible.selectLabel}</span>
              <select
                value={responsibleUserCompanyId}
                disabled={isAssigningResponsible || responsibleCollaboratorOptions.length === 0}
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                onChange={(event) => setResponsibleUserCompanyId(event.target.value)}
              >
                {responsibleCollaboratorOptions.length === 0 ? (
                  <option value="">{copy.responsible.empty}</option>
                ) : null}
                {responsibleCollaboratorOptions.map((collaborator) => (
                  <option key={collaborator.user_company_id} value={collaborator.user_company_id}>
                    {collaborator.full_name}
                  </option>
                ))}
              </select>
            </label>

            {responsibleError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {responsibleError}
              </div>
            ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 bg-[#F4C84A] px-5 py-4 text-slate-950">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-lg border-white/45 bg-transparent px-4 text-sm font-black text-slate-950 hover:bg-white/20"
                disabled={isAssigningResponsible}
                onClick={closeResponsibleModal}
              >
                {copy.responsible.closeModal}
              </Button>
              <Button
                type="button"
                className="h-11 rounded-lg bg-white px-5 text-sm font-black text-[#7A5204] hover:bg-white/90"
                disabled={isAssigningResponsible || responsibleCollaboratorOptions.length === 0}
                onClick={() => void handleAssignResponsible()}
              >
                <UserRound className="mr-2 h-5 w-5" />
                {isAssigningResponsible ? copy.responsible.updating : copy.responsible.submit}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {selectedTask && isTaskModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-kiosk-completion-title"
        >
          <section className="max-h-[92vh] w-full overflow-hidden rounded-t-[24px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-xl sm:rounded-lg">
            <div className="bg-[#F4C84A] px-5 py-4 text-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/45 text-slate-950">
                    <ClipboardCheck className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7A5204]">{copy.selectedTask.eyebrow}</p>
                    <h2 id="task-kiosk-completion-title" className="mt-1 break-words text-2xl font-black">{selectedTask.title}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-800/80">
                      {taskTypeLabel(selectedTask.task_type, copy)} / {selectedTask.attachments} {labels.attachments}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/45 text-slate-800 transition hover:bg-white/70"
                  aria-label={copy.selectedTask.closeModal}
                  onClick={closeTaskCompletionModal}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(92vh-12rem)] overflow-y-auto bg-slate-50 px-5 py-5 dark:bg-slate-900/60">
              {selectedTask.description ? (
                <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">{selectedTask.description}</p>
              ) : null}

              <div className="mt-4 grid grid-cols-1 gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  {copy.task.start} {formatDate(selectedTask.start_date, selectedLocale, copy.errors.noDate)}
                </span>
                <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  {copy.task.due} {formatDate(selectedTask.due_date, selectedLocale, copy.errors.noDate)}
                </span>
                <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  {copy.task.created} {formatDateTime(selectedTask.created_at, selectedLocale, copy.errors.noDate)}
                </span>
              </div>

              {selectedTask.can_complete && openTaskStatuses.has(selectedTask.status) ? (
                <>
                  <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <ProgressSlider
                      value={Number(completionPercent || 100)}
                      label={copy.selectedTask.completion}
                      disabled={isSubmitting}
                      onChange={(value) => setCompletionPercent(String(value))}
                    />
                  </div>

                  <div className="mt-5">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.selectedTask.evidence}</label>
                    <label className="mt-2 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-4 text-center text-sm font-semibold text-slate-600 shadow-sm transition hover:border-[#F4C84A] hover:bg-[#F4C84A]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                      <Upload className="h-6 w-6 text-[#9A6B05]" />
                      {copy.selectedTask.addEvidence}
                      <span className="text-xs text-slate-500">{labels.evidenceHint}</span>
                      <input
                        type="file"
                        className="sr-only"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                        disabled={isSubmitting}
                        onChange={handleEvidenceFilesChange}
                      />
                    </label>
                    {evidenceFiles.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {evidenceFiles.map((file) => (
                          <div
                            key={`${file.name}-${file.size}-${file.lastModified}`}
                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                          >
                            <Paperclip className="h-4 w-4 text-[#9A6B05]" />
                            <span className="min-w-0 flex-1 truncate">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.selectedTask.notes}</label>
                    <Textarea
                      value={completionNotes}
                      rows={4}
                      placeholder={copy.selectedTask.notesPlaceholder}
                      className="mt-2 rounded-lg"
                      disabled={isSubmitting}
                      onChange={(event) => setCompletionNotes(event.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {copy.task.resolved}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 bg-[#F4C84A] px-5 py-4 text-slate-950">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-lg border-white/45 bg-transparent px-4 text-sm font-black text-slate-950 hover:bg-white/20"
                disabled={isSubmitting}
                onClick={closeTaskCompletionModal}
              >
                {copy.selectedTask.closeModal}
              </Button>
              {selectedTask.can_complete && openTaskStatuses.has(selectedTask.status) ? (
                <Button
                  type="button"
                  className="h-11 rounded-lg bg-emerald-600 px-5 text-sm font-black text-white hover:bg-emerald-700"
                  disabled={isSubmitting}
                  onClick={() => void handleCompleteTask()}
                >
                  <ClipboardCheck className="mr-2 h-5 w-5" />
                  {isUploadingEvidence ? copy.selectedTask.uploadingEvidence : copy.selectedTask.complete}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-11 rounded-lg bg-white px-5 text-sm font-black text-[#7A5204] hover:bg-white/90"
                  onClick={closeTaskCompletionModal}
                >
                  <ImageIcon className="mr-2 h-5 w-5" />
                  {copy.selectedTask.closeModal}
                </Button>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
