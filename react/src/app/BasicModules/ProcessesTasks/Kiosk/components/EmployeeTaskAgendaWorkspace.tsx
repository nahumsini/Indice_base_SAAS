import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  KanbanSquare,
  ListChecks,
  ListPlus,
  Search,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { AgendaFocusFilter } from '../../Agenda/types';
import type { EmployeeTaskAgendaCopy } from '../employeeTaskAgendaTranslations';
import { employeeTaskTypeLabel, formatEmployeeTaskDate } from '../employeeTaskMultiKioskWorkspaceUtils';
import type {
  EmployeeTaskAgendaView,
  EmployeeTaskDateRange,
  EmployeeTaskStatusFilter,
} from '../hooks/useEmployeeTaskMultiKioskWorkspace';
import type { PublicTaskKioskTask } from '../processTaskKioskApi';
import { getKioskTaskAgendaStatus } from '../taskKioskFilterEngine';
import type { TaskKioskLocale, TaskKioskTranslations } from '../translations';
import { PublicTaskKioskEmptyState, PublicTaskKioskTaskCard } from './PublicTaskKioskWorkspaceSections';

function dateAtNoon(value: string) {
  return new Date(`${value}T12:00:00`);
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateTitle(value: string, range: EmployeeTaskDateRange, locale: TaskKioskLocale, allDates: string) {
  if (range === 'all') return allDates;
  const start = dateAtNoon(value);
  if (range === 'week') {
    const day = start.getDay();
    start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`;
  }
  return start.toLocaleDateString(locale, range === 'month'
    ? { month: 'long', year: 'numeric' }
    : { weekday: 'short', day: 'numeric', month: 'short' });
}

function taskDate(task: PublicTaskKioskTask) {
  if (task.status === 'completed') return task.completed_at?.slice(0, 10) ?? task.agenda_date ?? task.due_date;
  return task.agenda_date ?? task.due_date ?? task.start_date;
}

function scheduleLabel(task: PublicTaskKioskTask) {
  const start = task.agenda_start_time?.slice(0, 5);
  const end = task.agenda_end_time?.slice(0, 5);
  if (!start) return undefined;
  return end ? `${start}–${end}` : start;
}

function statusPresentation(task: PublicTaskKioskTask, referenceDate: string, copy: EmployeeTaskAgendaCopy) {
  const status = getKioskTaskAgendaStatus(task, referenceDate) ?? task.status;
  if (status === 'completed') return { label: copy.completed, tone: 'success' as const };
  if (status === 'overdue' || task.is_overdue) return { label: copy.overdueGroup, tone: 'danger' as const };
  if (status === 'in_progress') return { label: copy.inProgress, tone: 'info' as const };
  if (status === 'paused') return { label: copy.paused, tone: 'warning' as const };
  return { label: copy.pending, tone: 'neutral' as const };
}

export function EmployeeTaskAgendaToolbar({
  activeFilterCount,
  busy,
  canCreate,
  copy,
  dateRange,
  focusCounts,
  focusFilter,
  locale,
  onCreate,
  onFocusChange,
  onMoveDate,
  onOpenFilters,
  onSearchChange,
  onShowToday,
  onShowTomorrow,
  onShowWeek,
  onViewChange,
  searchQuery,
  selectedDate,
  statusFilter,
  taskCopy,
  viewMode,
}: {
  activeFilterCount: number;
  busy: boolean;
  canCreate: boolean;
  copy: EmployeeTaskAgendaCopy;
  dateRange: EmployeeTaskDateRange;
  focusCounts: Record<AgendaFocusFilter, number>;
  focusFilter: AgendaFocusFilter;
  locale: TaskKioskLocale;
  onCreate: () => void;
  onFocusChange: (value: AgendaFocusFilter) => void;
  onMoveDate: (direction: -1 | 1) => void;
  onOpenFilters: () => void;
  onSearchChange: (value: string) => void;
  onShowToday: () => void;
  onShowTomorrow: () => void;
  onShowWeek: () => void;
  onViewChange: (value: EmployeeTaskAgendaView) => void;
  searchQuery: string;
  selectedDate: string;
  statusFilter: EmployeeTaskStatusFilter;
  taskCopy: TaskKioskTranslations;
  viewMode: EmployeeTaskAgendaView;
}) {
  const focusItems: Array<{ label: string; value: AgendaFocusFilter }> = [
    { label: taskCopy.workspace.mine, value: 'mine' },
    { label: taskCopy.workspace.delegated, value: 'delegated' },
    { label: copy.allVisible, value: 'team' },
  ];
  const dateTitle = formatDateTitle(selectedDate, dateRange, locale, copy.allDates);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950" data-task-kiosk-toolbar>
      <header className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <div className="min-w-0">
          <h2 className="text-base font-medium text-slate-950 dark:text-white">{copy.title}</h2>
          <p className="mt-0.5 hidden truncate text-xs text-slate-500 min-[390px]:block dark:text-slate-400">{copy.subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-900" aria-label={`${copy.agenda} / ${copy.board}`} role="group">
          <button type="button" aria-pressed={viewMode === 'agenda'} className={`flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition ${viewMode === 'agenda' ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`} onClick={() => onViewChange('agenda')}>
            <CalendarDays aria-hidden="true" className="h-4 w-4" /><span className="hidden min-[360px]:inline">{copy.agenda}</span>
          </button>
          <button type="button" aria-pressed={viewMode === 'board'} disabled={statusFilter === 'completed'} className={`flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition disabled:opacity-40 ${viewMode === 'board' ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`} onClick={() => onViewChange('board')}>
            <KanbanSquare aria-hidden="true" className="h-4 w-4" /><span className="hidden min-[360px]:inline">{copy.board}</span>
          </button>
        </div>
      </header>

      <div className="border-t border-slate-100 px-2 py-2 dark:border-slate-800">
        <p className="sr-only">{taskCopy.workspace.focus}</p>
        <div className="grid grid-cols-3 gap-1" role="tablist" aria-label={taskCopy.workspace.focus}>
          {focusItems.map(item => (
            <button key={item.value} type="button" role="tab" aria-selected={focusFilter === item.value} className={`flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl px-1.5 text-center text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F4C84A]/25 ${focusFilter === item.value ? 'bg-[#F4C84A] text-[#5F4003]' : 'text-slate-600 hover:bg-[#F4C84A]/12 dark:text-slate-300'}`} onClick={() => onFocusChange(item.value)}>
              <span className="truncate">{item.label}</span><span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] ${focusFilter === item.value ? 'bg-white/65' : 'bg-slate-100 dark:bg-slate-800'}`}>{focusCounts[item.value]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 p-2 dark:border-slate-800">
        <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-1.5">
          <button type="button" aria-label={copy.previousDate} disabled={dateRange === 'all'} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-35 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => onMoveDate(-1)}><ChevronLeft aria-hidden="true" className="h-5 w-5" /></button>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-medium capitalize text-slate-950 dark:text-white">{dateTitle}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{copy.results(focusCounts[focusFilter])}</p>
          </div>
          <button type="button" aria-label={copy.nextDate} disabled={dateRange === 'all'} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-35 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => onMoveDate(1)}><ChevronRight aria-hidden="true" className="h-5 w-5" /></button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <button type="button" className="min-h-11 rounded-xl bg-[#F4C84A]/14 px-2 text-xs font-medium text-[#7A5204] hover:bg-[#F4C84A]/22 dark:text-[#FDE68A]" onClick={onShowToday}>{taskCopy.workspace.today}</button>
          <button type="button" className="min-h-11 rounded-xl bg-slate-50 px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300" onClick={onShowTomorrow}>{taskCopy.workspace.tomorrow}</button>
          <button type="button" className="min-h-11 rounded-xl bg-slate-50 px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300" onClick={onShowWeek}>{taskCopy.workspace.week}</button>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_44px] gap-2 border-t border-slate-100 p-2 dark:border-slate-800 min-[520px]:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="relative min-w-0">
          <span className="sr-only">{copy.search}</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={searchQuery} placeholder={copy.searchPlaceholder} className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#F4C84A] focus:ring-4 focus:ring-[#F4C84A]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={event => onSearchChange(event.target.value)} />
        </label>
        <Button type="button" variant="outline" aria-label={taskCopy.workspace.filters} className="relative h-11 w-11 rounded-xl border-slate-200 p-0 dark:border-slate-700" onClick={onOpenFilters}>
          <Filter aria-hidden="true" className="h-4 w-4" />
          {activeFilterCount > 0 ? <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-950 px-1 text-[9px] text-white dark:bg-white dark:text-slate-950">{activeFilterCount}</span> : null}
        </Button>
        {canCreate ? <Button type="button" disabled={busy} className="col-span-2 h-11 gap-2 rounded-xl bg-[#F4C84A] text-[#5F4003] hover:bg-[#E5B72F] min-[520px]:col-span-1" onClick={onCreate}><ListPlus aria-hidden="true" className="h-4 w-4" />{taskCopy.actions.createTask}</Button> : null}
      </div>
    </section>
  );
}

function AgendaTaskCard({ copy, locale, onOpen, referenceDate, task, taskCopy }: {
  copy: EmployeeTaskAgendaCopy;
  locale: TaskKioskLocale;
  onOpen: () => void;
  referenceDate: string;
  task: PublicTaskKioskTask;
  taskCopy: TaskKioskTranslations;
}) {
  const status = statusPresentation(task, referenceDate, copy);
  return (
    <PublicTaskKioskTaskCard
      attachmentsLabel={taskCopy.workspace.attachments}
      copy={taskCopy}
      dueLabel={taskCopy.task.due}
      formattedDueDate={formatEmployeeTaskDate(task.due_date, locale, taskCopy.errors.noDate)}
      onOpen={onOpen}
      scheduleLabel={scheduleLabel(task)}
      statusLabelOverride={status.label}
      statusTone={status.tone}
      task={task}
      taskType={employeeTaskTypeLabel(task, taskCopy)}
      viewLabel={taskCopy.workspace.view}
    />
  );
}

export function EmployeeTaskAgendaList({ copy, emptyBody, emptyTitle, locale, onOpen, referenceDate, taskCopy, tasks }: {
  copy: EmployeeTaskAgendaCopy;
  emptyBody: string;
  emptyTitle: string;
  locale: TaskKioskLocale;
  onOpen: (task: PublicTaskKioskTask) => void;
  referenceDate: string;
  taskCopy: TaskKioskTranslations;
  tasks: PublicTaskKioskTask[];
}) {
  const overdue = tasks.filter(task => task.status === 'pending' && (task.is_overdue || Boolean(task.due_date && task.due_date < todayKey())));
  const dated = new Map<string, PublicTaskKioskTask[]>();
  const unscheduled: PublicTaskKioskTask[] = [];
  tasks.filter(task => !overdue.includes(task)).forEach((task) => {
    const date = taskDate(task);
    if (!date) unscheduled.push(task);
    else dated.set(date, [...(dated.get(date) ?? []), task]);
  });
  const groups = [
    ...(overdue.length ? [{ key: 'overdue', label: copy.overdueGroup, tasks: overdue }] : []),
    ...[...dated.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, dateTasks]) => ({
      key: date,
      label: dateAtNoon(date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
      tasks: dateTasks,
    })),
    ...(unscheduled.length ? [{ key: 'unscheduled', label: copy.unscheduled, tasks: unscheduled }] : []),
  ];

  if (tasks.length === 0) return <PublicTaskKioskEmptyState icon={<ListChecks className="h-7 w-7" />} title={emptyTitle} body={emptyBody} />;
  return (
    <div className="space-y-4" data-task-kiosk-agenda>
      {groups.map(group => (
        <section key={group.key} aria-labelledby={`agenda-group-${group.key}`}>
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className={`h-2.5 w-2.5 rounded-full ${group.key === 'overdue' ? 'bg-rose-500' : 'bg-[#F4C84A]'}`} />
            <h3 id={`agenda-group-${group.key}`} className="text-sm font-medium capitalize text-slate-800 dark:text-slate-100">{group.label}</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-300">{group.tasks.length}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {group.tasks.map(task => <AgendaTaskCard key={task.id} copy={copy} locale={locale} onOpen={() => onOpen(task)} referenceDate={referenceDate} task={task} taskCopy={taskCopy} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

export function EmployeeTaskAgendaBoard({ copy, locale, onOpen, referenceDate, taskCopy, tasks }: {
  copy: EmployeeTaskAgendaCopy;
  locale: TaskKioskLocale;
  onOpen: (task: PublicTaskKioskTask) => void;
  referenceDate: string;
  taskCopy: TaskKioskTranslations;
  tasks: PublicTaskKioskTask[];
}) {
  const today = todayKey();
  const columns = [
    { id: 'overdue', label: copy.overdueGroup, dot: 'bg-rose-500', tasks: tasks.filter(task => task.status === 'pending' && (task.is_overdue || Boolean(task.due_date && task.due_date < today))) },
    { id: 'pending', label: copy.pending, dot: 'bg-slate-400', tasks: tasks.filter(task => task.status === 'pending' && !task.is_overdue && (!task.due_date || task.due_date >= today)) },
    { id: 'in_progress', label: copy.inProgress, dot: 'bg-blue-500', tasks: tasks.filter(task => task.status === 'in_progress') },
    { id: 'paused', label: copy.paused, dot: 'bg-amber-500', tasks: tasks.filter(task => task.status === 'paused') },
  ];
  return (
    <section className="@container min-w-0 max-w-full overflow-hidden" data-task-kiosk-board>
      <p className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-200">{copy.boardDescription}</p>
      <div className="w-full min-w-0 max-w-full overflow-x-auto pb-2 snap-x snap-mandatory">
        <div className="flex w-full gap-3 @min-[700px]:grid @min-[700px]:grid-cols-4">
          {columns.map(column => (
            <section className="min-h-48 w-[82cqw] shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-900/40 @min-[700px]:w-auto" key={column.id}>
              <header className="flex min-h-10 items-center gap-2 px-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
                <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100">{column.label}</h3>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">{column.tasks.length}</span>
              </header>
              <div className="mt-1 grid gap-2">
                {column.tasks.length ? column.tasks.map(task => <AgendaTaskCard key={task.id} copy={copy} locale={locale} onOpen={() => onOpen(task)} referenceDate={referenceDate} task={task} taskCopy={taskCopy} />) : <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-950">{copy.emptyColumn}</p>}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
