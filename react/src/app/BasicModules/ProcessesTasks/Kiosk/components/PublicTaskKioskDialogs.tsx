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
  description: string;
  priority: 'low' | 'medium' | 'high';
  unitId: string;
  businessId: string;
  assignedUserCompanyId: string;
  dueDate: string;
};

type Collaborator = PublicTaskKioskAssignmentOption['collaborators'][number];
type Business = PublicTaskKioskAssignmentOption['businesses'][number];

type DialogLabels = {
  attachments: string;
  chooseFile: string;
  close: string;
  createdEvidenceBody: string;
  createdEvidenceTitle: string;
  evidenceHint: string;
  takePhoto: string;
  taskDetails: string;
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
  errorMessage: string | null;
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
  openResponsibleModal: (task: PublicTaskKioskTask) => void;
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
    errorMessage,
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
    openResponsibleModal,
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
          <section className="flex h-[100dvh] w-full flex-col overflow-hidden border-slate-200/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950 sm:h-auto sm:max-h-[92dvh] sm:max-w-[480px] sm:rounded-[24px] sm:border">
            <div className="shrink-0 border-b border-slate-100 bg-white px-4 pb-3.5 pt-[calc(0.875rem+env(safe-area-inset-top))] text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-white sm:px-5 sm:pb-4 sm:pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4C84A] text-[#5F4003] shadow-sm">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-[#9A6B05] dark:text-[#FDE68A]">{copy.create.eyebrow}</p>
                    <h2 id="task-kiosk-create-title" className="mt-0.5 text-xl font-medium leading-tight">{copy.create.title}</h2>
                    <p className="mt-1 line-clamp-2 text-xs font-normal leading-4 text-slate-500 dark:text-slate-400 sm:text-sm sm:leading-5">{copy.create.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/70 px-4 py-4 dark:bg-slate-900/40 sm:px-5">
            {errorMessage ? (
              <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {errorMessage}
              </div>
            ) : null}
            <div className="grid gap-3">
              <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F4C84A]/20 text-[#9A6B05]">
                    <ListChecks className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-950 dark:text-white">{copy.create.titleLabel}</p>
                    <p className="text-xs font-normal text-slate-500 dark:text-slate-400">{copy.create.description}</p>
                  </div>
                </div>
                <div className="grid gap-3.5">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.create.titleLabel}</span>
                    <Input
                      value={createTaskForm.title}
                      disabled={isSubmitting}
                      placeholder={copy.create.titlePlaceholder}
                      className="h-12 rounded-xl"
                      onChange={(event) => setCreateTaskForm((current) => ({ ...current, title: event.target.value }))}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.create.descriptionLabel}</span>
                    <Textarea
                      value={createTaskForm.description}
                      rows={3}
                      disabled={isSubmitting}
                      placeholder={copy.create.descriptionPlaceholder}
                      className="rounded-xl"
                      onChange={(event) => setCreateTaskForm((current) => ({ ...current, description: event.target.value }))}
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.create.dueDateLabel}</span>
                      <Input
                        type="date"
                        value={createTaskForm.dueDate}
                        disabled={isSubmitting}
                        className="h-12 rounded-xl"
                        onChange={(event) => setCreateTaskForm((current) => ({ ...current, dueDate: event.target.value }))}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.create.priorityLabel}</span>
                      <select
                        value={createTaskForm.priority}
                        disabled={isSubmitting}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-[#F4C84A] focus:ring-4 focus:ring-[#F4C84A]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:text-sm"
                        onChange={(event) => setCreateTaskForm((current) => ({ ...current, priority: event.target.value as TaskCreateFormState['priority'] }))}
                      >
                        <option value="low">{copy.create.priorityLow}</option>
                        <option value="medium">{copy.create.priorityMedium}</option>
                        <option value="high">{copy.create.priorityHigh}</option>
                      </select>
                    </label>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F4C84A]/25 text-[#7A5204] dark:text-[#FDE68A]">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-950 dark:text-white">{copy.header.scope}</p>
                    <p className="text-xs font-normal text-slate-500 dark:text-slate-400">{scopeLabel}</p>
                  </div>
                </div>

                <div className="grid gap-3.5">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.create.unitLabel}</span>
                    <select
                      value={createTaskForm.unitId}
                      disabled={isSubmitting}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-[#F4C84A] focus:ring-4 focus:ring-[#F4C84A]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:text-sm"
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
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.create.businessLabel}</span>
                    <select
                      value={createTaskForm.businessId}
                      disabled={isSubmitting}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-[#F4C84A] focus:ring-4 focus:ring-[#F4C84A]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:text-sm"
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
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.create.responsibleLabel}</span>
                    <select
                      value={createTaskForm.assignedUserCompanyId || identity.user.id.toString()}
                      disabled={isSubmitting}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-[#F4C84A] focus:ring-4 focus:ring-[#F4C84A]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:text-sm"
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
              </section>

              <section className="rounded-2xl border border-[#F4C84A]/35 bg-white p-3.5 shadow-sm dark:border-[#F4C84A]/25 dark:bg-slate-950 sm:p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F4C84A] text-[#5F4003] shadow-sm">
                    <Camera className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-950 dark:text-white">{labels.createdEvidenceTitle}</p>
                    <p className="mt-1 text-xs font-normal text-slate-600 dark:text-slate-300">{labels.createdEvidenceBody}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-[#F4C84A]/55 bg-[#F4C84A]/20 px-3 py-3 text-center text-sm font-medium text-[#7A5204] transition hover:bg-[#F4C84A]/30 dark:text-[#FDE68A]">
                    <Camera className="h-5 w-5" />
                    {labels.takePhoto}
                    <input type="file" className="sr-only" accept="image/*" capture="environment" disabled={isSubmitting} onChange={handleCreateEvidenceFilesChange} />
                  </label>
                  <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    <FileUp className="h-5 w-5" />
                    {labels.chooseFile}
                    <input type="file" className="sr-only" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" disabled={isSubmitting} onChange={handleCreateEvidenceFilesChange} />
                  </label>
                </div>
                <p className="mt-2 text-center text-xs text-slate-500">{labels.evidenceHint}</p>
                {createEvidenceFiles.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {createEvidenceFiles.map((file) => (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <Paperclip className="h-4 w-4 text-[#9A6B05]" />
                        <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            </div>
            </div>

            <div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-slate-100 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-950 sm:px-5 sm:py-4">
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                disabled={!isOnline || isSubmitting}
                onClick={() => {
                  setCreateEvidenceFiles([]);
                  setIsCreateTaskModalOpen(false);
                }}
              >
                {labels.close}
              </Button>
              <Button
                type="button"
                className="h-12 rounded-xl bg-[#F4C84A] px-5 text-sm font-medium text-[#5F4003] hover:bg-[#E5B835]"
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
          <section className="flex h-[100dvh] w-full flex-col overflow-hidden border-slate-200/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950 sm:h-auto sm:max-h-[92dvh] sm:max-w-[480px] sm:rounded-[24px] sm:border">
            <div className="shrink-0 border-b border-slate-100 bg-white px-4 pb-3.5 pt-[calc(0.875rem+env(safe-area-inset-top))] text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-white sm:px-5 sm:pb-4 sm:pt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4C84A] text-[#5F4003] shadow-sm"><UserRound className="h-5 w-5" /></span>
                <p className="mt-3 text-xs font-medium text-[#9A6B05] dark:text-[#FDE68A]">{copy.responsible.eyebrow}</p>
                <h2 id="task-kiosk-responsible-title" className="mt-1 text-xl font-medium leading-tight">{copy.responsible.title}</h2>
                <p className="mt-1 text-sm font-normal text-slate-500 dark:text-slate-400">{copy.responsible.description}</p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                aria-label={copy.responsible.closeModal}
                onClick={closeResponsibleModal}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/70 px-4 py-4 dark:bg-slate-900/40 sm:px-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-[11px] font-medium text-slate-500">
                {responsibleTask.unit_name || copy.filters.unassignedUnit} / {responsibleTask.business_name || copy.filters.unassignedBusiness}
              </p>
              <h3 className="mt-2 text-lg font-medium text-slate-950 dark:text-white">{responsibleTask.title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {copy.task.due} {formatDate(responsibleTask.due_date, selectedLocale, copy.errors.noDate)}
              </p>
            </div>

            <label className="mt-5 block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.responsible.selectLabel}</span>
              <select
                value={responsibleUserCompanyId}
                disabled={!isOnline || isAssigningResponsible || responsibleCollaboratorOptions.length === 0}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-[#F4C84A] focus:ring-4 focus:ring-[#F4C84A]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:text-sm"
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
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {responsibleError}
              </div>
            ) : null}
            </div>

            <div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-slate-100 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-950 sm:px-5 sm:py-4">
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                disabled={isAssigningResponsible}
                onClick={closeResponsibleModal}
              >
                {labels.close}
              </Button>
              <Button
                type="button"
                className="h-12 rounded-xl bg-[#F4C84A] px-5 text-sm font-medium text-[#5F4003] hover:bg-[#E5B835]"
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
          <section className="flex h-[100dvh] w-full flex-col overflow-hidden border-slate-200/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950 sm:h-auto sm:max-h-[92dvh] sm:max-w-[480px] sm:rounded-[24px] sm:border">
            <div className="shrink-0 border-b border-slate-100 bg-white px-4 pb-3.5 pt-[calc(0.875rem+env(safe-area-inset-top))] text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-white sm:px-5 sm:pb-4 sm:pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F4C84A] text-[#5F4003] shadow-sm">
                    <ClipboardCheck className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#9A6B05] dark:text-[#FDE68A]">{copy.selectedTask.eyebrow}</p>
                    <h2 id="task-kiosk-completion-title" className="mt-1 break-words text-xl font-medium leading-tight">{selectedTask.title}</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                      {taskTypeLabel(selectedTask.task_type, copy)} / {selectedTask.attachments} {labels.attachments}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                  aria-label={copy.selectedTask.closeModal}
                  onClick={closeTaskCompletionModal}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/70 px-4 py-4 dark:bg-slate-900/40 sm:px-5">
              <p className="text-[10px] font-medium text-[#7A5204] dark:text-[#FDE68A]">{labels.taskDetails}</p>
              {selectedTask.description ? (
                <p className="mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">{selectedTask.description}</p>
              ) : null}

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-medium text-slate-500">
                <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  {copy.task.start} {formatDate(selectedTask.start_date, selectedLocale, copy.errors.noDate)}
                </span>
                <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  {copy.task.due} {formatDate(selectedTask.due_date, selectedLocale, copy.errors.noDate)}
                </span>
                <span className="col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  {copy.task.created} {formatDateTime(selectedTask.created_at, selectedLocale, copy.errors.noDate)}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400"><UserRound className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-slate-500">{copy.task.responsible}</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-slate-950 dark:text-white">{selectedTask.assigned_name || identity?.user.full_name}</p>
                </div>
                {openTaskStatuses.has(selectedTask.status) ? (
                  <Button type="button" variant="ghost" className="h-10 shrink-0 rounded-xl px-3 text-xs font-medium text-[#7A5204] hover:bg-[#F4C84A]/10 dark:text-[#FDE68A]" onClick={() => openResponsibleModal(selectedTask)}>
                    {copy.task.changeResponsible}
                  </Button>
                ) : null}
              </div>

              {selectedTask.can_complete && openTaskStatuses.has(selectedTask.status) ? (
                <>
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <ProgressSlider
                      value={Number(completionPercent || 100)}
                      label={copy.selectedTask.completion}
                      disabled={isSubmitting}
                      onChange={(value) => setCompletionPercent(String(value))}
                    />
                  </div>

                  <div className="mt-5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.selectedTask.evidence}</label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-[#F4C84A]/55 bg-[#F4C84A]/20 px-3 py-3 text-center text-sm font-medium text-[#7A5204] transition hover:bg-[#F4C84A]/30 dark:text-[#FDE68A]">
                        <Camera className="h-5 w-5" />
                        {labels.takePhoto}
                        <input type="file" className="sr-only" accept="image/*" capture="environment" disabled={isSubmitting} onChange={handleEvidenceFilesChange} />
                      </label>
                      <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                        <Upload className="h-5 w-5" />
                        {labels.chooseFile}
                        <input type="file" className="sr-only" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" disabled={isSubmitting} onChange={handleEvidenceFilesChange} />
                      </label>
                    </div>
                    <p className="mt-2 text-center text-xs text-slate-500">{labels.evidenceHint}</p>
                    {evidenceFiles.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {evidenceFiles.map((file) => (
                          <div
                            key={`${file.name}-${file.size}-${file.lastModified}`}
                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                          >
                            <Paperclip className="h-4 w-4 text-[#9A6B05]" />
                            <span className="min-w-0 flex-1 truncate">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.selectedTask.notes}</label>
                    <Textarea
                      value={completionNotes}
                      rows={4}
                      placeholder={copy.selectedTask.notesPlaceholder}
                      className="mt-2 rounded-xl"
                      disabled={isSubmitting}
                      onChange={(event) => setCompletionNotes(event.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {copy.task.resolved}
                </div>
              )}
            </div>

            <div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-slate-100 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-950 sm:px-5 sm:py-4">
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                disabled={isSubmitting}
                onClick={closeTaskCompletionModal}
              >
                {labels.close}
              </Button>
              {selectedTask.can_complete && openTaskStatuses.has(selectedTask.status) ? (
                <Button
                  type="button"
                  className="h-12 rounded-xl bg-[#F4C84A] px-5 text-sm font-medium text-[#5F4003] hover:bg-[#E5B835]"
                  disabled={!isOnline || isSubmitting}
                  onClick={() => void handleCompleteTask()}
                >
                  <ClipboardCheck className="mr-2 h-5 w-5" />
                  {isUploadingEvidence ? copy.selectedTask.uploadingEvidence : copy.selectedTask.complete}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-12 rounded-xl bg-slate-100 px-5 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200"
                  onClick={closeTaskCompletionModal}
                >
                  <ImageIcon className="mr-2 h-5 w-5" />
                  {labels.close}
                </Button>
              )}
            </div>
          </section>
        </div>
      ) : null}

    </>
  );
}
