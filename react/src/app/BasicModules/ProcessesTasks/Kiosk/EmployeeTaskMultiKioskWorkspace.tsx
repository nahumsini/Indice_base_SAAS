import {
  CheckCircle2,
  Filter,
  ListChecks,
  ListPlus,
  LoaderCircle,
  ShieldAlert,
} from 'lucide-react';
import { KioskWorkspaceTabs } from '../../../components/kiosk-engine/KioskWorkspacePrimitives';
import { Button } from '../../../components/ui/button';
import {
  multiKioskPublicApi,
  type MultiKioskChildWorkspace,
} from '../../../api/multiKiosks';
import type { PeriodFilter } from '../Agenda/types';
import {
  EmployeeTaskMultiKioskCreateDialog,
} from './components/EmployeeTaskMultiKioskCreateDialog';
import {
  EmployeeTaskMultiKioskTaskDialog,
} from './components/EmployeeTaskMultiKioskTaskDialog';
import {
  PublicTaskKioskEmptyState,
  PublicTaskKioskFiltersSheet,
  PublicTaskKioskIdentityCard,
  PublicTaskKioskSummaryStrip,
  PublicTaskKioskTaskCard,
  TaskKioskFilterField,
  TaskKioskFilterSelect,
} from './components/PublicTaskKioskWorkspaceSections';
import type { PublicTaskKioskTask } from './processTaskKioskApi';
import {
  employeeTaskAllFilterValue,
  employeeTaskCapabilities,
  useEmployeeTaskMultiKioskWorkspace,
  type EmployeeTaskMultiKioskAction,
  type EmployeeTaskTab,
} from './hooks/useEmployeeTaskMultiKioskWorkspace';
import {
  employeeInitials,
  employeeTaskTypeLabel,
  formatEmployeeTaskDate,
  multiKioskCsrfFor,
} from './employeeTaskMultiKioskWorkspaceUtils';
import {
  getTaskKioskTranslations,
  resolveTaskKioskLocale,
} from './translations';

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
  const bootstrapTasks = workspace.bootstrap?.tasks ?? emptyTasks;
  const granted = workspace.session.capabilities;
  const employee = workspace.bootstrap?.user;
  const canRead = granted.includes(employeeTaskCapabilities.read);
  const canCreate = Boolean(employee) && granted.includes(employeeTaskCapabilities.create);
  const canComplete = granted.includes(employeeTaskCapabilities.complete);
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
    setPeriodFilter,
    setSelectedTaskId,
    successMessage,
    tasks,
    unitFilter,
    unitOptions,
    updateCreateDraft,
    visibleTasks,
  } = state;
  const periodLabel = {
    all: copy.workspace.allPeriod,
    today: copy.workspace.today,
    tomorrow: copy.workspace.tomorrow,
    yesterday: copy.workspace.yesterday,
    week: copy.workspace.week,
    month: copy.workspace.month,
    custom: copy.workspace.allPeriod,
  }[periodFilter];
  const scopeLabel = workspace.bootstrap?.scope_label ?? card.purpose;
  if (!canRead) {
    return (
      <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
        <ShieldAlert aria-hidden="true" className="h-6 w-6" />
        <p className="mt-3 font-medium">{copy.errors.loadFailure}</p>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {errorMessage ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">{errorMessage}</p> : null}
      {successMessage ? <p aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">{successMessage}</p> : null}

      <KioskWorkspaceTabs<EmployeeTaskTab>
        activeBackgroundColor="#F4C84A"
        activeTextClassName="text-[#5F4003]"
        activeValue={activeTab}
        ariaLabel={card.name}
        items={[
          { badge: openTasks.length, icon: <ListChecks className="h-4 w-4" />, label: copy.tabs.open(openTasks.length).replace(/\s*\([^)]*\)\s*$/, ''), value: 'open' },
          { badge: resolvedTasks.length, icon: <CheckCircle2 className="h-4 w-4" />, label: copy.tabs.resolved(resolvedTasks.length).replace(/\s*\([^)]*\)\s*$/, ''), value: 'resolved' },
        ]}
        onChange={setActiveTab}
        tone="yellow"
      />
      {employee ? (
        <PublicTaskKioskIdentityCard
          detail={employee.position_title || employee.department || employee.user_code || copy.identity.fallbackStatus}
          initials={employeeInitials(employee.full_name)}
          name={employee.full_name}
          onReset={() => void handleRefresh()}
          resetLabel={busy === 'refresh' ? copy.loading.title : copy.identity.refresh}
          scopeLabel={scopeLabel}
          verifiedLabel={copy.identity.eyebrow}
        />
      ) : null}
      <PublicTaskKioskSummaryStrip
        openLabel={copy.sidebar.openTasks}
        openValue={openTasks.length}
        overdueLabel={copy.task.overdue}
        overdueValue={openTasks.filter(task => task.is_overdue).length}
        resolvedLabel={copy.tabs.resolved(resolvedTasks.length).replace(/[()0-9]/g, '').trim()}
        resolvedValue={resolvedTasks.length}
      />
      <section className={canCreate
        ? 'grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm min-[360px]:grid-cols-2 dark:border-slate-800 dark:bg-slate-950'
        : 'rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950'}
      >
        {canCreate ? (
          <Button
            aria-haspopup="dialog"
            type="button"
            className="h-12 justify-start gap-3 rounded-xl bg-[#F4C84A] px-3 text-left text-[#5F4003] hover:bg-[#E5B72F]"
            disabled={Boolean(busy)}
            onClick={handleOpenCreate}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/70 text-[#5F4003]">
              <ListPlus aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="truncate text-sm font-medium">{copy.actions.createTask}</span>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="h-12 w-full justify-start gap-3 rounded-xl bg-[#F4C84A]/12 px-3 text-left text-[#7A5204] hover:bg-[#F4C84A]/20 dark:text-[#FDE68A]"
          disabled={busy === 'create'}
          onClick={() => setFiltersOpen(true)}
        >
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F4C84A] text-[#5F4003]">
            <Filter aria-hidden="true" className="h-4 w-4" />
            {activeFilterCount > 0 ? <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-950 px-1 text-[9px] text-white dark:bg-white dark:text-slate-950">{activeFilterCount}</span> : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium">{copy.workspace.filters}</span>
            <span className="block truncate text-sm text-slate-700 dark:text-slate-200">{periodLabel}</span>
          </span>
          {busy === 'refresh' ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
        </Button>
      </section>
      {tasks.length === 0 ? (
        <PublicTaskKioskEmptyState title={copy.empty.title} body={copy.empty.body} />
      ) : visibleTasks.length === 0 ? (
        <PublicTaskKioskEmptyState
          icon={<ListChecks className="h-7 w-7" />}
          title={activeTab === 'open' ? copy.empty.filteredTitle : copy.empty.resolvedTitle}
          body={activeTab === 'open' ? copy.empty.filteredBody : copy.empty.resolvedBody}
        />
      ) : (
        <div className="grid gap-3">
          {visibleTasks.map(task => (
            <PublicTaskKioskTaskCard
              attachmentsLabel={copy.workspace.attachments}
              copy={copy}
              dueLabel={copy.task.due}
              formattedDueDate={formatEmployeeTaskDate(task.due_date, selectedLocale, copy.errors.noDate)}
              key={task.id}
              onOpen={() => handleOpenTask(task)}
              task={task}
              taskType={employeeTaskTypeLabel(task, copy)}
              viewLabel={copy.workspace.view}
            />
          ))}
        </div>
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
          <TaskKioskFilterField label={copy.workspace.period}>
            <TaskKioskFilterSelect value={periodFilter} onChange={value => setPeriodFilter(value as PeriodFilter)}>
              <option value="all">{copy.workspace.allPeriod}</option>
              <option value="today">{copy.workspace.today}</option>
              <option value="tomorrow">{copy.workspace.tomorrow}</option>
              <option value="yesterday">{copy.workspace.yesterday}</option>
              <option value="week">{copy.workspace.week}</option>
              <option value="month">{copy.workspace.month}</option>
            </TaskKioskFilterSelect>
          </TaskKioskFilterField>
          <TaskKioskFilterField label={copy.filters.unit}>
            <TaskKioskFilterSelect value={unitFilter} onChange={changeUnitFilter}>
              <option value={employeeTaskAllFilterValue}>{copy.filters.allUnits}</option>
              {unitOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </TaskKioskFilterSelect>
          </TaskKioskFilterField>
          <TaskKioskFilterField label={copy.filters.business}>
            <TaskKioskFilterSelect value={businessFilter} onChange={setBusinessFilter}>
              <option value={employeeTaskAllFilterValue}>{copy.filters.allBusinesses}</option>
              {businessOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </TaskKioskFilterSelect>
          </TaskKioskFilterField>
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
        busy={busy === 'complete'}
        canComplete={canComplete}
        completionNotes={completionNotes}
        completionPercent={completionPercent}
        copy={copy}
        errorMessage={dialogError}
        locale={selectedLocale}
        onClose={() => setSelectedTaskId(null)}
        onComplete={handleComplete}
        onCompletionNotesChange={setCompletionNotes}
        onCompletionPercentChange={setCompletionPercent}
        task={selectedTask}
      />
    </div>
  );
}

export function EmployeeTaskMultiKioskWorkspace({
  kioskId,
  locale,
  onAuthorizationFailure,
  onRefresh,
  token,
  workspace,
}: EmployeeTaskMultiKioskWorkspaceProps) {
  const handleAction: EmployeeTaskMultiKioskAction = async <T,>(capability: string, payload: Record<string, unknown>) => (
    multiKioskPublicApi.action<T>(token, kioskId, capability, payload, multiKioskCsrfFor(token))
  );

  return (
    <EmployeeTaskMultiKioskWorkspaceView
      card={workspace.kiosk}
      locale={locale}
      onAction={handleAction}
      onAuthorizationFailure={onAuthorizationFailure}
      onRefresh={onRefresh}
      workspace={workspace}
    />
  );
}
