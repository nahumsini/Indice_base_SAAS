import { useEffect, useRef, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import {
  Camera,
  ClipboardCheck,
  FileUp,
  Image as ImageIcon,
  ListChecks,
  Paperclip,
  Plus,
  Sparkles,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { ProgressSlider } from '../../shared/ProgressSlider';
import type {
  PublicTaskKioskAssignmentOption,
  PublicTaskKioskIdentifyResponse,
  PublicTaskKioskTask,
} from '../processTaskKioskApi';
import type { TaskKioskLocale, TaskKioskTranslations } from '../translations';

type TaskCreateFormState = {
  title: string;
  unitId: string;
  businessId: string;
  assignedUserCompanyId: string;
  dueDate: string;
};

type Collaborator = PublicTaskKioskAssignmentOption['collaborators'][number];
type Business = PublicTaskKioskAssignmentOption['businesses'][number];

type DialogLabels = {
  attachments: string;
  createdEvidenceBody: string;
  createdEvidenceTitle: string;
  evidenceHint: string;
};

type Props = {
  assignmentOptions: PublicTaskKioskAssignmentOption | null;
  closeResponsibleModal: () => void;
  closeTaskCompletionModal: () => void;
  completionNotes: string;
  completionPercent: string;
  copy: TaskKioskTranslations;
  createBusinessOptions: Business[];
  createCollaboratorOptions: Collaborator[];
  createEvidenceFiles: File[];
  createTaskForm: TaskCreateFormState;
  evidenceFiles: File[];
  formatDate: (value: string | null, locale: TaskKioskLocale, emptyLabel: string) => string;
  formatDateTime: (value: string | null, locale: TaskKioskLocale, emptyLabel: string) => string;
  handleAssignResponsible: () => Promise<void>;
  handleCompleteTask: () => Promise<void>;
  handleCreateEvidenceFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleCreateTask: () => Promise<void>;
  handleEvidenceFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  identity: PublicTaskKioskIdentifyResponse | null;
  isAssigningResponsible: boolean;
  isCreateTaskModalOpen: boolean;
  isOnline: boolean;
  isSubmitting: boolean;
  isTaskModalOpen: boolean;
  isUploadingEvidence: boolean;
  labels: DialogLabels;
  openTaskStatuses: ReadonlySet<PublicTaskKioskTask['status']>;
  responsibleCollaboratorOptions: Collaborator[];
  responsibleError: string | null;
  responsibleTask: PublicTaskKioskTask | null;
  responsibleUserCompanyId: string;
  scopeLabel: string;
  selectedLocale: TaskKioskLocale;
  selectedTask: PublicTaskKioskTask | null;
  setCompletionNotes: Dispatch<SetStateAction<string>>;
  setCompletionPercent: Dispatch<SetStateAction<string>>;
  setCreateEvidenceFiles: Dispatch<SetStateAction<File[]>>;
  setCreateTaskForm: Dispatch<SetStateAction<TaskCreateFormState>>;
  setIsCreateTaskModalOpen: Dispatch<SetStateAction<boolean>>;
  setResponsibleUserCompanyId: Dispatch<SetStateAction<string>>;
  taskTypeLabel: (
    taskType: PublicTaskKioskTask['task_type'] | undefined,
    copy: TaskKioskTranslations,
  ) => string;
};

export function PublicTaskKioskDialogs(props: Props) {
  const {
    assignmentOptions,
    closeResponsibleModal,
    closeTaskCompletionModal,
    completionNotes,
    completionPercent,
    copy,
    createBusinessOptions,
    createCollaboratorOptions,
    createEvidenceFiles,
    createTaskForm,
    evidenceFiles,
    formatDate,
    formatDateTime,
    handleAssignResponsible,
    handleCompleteTask,
    handleCreateEvidenceFilesChange,
    handleCreateTask,
    handleEvidenceFilesChange,
    identity,
    isAssigningResponsible,
    isCreateTaskModalOpen,
    isOnline,
    isSubmitting,
    isTaskModalOpen,
    isUploadingEvidence,
    labels,
    openTaskStatuses,
    responsibleCollaboratorOptions,
    responsibleError,
    responsibleTask,
    responsibleUserCompanyId,
    scopeLabel,
    selectedLocale,
    selectedTask,
    setCompletionNotes,
    setCompletionPercent,
    setCreateEvidenceFiles,
    setCreateTaskForm,
    setIsCreateTaskModalOpen,
    setResponsibleUserCompanyId,
    taskTypeLabel,
  } = props;
  const dialogRef = useRef<HTMLDivElement>(null);
  const activeDialog = identity && isCreateTaskModalOpen
    ? 'create'
    : responsibleTask
      ? 'responsible'
      : isTaskModalOpen && selectedTask
        ? 'task'
        : null;
  const dialogBusy = isSubmitting || isAssigningResponsible || isUploadingEvidence;

  useEffect(() => {
    if (!activeDialog || !dialogRef.current) return undefined;
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusableSelector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => !element.hasAttribute('hidden'));
    const frame = window.requestAnimationFrame(() => (focusables()[0] ?? dialog).focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (dialogBusy) return;
        event.preventDefault();
        if (activeDialog === 'create') {
          setCreateEvidenceFiles([]);
          setIsCreateTaskModalOpen(false);
        } else if (activeDialog === 'responsible') {
          closeResponsibleModal();
        } else {
          closeTaskCompletionModal();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [
    activeDialog,
    closeResponsibleModal,
    closeTaskCompletionModal,
    dialogBusy,
    setCreateEvidenceFiles,
    setIsCreateTaskModalOpen,
  ]);

  return (
    <>
      {identity && isCreateTaskModalOpen ? (
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-busy={dialogBusy}
          aria-labelledby="task-kiosk-create-title"
        >
          <section className="max-h-[92vh] w-full overflow-hidden rounded-t-[24px] border border-slate-200/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950 sm:max-w-xl sm:rounded-[28px]">
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
                disabled={!isOnline || isSubmitting}
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
          ref={dialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-busy={dialogBusy}
          aria-labelledby="task-kiosk-responsible-title"
        >
          <section className="max-h-[92vh] w-full overflow-hidden rounded-t-[24px] border border-slate-200/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950 sm:max-w-md sm:rounded-[28px]">
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
                disabled={!isOnline || isAssigningResponsible || responsibleCollaboratorOptions.length === 0}
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
          ref={dialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-busy={dialogBusy}
          aria-labelledby="task-kiosk-completion-title"
        >
          <section className="max-h-[92vh] w-full overflow-hidden rounded-t-[24px] border border-slate-200/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950 sm:max-w-xl sm:rounded-[28px]">
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
                  disabled={!isOnline || isSubmitting}
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

    </>
  );
}
