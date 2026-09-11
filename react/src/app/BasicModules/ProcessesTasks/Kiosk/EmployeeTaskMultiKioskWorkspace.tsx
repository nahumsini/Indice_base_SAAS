import { useEffect, useRef, useState } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { multiKioskMobileSession, multiKioskPublicApi, type MultiKioskChildWorkspace } from '../../../api/multiKiosks';
import {
  KioskToolWorkspaceFrame,
  KioskWorkspaceContextBar,
  KioskWorkspaceNotice,
} from '../../../components/kiosk-engine/KioskToolWorkspace';
import { EmployeeTaskAgendaList, EmployeeTaskAgendaBoard, EmployeeTaskAgendaToolbar } from './components/EmployeeTaskAgendaWorkspace';
import { EmployeeTaskMultiKioskCreateDialog } from './components/EmployeeTaskMultiKioskCreateDialog';
import { EmployeeTaskMultiKioskTaskDialog } from './components/EmployeeTaskMultiKioskTaskDialog';
import { EmployeeTaskOccasionalProcessDialog } from './components/EmployeeTaskOccasionalProcessDialog';
import { EmployeeTaskScheduleDialog } from './components/EmployeeTaskScheduleDialog';
import { EmployeeTaskScheduleView } from './components/EmployeeTaskScheduleView';
import {
  PublicTaskKioskFiltersSheet,
  PublicTaskKioskSummaryStrip,
  TaskKioskFilterField,
  TaskKioskFilterSelect,
} from './components/PublicTaskKioskWorkspaceSections';
import { getEmployeeTaskAgendaCopy } from './employeeTaskAgendaTranslations';
import { employeeInitials, multiKioskCsrfFor } from './employeeTaskMultiKioskWorkspaceUtils';
import {
  employeeTaskAllFilterValue,
  employeeTaskCapabilities,
  useEmployeeTaskMultiKioskWorkspace,
  type EmployeeTaskDateRange,
  type EmployeeTaskMultiKioskAction,
  type EmployeeTaskStatusFilter,
} from './hooks/useEmployeeTaskMultiKioskWorkspace';
import { useEmployeeTaskKioskEnhancements } from './hooks/useEmployeeTaskKioskEnhancements';
import type { PublicTaskKioskTask } from './processTaskKioskApi';
import { getTaskKioskTranslations, resolveTaskKioskLocale } from './translations';

const emptyTasks: PublicTaskKioskTask[] = [];

export type MultiKioskWorkspaceCard = MultiKioskChildWorkspace['kiosk'];
export type { EmployeeTaskMultiKioskAction } from './hooks/useEmployeeTaskMultiKioskWorkspace';

export interface EmployeeTaskMultiKioskWorkspaceViewProps {
  card: MultiKioskWorkspaceCard;
  locale: string;
  onAction: EmployeeTaskMultiKioskAction;
  onAuthorizationFailure?: (error: unknown) => boolean;
  onRefresh: () => Promise<void>;
  workspace: MultiKioskChildWorkspace;
}

interface EmployeeTaskMultiKioskWorkspaceProps {
  kioskId: number;
  locale: string;
  onAuthorizationFailure: (error: unknown) => boolean;
  onRefresh: () => Promise<void>;
  token: string;
  workspace: MultiKioskChildWorkspace;
}

export function EmployeeTaskMultiKioskWorkspaceView({
  card,
  locale,
  onAction,
  onAuthorizationFailure = () => false,
  onRefresh,
  workspace,
}: EmployeeTaskMultiKioskWorkspaceViewProps) {
  const selectedLocale = resolveTaskKioskLocale(locale);
  const copy = getTaskKioskTranslations(selectedLocale);
  const agendaCopy = getEmployeeTaskAgendaCopy(selectedLocale);
  const bootstrapTasks = workspace.bootstrap?.tasks ?? emptyTasks;
  const granted = workspace.session.capabilities;
  const employee = workspace.bootstrap?.user;
  const canRead = granted.includes(employeeTaskCapabilities.read);
  const canCreate = Boolean(employee) && granted.includes(employeeTaskCapabilities.create);
  const canComplete = granted.includes(employeeTaskCapabilities.complete);
  const canReschedule = granted.includes(employeeTaskCapabilities.agendaUpdate);
  const canPreviewProcess = granted.includes(employeeTaskCapabilities.occasionalPreview);
  const canCreateProcess = granted.includes(employeeTaskCapabilities.occasionalCreate);
  const canStartProcess = Boolean(employee)
    && granted.includes(employeeTaskCapabilities.occasionalRead)
    && canPreviewProcess
    && canCreateProcess;
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [processSuccessMessage, setProcessSuccessMessage] = useState('');
  const state = useEmployeeTaskMultiKioskWorkspace({
    bootstrapTasks,
    canComplete,
    canCreate,
    copy,
    onAction,
    onAuthorizationFailure,
    onRefresh,
    sessionId: workspace.session.id,
  });
  const {
    activeFilterCount, businessFilter, businessOptions, busy, changeUnitFilter, clearFilters,
    completionNotes, completionPercent, createDraft, createError, createOpen, dateRange, dialogError,
    errorMessage, filtersOpen, focusCounts, focusFilter, handleComplete, handleCloseCreate, handleCreate,
    handleOpenCreate, handleOpenTask, handleRefresh, moveDate, openTasks, originFilter, originOptions,
    overdueTasks, replaceTasks, resolvedTasks, searchQuery, selectedDate, selectedTask, setBusinessFilter,
    setCompletionNotes, setCompletionPercent, setDateRange, setFiltersOpen, setFocusFilter,
    setOriginFilter, setSearchQuery, setSelectedDate, setSelectedTaskId, setStatusFilter, setViewMode,
    showToday, showTomorrow, showWeek, statusFilter, successMessage, tasks, unitFilter, unitOptions,
    updateCreateDraft, viewMode, visibleTasks,
  } = state;
  const enhancements = useEmployeeTaskKioskEnhancements({
    agendaCopy,
    canReschedule,
    copy,
    onAction,
    onAuthorizationFailure,
    onItems: replaceTasks,
  });
  const scopeLabel = workspace.bootstrap?.scope_label ?? card.purpose;
  const occasionalProcesses = workspace.bootstrap?.occasional_processes?.items ?? [];

  if (!canRead) {
    return (
      <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
        <ShieldAlert aria-hidden="true" className="h-6 w-6" />
        <p className="mt-3 font-medium">{copy.errors.loadFailure}</p>
      </section>
    );
  }

  return (
    <KioskToolWorkspaceFrame>
      {errorMessage ? <KioskWorkspaceNotice kind="error">{errorMessage}</KioskWorkspaceNotice> : null}
      {successMessage ? <KioskWorkspaceNotice kind="success">{successMessage}</KioskWorkspaceNotice> : null}
      {enhancements.successMessage ? <KioskWorkspaceNotice kind="success">{enhancements.successMessage}</KioskWorkspaceNotice> : null}
      {processSuccessMessage ? <KioskWorkspaceNotice kind="success">{processSuccessMessage}</KioskWorkspaceNotice> : null}

      {employee ? (
        <KioskWorkspaceContextBar
          action={(
            <button
              aria-label={busy === 'refresh' ? copy.loading.title : copy.identity.refresh}
              className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#F4C84A] hover:bg-[#F4C84A]/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F4C84A]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              onClick={() => void handleRefresh()}
              type="button"
            >
              <RefreshCw aria-hidden="true" className={`h-4 w-4 ${busy === 'refresh' ? 'animate-spin' : ''}`} />
            </button>
          )}
          density="compact"
          description={employee.position_title || employee.department || employee.user_code || copy.identity.fallbackStatus}
          eyebrow={copy.identity.eyebrow}
          icon={employeeInitials(employee.full_name)}
          meta={<p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{scopeLabel}</p>}
          title={employee.full_name}
          tone="yellow"
        />
      ) : null}

      <PublicTaskKioskSummaryStrip
        compact
        openLabel={copy.sidebar.openTasks}
        openValue={openTasks.length}
        overdueLabel={copy.task.overdue}
        overdueValue={overdueTasks.length}
        resolvedLabel={agendaCopy.completed}
        resolvedValue={resolvedTasks.length}
      />

      <EmployeeTaskAgendaToolbar
        activeFilterCount={activeFilterCount}
        busy={Boolean(busy)}
        canCreate={canCreate}
        canStartProcess={canStartProcess}
        copy={agendaCopy}
        dateRange={dateRange}
        focusCounts={focusCounts}
        focusFilter={focusFilter}
        locale={selectedLocale}
        onCreate={handleOpenCreate}
        onFocusChange={setFocusFilter}
        onMoveDate={moveDate}
        onOpenFilters={() => setFiltersOpen(true)}
        onStartProcess={() => {
          setProcessSuccessMessage('');
          setProcessDialogOpen(true);
        }}
        onSearchChange={setSearchQuery}
        onShowToday={showToday}
        onShowTomorrow={showTomorrow}
        onShowWeek={showWeek}
        onViewChange={(nextView) => {
          setViewMode(nextView);
          if (nextView === 'schedule') setDateRange('day');
        }}
        searchQuery={searchQuery}
        selectedDate={selectedDate}
        statusFilter={statusFilter}
        taskCopy={copy}
        viewMode={viewMode}
      />

      {tasks.length === 0 ? (
        <EmployeeTaskAgendaList copy={agendaCopy} emptyBody={copy.empty.body} emptyTitle={copy.empty.title} locale={selectedLocale} onOpen={handleOpenTask} referenceDate={selectedDate} taskCopy={copy} tasks={[]} />
      ) : viewMode === 'board' ? (
        <EmployeeTaskAgendaBoard copy={agendaCopy} locale={selectedLocale} onOpen={handleOpenTask} referenceDate={selectedDate} taskCopy={copy} tasks={visibleTasks} />
      ) : viewMode === 'schedule' ? (
        <EmployeeTaskScheduleView
          canReschedule={canReschedule}
          copy={agendaCopy}
          locale={selectedLocale}
          onOpen={handleOpenTask}
          onSchedule={enhancements.openSchedule}
          referenceDate={selectedDate}
          taskCopy={copy}
          tasks={visibleTasks}
        />
      ) : (
        <EmployeeTaskAgendaList copy={agendaCopy} emptyBody={copy.empty.filteredBody} emptyTitle={copy.empty.filteredTitle} locale={selectedLocale} onOpen={handleOpenTask} referenceDate={selectedDate} taskCopy={copy} tasks={visibleTasks} />
      )}

      <PublicTaskKioskFiltersSheet
        applyLabel={copy.workspace.applyFilters}
        clearLabel={copy.workspace.clearFilters}
        description={copy.workspace.filtersDescription}
        isOpen={filtersOpen}
        onClear={clearFilters}
        onClose={() => setFiltersOpen(false)}
        title={copy.workspace.filters}
      >
        <div className="grid gap-4">
          <TaskKioskFilterField label={agendaCopy.openWork}>
            <TaskKioskFilterSelect value={statusFilter} onChange={value => setStatusFilter(value as EmployeeTaskStatusFilter)}>
              <option value="pending_overdue">{agendaCopy.openWork}</option>
              <option value="overdue">{agendaCopy.overdueGroup}</option>
              <option value="pending">{agendaCopy.pending}</option>
              <option value="in_progress">{agendaCopy.inProgress}</option>
              <option value="paused">{agendaCopy.paused}</option>
              <option value="completed">{agendaCopy.completed}</option>
            </TaskKioskFilterSelect>
          </TaskKioskFilterField>
          <TaskKioskFilterField label={copy.workspace.period}>
            <TaskKioskFilterSelect value={dateRange} onChange={value => setDateRange(value as EmployeeTaskDateRange)}>
              <option value="day">{agendaCopy.day}</option>
              <option value="week">{copy.workspace.week}</option>
              <option value="month">{copy.workspace.month}</option>
              <option value="all">{agendaCopy.allDates}</option>
            </TaskKioskFilterSelect>
          </TaskKioskFilterField>
          {dateRange !== 'all' ? (
            <TaskKioskFilterField label={agendaCopy.date}>
              <input type="date" value={selectedDate} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#F4C84A] focus:ring-4 focus:ring-[#F4C84A]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={event => setSelectedDate(event.target.value)} />
            </TaskKioskFilterField>
          ) : null}
          {originOptions.length ? (
            <TaskKioskFilterField label={agendaCopy.origin}>
              <TaskKioskFilterSelect value={originFilter} onChange={setOriginFilter}>
                <option value={employeeTaskAllFilterValue}>{agendaCopy.allOrigins}</option>
                {originOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </TaskKioskFilterSelect>
            </TaskKioskFilterField>
          ) : null}
          {unitOptions.length > 1 ? (
            <TaskKioskFilterField label={copy.filters.unit}>
              <TaskKioskFilterSelect value={unitFilter} onChange={changeUnitFilter}>
                <option value={employeeTaskAllFilterValue}>{copy.filters.allUnits}</option>
                {unitOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </TaskKioskFilterSelect>
            </TaskKioskFilterField>
          ) : null}
          {businessOptions.length > 1 ? (
            <TaskKioskFilterField label={copy.filters.business}>
              <TaskKioskFilterSelect value={businessFilter} onChange={setBusinessFilter}>
                <option value={employeeTaskAllFilterValue}>{copy.filters.allBusinesses}</option>
                {businessOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </TaskKioskFilterSelect>
            </TaskKioskFilterField>
          ) : null}
        </div>
      </PublicTaskKioskFiltersSheet>

      {employee ? (
        <EmployeeTaskMultiKioskCreateDialog
          busy={busy === 'create'}
          copy={copy}
          draft={createDraft}
          employeeName={employee.full_name}
          errorMessage={createError}
          onChange={updateCreateDraft}
          onClose={handleCloseCreate}
          onSubmit={handleCreate}
          open={createOpen}
          scopeLabel={scopeLabel}
        />
      ) : null}
      <EmployeeTaskMultiKioskTaskDialog
        agendaCopy={agendaCopy}
        busy={busy === 'complete'}
        canComplete={canComplete}
        canReschedule={canReschedule}
        completionNotes={completionNotes}
        completionPercent={completionPercent}
        copy={copy}
        errorMessage={dialogError || enhancements.evidenceError}
        evidenceBusy={enhancements.evidenceTaskId === selectedTask?.id}
        locale={selectedLocale}
        onClose={() => {
          setSelectedTaskId(null);
          enhancements.clearEvidenceError();
        }}
        onComplete={handleComplete}
        onCompletionNotesChange={setCompletionNotes}
        onCompletionPercentChange={setCompletionPercent}
        onEvidenceFiles={(task, files) => void enhancements.uploadEvidence(task, files)}
        onOpenSchedule={(task) => {
          setSelectedTaskId(null);
          enhancements.openSchedule(task);
        }}
        task={selectedTask}
      />
      <EmployeeTaskScheduleDialog
        busy={enhancements.scheduleBusy}
        copy={agendaCopy}
        draft={enhancements.scheduleDraft}
        errorMessage={enhancements.scheduleError}
        onChange={enhancements.setScheduleDraft}
        onClose={enhancements.closeSchedule}
        onRemove={() => void enhancements.removeSchedule()}
        onSave={() => void enhancements.saveSchedule()}
        task={enhancements.scheduleTask}
      />
      <EmployeeTaskOccasionalProcessDialog
        canCreate={canCreateProcess}
        canPreview={canPreviewProcess}
        copy={agendaCopy}
        onAction={onAction}
        onAuthorizationFailure={onAuthorizationFailure}
        onCreated={(items, message) => {
          replaceTasks(items);
          setProcessSuccessMessage(message);
          setFocusFilter('mine');
          setStatusFilter('pending_overdue');
          setViewMode('agenda');
          showToday();
        }}
        onOpenChange={setProcessDialogOpen}
        open={processDialogOpen}
        options={occasionalProcesses}
      />
    </KioskToolWorkspaceFrame>
  );
}

export function EmployeeTaskMultiKioskWorkspace({ kioskId, locale, onAuthorizationFailure, onRefresh, token, workspace }: EmployeeTaskMultiKioskWorkspaceProps) {
  const evidenceSessionRenewalAttempted = useRef(false);
  const evidenceCapabilitiesReady = workspace.session.capabilities.includes(employeeTaskCapabilities.attachmentPresign)
    && workspace.session.capabilities.includes(employeeTaskCapabilities.attachmentRegister);

  useEffect(() => {
    if (evidenceCapabilitiesReady || evidenceSessionRenewalAttempted.current) return;
    evidenceSessionRenewalAttempted.current = true;
    let cancelled = false;
    multiKioskMobileSession.childClear(token, kioskId);
    void multiKioskPublicApi.launch(token, kioskId, multiKioskCsrfFor(token))
      .then(() => (cancelled ? undefined : onRefresh()))
      .catch((error: unknown) => {
        if (!cancelled) onAuthorizationFailure(error);
      });
    return () => { cancelled = true; };
  }, [evidenceCapabilitiesReady, kioskId, onAuthorizationFailure, onRefresh, token]);

  const handleAction: EmployeeTaskMultiKioskAction = async <T,>(capability: string, payload: Record<string, unknown>) => (
    multiKioskPublicApi.action<T>(token, kioskId, capability, payload, multiKioskCsrfFor(token))
  );
  return <EmployeeTaskMultiKioskWorkspaceView card={workspace.kiosk} locale={locale} onAction={handleAction} onAuthorizationFailure={onAuthorizationFailure} onRefresh={onRefresh} workspace={workspace} />;
}
