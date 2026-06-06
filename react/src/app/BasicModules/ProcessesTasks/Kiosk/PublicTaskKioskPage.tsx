import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  KeyRound,
  Paperclip,
  Plus,
  ShieldCheck,
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

const maxEvidenceSizeBytes = 10 * 1024 * 1024;
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
  const [responsibleTaskId, setResponsibleTaskId] = useState<number | null>(null);
  const [responsibleUserCompanyId, setResponsibleUserCompanyId] = useState('');
  const [responsibleError, setResponsibleError] = useState<string | null>(null);
  const [isAssigningResponsible, setIsAssigningResponsible] = useState(false);
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

  const filteredTasks = useMemo(() => {
    const matchingTasks = tasks.filter((task) => {
      const taskUnitValue = String(task.unit_id ?? emptyFilterValue);
      const taskBusinessValue = String(task.business_id ?? emptyFilterValue);
      return (
        (unitFilter === allFilterValue || taskUnitValue === unitFilter) &&
        (businessFilter === allFilterValue || taskBusinessValue === businessFilter)
      );
    });

    return [
      ...matchingTasks.filter((task) => task.is_overdue),
      ...matchingTasks.filter((task) => !task.is_overdue),
    ];
  }, [businessFilter, tasks, unitFilter]);

  const openTasks = useMemo(
    () => filteredTasks.filter((task) => openTaskStatuses.has(task.status)),
    [filteredTasks],
  );
  const resolvedTasks = useMemo(
    () => filteredTasks.filter((task) => task.status === 'completed'),
    [filteredTasks],
  );
  const visibleTasks = activeTaskTab === 'open' ? openTasks : resolvedTasks;

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
      for (const file of evidenceFiles) {
        if (file.size > maxEvidenceSizeBytes) {
          throw new Error(copy.errors.fileTooLarge(file.name));
        }
        const contentType = normalizedFileContentType(file);
        if (!contentType || !acceptedEvidenceTypes.has(contentType)) {
          throw new Error(copy.errors.unsupportedEvidence(file.name));
        }
        const presigned = await processTaskKioskApi.presignPublicTaskAttachmentUpload(deviceToken, selectedTask.id, {
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
        await processTaskKioskApi.registerPublicTaskAttachment(deviceToken, selectedTask.id, {
          identification_token: identity.identification_token,
          object_key: presigned.object_key,
          original_filename: file.name,
          mime_type: contentType,
          size_bytes: file.size,
        });
      }

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
      setTasks(response.items);
      setIsCreateTaskModalOpen(false);
      setActiveTaskTab('open');
      setCreateTaskForm({
        ...defaultCreateFormForSession(),
        unitId: assignmentOptions?.default_unit_id?.toString() ?? '',
        businessId: assignmentOptions?.default_business_id?.toString() ?? '',
        assignedUserCompanyId: identity.user.id.toString(),
      });
      setSuccessMessage(copy.success.created(title));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : copy.errors.createFailure);
    } finally {
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

  const handleEvidenceFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEvidenceFiles(Array.from(event.target.files ?? []));
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/40 p-4 text-slate-950 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-white sm:p-6">
      <LoadingBarOverlay
        isVisible={isLoading}
        title={copy.loading.title}
        description={copy.loading.description}
      />

      <main className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-950/95">
        <header className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#F4C84A]/12 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#9A6B05]">
                <ShieldCheck className="h-4 w-4" />
                {copy.header.badge}
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{copy.header.title}</h1>
              <p className="mt-2 max-w-2xl text-base text-slate-600 dark:text-slate-300">
                {copy.header.subtitle}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{copy.header.point}</p>
                <p className="mt-1 font-bold">{bootstrap?.kiosk.name ?? copy.header.defaultPoint}</p>
              </div>
              <TaskKioskLanguageSelector
                copy={copy}
                detectedLocale={detectedLocale}
                locale={selectedLocale}
                localeOptions={localeOptions}
                onLocaleChange={setTaskKioskLocale}
              />
            </div>
          </div>
        </header>

        <section className="flex-1 space-y-5 p-4 sm:p-5">
          <div className="space-y-5">
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                {successMessage}
              </div>
            ) : null}

            {!identity ? (
              <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4C84A] text-slate-950">
                    <KeyRound className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-2xl font-black">{copy.pin.title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{copy.pin.description}</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-4">
                    <Input
                      value={pin}
                      inputMode="numeric"
                      maxLength={5}
                      placeholder={copy.pin.placeholder}
                      className="h-20 rounded-3xl border-slate-300 bg-white text-center text-4xl font-black tracking-[0.5em] text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      disabled={isSubmitting}
                      onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 5))}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          void handleIdentify();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      className="h-14 w-full rounded-2xl bg-[#F4C84A] text-base font-bold text-slate-950 hover:bg-[#E5B835]"
                      disabled={pin.length < 5 || isSubmitting}
                      onClick={() => void handleIdentify()}
                    >
                      {copy.pin.continue}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                  <TaskPinKeypad value={pin} disabled={isSubmitting} deleteLabel={copy.pin.deleteKey} onChange={setPin} />
                </div>
              </section>
            ) : (
              <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">{copy.identity.eyebrow}</p>
                    <h2 className="mt-1 text-2xl font-black">{identity.user.full_name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{identity.user.position_title || identity.user.department || identity.user.user_code || copy.identity.fallbackStatus}</p>
                  </div>
                  <div className="grid w-full gap-2 sm:w-auto sm:min-w-[32rem] sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
                    <Button
                      type="button"
                      className="h-11 rounded-xl bg-[#F4C84A] px-4 text-sm font-black text-slate-950 hover:bg-[#E5B835]"
                      onClick={() => setIsCreateTaskModalOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {copy.actions.createTask}
                    </Button>
                    <label className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{copy.filters.unit}</span>
                      <select
                        value={unitFilter}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-[#F4C84A] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        onChange={(event) => handleUnitFilterChange(event.target.value)}
                      >
                        <option value={allFilterValue}>{copy.filters.allUnits}</option>
                        {unitOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{copy.filters.business}</span>
                      <select
                        value={businessFilter}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-[#F4C84A] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        onChange={(event) => setBusinessFilter(event.target.value)}
                      >
                        <option value={allFilterValue}>{copy.filters.allBusinesses}</option>
                        {businessOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="mt-5 grid gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-950 sm:inline-grid sm:grid-cols-2">
                  {([
                    ['open', copy.tabs.open(openTasks.length)],
                    ['resolved', copy.tabs.resolved(resolvedTasks.length)],
                  ] as const).map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      className={`rounded-xl px-4 py-2 text-sm font-black transition ${
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
                  <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-950">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                    <h3 className="mt-4 text-xl font-black">{copy.empty.title}</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {copy.empty.body}
                    </p>
                  </div>
                ) : visibleTasks.length === 0 ? (
                  <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-950">
                    <h3 className="text-xl font-black">{activeTaskTab === 'open' ? copy.empty.filteredTitle : copy.empty.resolvedTitle}</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {activeTaskTab === 'open' ? copy.empty.filteredBody : copy.empty.resolvedBody}
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {visibleTasks.map((task) => (
                      <article
                        key={task.id}
                        className="flex min-h-[17rem] flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#F4C84A]/70 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                              {task.unit_name || copy.filters.unassignedUnit}
                            </p>
                            <p className="mt-1 truncate text-sm font-bold text-[#9A6B05]">
                              {task.business_name || copy.filters.unassignedBusiness}
                            </p>
                          </div>
                          {task.is_overdue ? (
                            <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-200">
                              {copy.task.overdue}
                            </span>
                          ) : null}
                        </div>

                        <h3 className="mt-4 line-clamp-2 text-lg font-black text-slate-950 dark:text-white">{task.title}</h3>

                        <dl className="mt-4 grid flex-1 gap-2 text-sm">
                          <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{copy.task.created}</dt>
                            <dd className="mt-1 font-bold">{formatDateTime(task.created_at, selectedLocale, copy.errors.noDate)}</dd>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{copy.task.due}</dt>
                            <dd className="mt-1 font-bold">{formatDate(task.due_date, selectedLocale, copy.errors.noDate)}</dd>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{copy.task.responsible}</dt>
                            <dd className="mt-1">
                              {openTaskStatuses.has(task.status) ? (
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-black text-slate-900 transition hover:border-[#F4C84A] hover:bg-[#F4C84A]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                  onClick={() => openResponsibleModal(task)}
                                >
                                  <span className="min-w-0 truncate">{task.assigned_name || identity.user.full_name}</span>
                                  <span className="shrink-0 text-[11px] font-black uppercase tracking-[0.12em] text-[#9A6B05]">
                                    {copy.task.changeResponsible}
                                  </span>
                                </button>
                              ) : (
                                <span className="block truncate font-bold">{task.assigned_name || identity.user.full_name}</span>
                              )}
                            </dd>
                          </div>
                        </dl>

                        {task.can_complete && openTaskStatuses.has(task.status) ? (
                          <Button
                            type="button"
                            className="mt-4 h-12 w-full rounded-2xl bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700"
                            onClick={() => openTaskCompletionModal(task)}
                          >
                            <ClipboardCheck className="mr-2 h-4 w-4" />
                            {copy.task.closeTask}
                          </Button>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                            {task.status === 'completed'
                              ? copy.task.resolved
                              : task.is_created_by_current_user
                                ? copy.task.createdByYou
                                : copy.task.assignedElsewhere}
                          </div>
                        )}
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
          <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-lg sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9A6B05]">{copy.create.eyebrow}</p>
                <h2 id="task-kiosk-create-title" className="mt-2 text-2xl font-black">{copy.create.title}</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{copy.create.description}</p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                aria-label={copy.create.closeModal}
                onClick={() => setIsCreateTaskModalOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.create.titleLabel}</span>
                <Input
                  value={createTaskForm.title}
                  disabled={isSubmitting}
                  placeholder={copy.create.titlePlaceholder}
                  className="h-12 rounded-2xl"
                  onChange={(event) => setCreateTaskForm((current) => ({ ...current, title: event.target.value }))}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.create.dueDateLabel}</span>
                <Input
                  type="date"
                  value={createTaskForm.dueDate}
                  disabled={isSubmitting}
                  className="h-12 rounded-2xl"
                  onChange={(event) => setCreateTaskForm((current) => ({ ...current, dueDate: event.target.value }))}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.create.unitLabel}</span>
                <select
                  value={createTaskForm.unitId}
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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

            <Button
              type="button"
              className="mt-5 h-14 w-full rounded-2xl bg-[#F4C84A] text-base font-black text-slate-950 hover:bg-[#E5B835]"
              disabled={isSubmitting}
              onClick={() => void handleCreateTask()}
            >
              <Plus className="mr-2 h-5 w-5" />
              {copy.create.submit}
            </Button>
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
          <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-md sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9A6B05]">{copy.responsible.eyebrow}</p>
                <h2 id="task-kiosk-responsible-title" className="mt-2 text-2xl font-black">{copy.responsible.title}</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{copy.responsible.description}</p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                aria-label={copy.responsible.closeModal}
                onClick={closeResponsibleModal}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {responsibleTask.unit_name || copy.filters.unassignedUnit} · {responsibleTask.business_name || copy.filters.unassignedBusiness}
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
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {responsibleError}
              </div>
            ) : null}

            <Button
              type="button"
              className="mt-5 h-14 w-full rounded-2xl bg-[#F4C84A] text-base font-black text-slate-950 hover:bg-[#E5B835]"
              disabled={isAssigningResponsible || responsibleCollaboratorOptions.length === 0}
              onClick={() => void handleAssignResponsible()}
            >
              <UserRound className="mr-2 h-5 w-5" />
              {isAssigningResponsible ? copy.responsible.updating : copy.responsible.submit}
            </Button>
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
          <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-xl sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9A6B05]">{copy.selectedTask.eyebrow}</p>
                <h2 id="task-kiosk-completion-title" className="mt-2 text-2xl font-black">{selectedTask.title}</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {taskTypeLabel(selectedTask.task_type, copy)}
                </p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                aria-label={copy.selectedTask.closeModal}
                onClick={closeTaskCompletionModal}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedTask.description ? (
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{selectedTask.description}</p>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded-2xl bg-slate-100 px-3 py-2 dark:bg-slate-900">
                {copy.task.start} {formatDate(selectedTask.start_date, selectedLocale, copy.errors.noDate)}
              </span>
              <span className="rounded-2xl bg-slate-100 px-3 py-2 dark:bg-slate-900">
                {copy.task.due} {formatDate(selectedTask.due_date, selectedLocale, copy.errors.noDate)}
              </span>
              <span className="rounded-2xl bg-slate-100 px-3 py-2 dark:bg-slate-900">
                {copy.task.created} {formatDateTime(selectedTask.created_at, selectedLocale, copy.errors.noDate)}
              </span>
            </div>

            <div className="mt-5">
              <ProgressSlider
                value={Number(completionPercent || 100)}
                label={copy.selectedTask.completion}
                disabled={isSubmitting}
                onChange={(value) => setCompletionPercent(String(value))}
              />
            </div>

            <div className="mt-5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.selectedTask.evidence}</label>
              <label className="mt-2 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center text-sm font-semibold text-slate-600 transition hover:border-[#F4C84A] hover:bg-[#F4C84A]/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <Upload className="h-6 w-6 text-[#9A6B05]" />
                {copy.selectedTask.addEvidence}
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
                      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
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
                className="mt-2 rounded-2xl"
                disabled={isSubmitting}
                onChange={(event) => setCompletionNotes(event.target.value)}
              />
            </div>

            <Button
              type="button"
              className="mt-5 h-14 w-full rounded-2xl bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700"
              disabled={isSubmitting}
              onClick={() => void handleCompleteTask()}
            >
              <ClipboardCheck className="mr-2 h-5 w-5" />
              {isUploadingEvidence ? copy.selectedTask.uploadingEvidence : copy.selectedTask.complete}
            </Button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
