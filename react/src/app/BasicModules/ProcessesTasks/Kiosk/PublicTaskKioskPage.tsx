import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Globe2,
  KeyRound,
  Paperclip,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
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
  type PublicTaskKioskTask,
  type PublicTaskKioskIdentifyResponse,
} from './processTaskKioskApi';
import { ProgressSlider } from '../shared/ProgressSlider';
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

function formatTime(date: Date, locale: TaskKioskLocale) {
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
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

function TaskPinKeypad({
  value,
  disabled,
  deleteLabel,
  onChange,
}: {
  value: string;
  disabled: boolean;
  deleteLabel: string;
  onChange: (value: string) => void;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0'];
  return (
    <div className="grid grid-cols-3 gap-3">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          className={`flex h-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl font-bold text-slate-950 shadow-sm transition hover:border-[rgb(235,165,52)] hover:bg-[rgb(235,165,52)]/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white ${key === '0' ? 'col-start-2' : ''}`}
          onClick={() => {
            if (key === 'backspace') {
              onChange(value.slice(0, -1));
              return;
            }
            onChange(`${value}${key}`.replace(/\D/g, '').slice(0, 5));
          }}
        >
          {key === 'backspace' ? deleteLabel : key}
        </button>
      ))}
    </div>
  );
}

function TaskKioskLanguageSelector({
  copy,
  detectedLocale,
  locale,
  localeOptions,
  onLocaleChange,
}: {
  copy: TaskKioskTranslations;
  detectedLocale: TaskKioskLocale | null;
  locale: TaskKioskLocale;
  localeOptions: ReadonlyArray<{ code: TaskKioskLocale; label: string }>;
  onLocaleChange: (locale: TaskKioskLocale) => void;
}) {
  return (
    <label className="flex min-w-[13rem] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
      <Globe2 className="h-4 w-4 shrink-0 text-[rgb(174,111,22)]" />
      <span className="sr-only">{copy.language.selectorLabel}</span>
      <select
        value={locale}
        onChange={(event) => onLocaleChange(event.target.value as TaskKioskLocale)}
        aria-label={copy.language.selectorLabel}
        className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
      >
        {localeOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
      {detectedLocale === locale ? (
        <span
          title={copy.language.autoDetected}
          className="hidden rounded-full bg-[rgb(235,165,52)]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[rgb(174,111,22)] sm:inline"
        >
          {copy.language.autoBadge}
        </span>
      ) : null}
    </label>
  );
}

function StepCard({ index, label, active, done }: { index: number; label: string; active?: boolean; done?: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        done
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-200'
          : active
            ? 'border-[rgb(235,165,52)]/40 bg-[rgb(235,165,52)]/10 text-[rgb(174,111,22)] dark:border-[rgb(235,165,52)]/40 dark:bg-[rgb(235,165,52)]/15 dark:text-[rgb(245,196,112)]'
            : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-400'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
            done
              ? 'bg-emerald-500 text-white'
              : active
                ? 'bg-[rgb(235,165,52)] text-white'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
          }`}
        >
          {done ? <CheckCircle2 className="h-5 w-5" /> : index}
        </span>
        <span className="text-sm font-bold">{label}</span>
      </div>
    </div>
  );
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pin, setPin] = useState('');
  const [tasks, setTasks] = useState<PublicTaskKioskTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionPercent, setCompletionPercent] = useState('100');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

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

  useEffect(() => {
    if (!selectedTask) {
      setCompletionPercent('100');
      setEvidenceFiles([]);
      return;
    }

    setCompletionPercent(String(selectedTask.completion_percent > 0 ? selectedTask.completion_percent : 100));
    setEvidenceFiles([]);
  }, [selectedTask?.id]);

  const { openTasks, overdueTasks } = useMemo(() => ({
    openTasks: tasks.filter((task) => !task.is_overdue),
    overdueTasks: tasks.filter((task) => task.is_overdue),
  }), [tasks]);

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
      setSelectedTaskId(response.tasks[0]?.id ?? null);
      setPin('');
    } catch (identifyError) {
      setError(identifyError instanceof Error ? identifyError.message : copy.errors.identifyFailure);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshTasks = async () => {
    if (!deviceToken || !identity?.identification_token) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await processTaskKioskApi.listPublicTasks(deviceToken, identity.identification_token);
      setTasks(response.items);
      setSelectedTaskId((current) => response.items.some((task) => task.id === current) ? current : response.items[0]?.id ?? null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : copy.errors.refreshFailure);
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
      setSelectedTaskId(response.items[0]?.id ?? null);
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

  const handleEvidenceFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEvidenceFiles(Array.from(event.target.files ?? []));
  };

  const resetIdentity = () => {
    setIdentity(null);
    setTasks([]);
    setSelectedTaskId(null);
    setCompletionNotes('');
    setCompletionPercent('100');
    setEvidenceFiles([]);
    setSuccessMessage(null);
    setError(null);
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
              <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(235,165,52)]/12 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[rgb(174,111,22)]">
                <ShieldCheck className="h-4 w-4" />
                {copy.header.badge}
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{copy.header.title}</h1>
              <p className="mt-2 max-w-2xl text-base text-slate-600 dark:text-slate-300">
                {copy.header.subtitle}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{copy.header.point}</p>
                <p className="mt-1 font-bold">{bootstrap?.kiosk.name ?? copy.header.defaultPoint}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{copy.header.scope}</p>
                <p className="mt-1 font-bold">{bootstrap?.scope_label ?? copy.header.defaultScope}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{copy.header.time}</p>
                <p className="mt-1 font-bold">{formatTime(currentTime, selectedLocale)}</p>
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

        <section className="grid flex-1 gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <StepCard index={1} label={copy.steps.pin} active={!identity} done={Boolean(identity)} />
              <StepCard index={2} label={copy.steps.chooseTask} active={Boolean(identity && tasks.length)} done={Boolean(successMessage)} />
              <StepCard index={3} label={copy.steps.complete} active={Boolean(selectedTask)} done={Boolean(successMessage)} />
            </div>

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
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(235,165,52)] text-white">
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
                      className="h-14 w-full rounded-2xl bg-[rgb(235,165,52)] text-base font-bold text-white hover:bg-[rgb(174,111,22)]"
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
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="gap-2 rounded-xl" disabled={isSubmitting} onClick={() => void handleRefreshTasks()}>
                      <RefreshCw className="h-4 w-4" />
                      {copy.identity.refresh}
                    </Button>
                    <Button type="button" variant="outline" className="gap-2 rounded-xl" onClick={resetIdentity}>
                      {copy.identity.reset}
                    </Button>
                  </div>
                </div>

                {tasks.length === 0 ? (
                  <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-950">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                    <h3 className="mt-4 text-xl font-black">{copy.empty.title}</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {copy.empty.body}
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-3">
                      {[...overdueTasks, ...openTasks].map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            selectedTaskId === task.id
                              ? 'border-[rgb(235,165,52)] bg-[rgb(235,165,52)]/10 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-[rgb(235,165,52)]/50 dark:border-slate-800 dark:bg-slate-950'
                          }`}
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            setCompletionNotes('');
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                                {taskTypeLabel(task.task_type, copy)} · {task.folio}
                              </p>
                              <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{task.title}</h3>
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                {task.description || copy.task.noDescription}
                              </p>
                            </div>
                            {task.is_overdue ? (
                              <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-200">
                                {copy.task.overdue}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                              <Clock3 className="h-3.5 w-3.5" />
                              {copy.task.start} {formatDate(task.start_date, selectedLocale, copy.errors.noDate)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                              <Clock3 className="h-3.5 w-3.5" />
                              {copy.task.due} {formatDate(task.due_date, selectedLocale, copy.errors.noDate)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                              <Clock3 className="h-3.5 w-3.5" />
                              {copy.task.created} {formatDateTime(task.created_at, selectedLocale, copy.errors.noDate)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                      {selectedTask ? (
                        <>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgb(174,111,22)]">{copy.selectedTask.eyebrow}</p>
                          <h3 className="mt-2 text-xl font-black">{selectedTask.title}</h3>
                          {selectedTask.description ? (
                            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{selectedTask.description}</p>
                          ) : null}
                          <div className="mt-4 grid grid-cols-1 gap-2 text-xs font-semibold text-slate-500">
                            <span className="rounded-2xl bg-slate-100 px-3 py-2 dark:bg-slate-900">
                              {taskTypeLabel(selectedTask.task_type, copy)}
                            </span>
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
                            <label className="mt-2 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center text-sm font-semibold text-slate-600 transition hover:border-[rgb(235,165,52)] hover:bg-[rgb(235,165,52)]/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                              <Upload className="h-6 w-6 text-[rgb(174,111,22)]" />
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
                                    <Paperclip className="h-4 w-4 text-[rgb(174,111,22)]" />
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
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">{copy.selectedTask.selectTask}</p>
                      )}
                    </aside>
                  </div>
                )}
              </section>
            )}
          </div>

          <aside className="space-y-5">
            <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{copy.sidebar.pointStatus}</p>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">{copy.sidebar.active}</span>
              </div>
              <h2 className="mt-3 text-2xl font-black">{bootstrap?.kiosk.name ?? copy.sidebar.defaultPoint}</h2>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{copy.sidebar.availableFor}</p>
                  <p className="mt-1 font-bold">{bootstrap?.scope_label ?? copy.header.defaultScope}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{copy.sidebar.openTasks}</p>
                  <p className="mt-1 font-bold">{copy.sidebar.openTasksValue(tasks.length)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{copy.sidebar.currentTime}</p>
                  <p className="mt-1 font-bold">{formatTime(currentTime, selectedLocale)}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-[rgb(235,165,52)]/25 bg-[rgb(235,165,52)]/10 p-5 dark:border-[rgb(235,165,52)]/30 dark:bg-[rgb(235,165,52)]/15">
              <Sparkles className="h-6 w-6 text-[rgb(174,111,22)]" />
              <h3 className="mt-3 text-lg font-black">{copy.sidebar.encouragementTitle}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {copy.sidebar.encouragementBody}
              </p>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}
