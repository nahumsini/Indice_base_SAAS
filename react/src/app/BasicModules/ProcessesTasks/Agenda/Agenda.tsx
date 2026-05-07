import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { cn } from '../../../components/ui/utils';
import { accentButtonClass, priorityClasses, priorityLabels } from '../Processes/processesData';
import type { TaskPriority, TaskStatus } from '../Tasks/tasksApi';
import { listAgendaTasks, type AgendaTaskItem } from './agendaApi';

type StatusFilter = 'all' | TaskStatus | 'overdue';

const statusLabels: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  paused: 'Paused',
};

const statusClasses: Record<TaskStatus, string> = {
  pending:
    'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200',
  in_progress:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300',
  completed:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
  cancelled:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
  paused:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300',
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value: string | null, includeTime = false) {
  if (!value) {
    return 'No date';
  }

  const date = includeTime ? new Date(value) : new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime
      ? {
          hour: '2-digit' as const,
          minute: '2-digit' as const,
        }
      : {}),
  }).format(date);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function Agenda() {
  const [agendaMonth, setAgendaMonth] = useState(() => startOfMonth(new Date()));
  const [fromDate, setFromDate] = useState(() => toDateInputValue(startOfMonth(new Date())));
  const [toDate, setToDate] = useState(() => toDateInputValue(endOfMonth(new Date())));
  const [tasks, setTasks] = useState<AgendaTaskItem[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const loadAgenda = async () => {
    setIsLoadingTasks(true);
    setAgendaError(null);

    try {
      const response = await listAgendaTasks(fromDate, toDate);
      setTasks(response.items);
    } catch (error) {
      setTasks([]);
      setAgendaError(getErrorMessage(error, 'Unable to load agenda tasks.'));
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    void loadAgenda();
  }, [fromDate, toDate]);

  const handleMonthChange = (nextMonth: Date) => {
    const normalizedMonth = startOfMonth(nextMonth);
    setAgendaMonth(normalizedMonth);
    setFromDate(toDateInputValue(startOfMonth(normalizedMonth)));
    setToDate(toDateInputValue(endOfMonth(normalizedMonth)));
  };

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        task.folio.toLowerCase().includes(normalizedSearch) ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        (task.description ?? '').toLowerCase().includes(normalizedSearch) ||
        (task.assignedName ?? '').toLowerCase().includes(normalizedSearch) ||
        (task.projectName ?? '').toLowerCase().includes(normalizedSearch) ||
        (task.processTitle ?? '').toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'overdue' ? task.isOverdue : task.status === statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, tasks]);

  const totalCount = tasks.length;
  const openCount = tasks.filter((task) => ['pending', 'in_progress', 'paused'].includes(task.status)).length;
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const overdueCount = tasks.filter((task) => task.isOverdue).length;

  const groupedTasks = useMemo(() => {
    return filteredTasks.reduce<Record<string, AgendaTaskItem[]>>((groups, task) => {
      const key = task.agendaDate || task.dueDate;
      return {
        ...groups,
        [key]: [...(groups[key] ?? []), task],
      };
    }, {});
  }, [filteredTasks]);

  const groupedDates = Object.keys(groupedTasks).sort();

  return (
    <>
      <section className="mb-5 rounded-lg border border-[rgb(235,165,52)]/30 bg-[rgb(235,165,52)]/10 p-6 shadow-sm dark:border-[rgb(235,165,52)]/40 dark:bg-[rgb(235,165,52)]/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
              <CalendarDays className="h-6 w-6 text-[rgb(235,165,52)]" />
              Agenda
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Agenda is a live view of tasks with due dates. Tasks remain the source of truth.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white px-3 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              onClick={() => handleMonthChange(addMonths(agendaMonth, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="inline-flex h-10 min-w-[180px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
              {monthLabel(agendaMonth)}
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white px-3 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              onClick={() => handleMonthChange(addMonths(agendaMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              className={cn('h-10 rounded-xl px-4 text-sm font-semibold', accentButtonClass)}
              onClick={() => {
                void loadAgenda();
              }}
            >
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {agendaError ? (
        <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{agendaError}</span>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl border-red-200 bg-white px-4 text-red-700 shadow-none dark:border-red-900/60 dark:bg-slate-800 dark:text-red-200"
              onClick={() => {
                void loadAgenda();
              }}
            >
              Retry
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-base font-bold text-slate-800 dark:text-white">Filters</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_180px_180px_220px]">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Search task</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Folio, title, assignee, project, or process"
                className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">From</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">To</label>
            <Input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Status</label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
        <span>
          <span className="font-medium text-slate-900 dark:text-white">{totalCount}</span> total tasks
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-blue-600">{openCount}</span> open
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-emerald-600">{completedCount}</span> completed
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-red-600">{overdueCount}</span> overdue
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>
          <span className="font-medium text-[rgb(235,165,52)]">{filteredTasks.length}</span> visible
        </span>
      </div>

      <div className="space-y-6">
        {groupedDates.map((agendaDate) => (
          <section
            key={agendaDate}
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{formatDate(agendaDate)}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {groupedTasks[agendaDate].length} task{groupedTasks[agendaDate].length === 1 ? '' : 's'}
              </p>
            </div>
            <Table className="min-w-[1320px]">
              <TableHeader>
                <TableRow className="border-slate-200 dark:border-slate-700">
                  <TableHead className="px-5 py-5">Folio</TableHead>
                  <TableHead className="px-5 py-5">Task</TableHead>
                  <TableHead className="px-5 py-5">Assigned</TableHead>
                  <TableHead className="px-5 py-5">Status</TableHead>
                  <TableHead className="px-5 py-5">Priority</TableHead>
                  <TableHead className="px-5 py-5">Project</TableHead>
                  <TableHead className="px-5 py-5">Process</TableHead>
                  <TableHead className="px-5 py-5">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedTasks[agendaDate].map((task) => (
                  <TableRow key={task.taskId} className="border-slate-200 dark:border-slate-700">
                    <TableCell className="px-5 py-5 text-sm font-semibold text-slate-900 dark:text-white">
                      {task.folio}
                    </TableCell>
                    <TableCell className="px-5 py-5">
                      <div className="min-w-[320px] space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white">{task.title}</p>
                          {task.isOverdue ? (
                            <Badge variant="outline" className="rounded-full border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
                              Overdue
                            </Badge>
                          ) : null}
                        </div>
                        {task.description ? (
                          <p className="line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {task.description}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400 dark:text-slate-500">No description</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-5">
                      <div className="min-w-[180px] space-y-1 text-sm text-slate-700 dark:text-slate-200">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {task.assignedName ?? 'Unassigned'}
                        </p>
                        {task.assignedEmployeeId ? <p>Employee #{task.assignedEmployeeId}</p> : null}
                        {task.assignedUserId ? <p>User #{task.assignedUserId}</p> : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-5">
                      <Badge variant="outline" className={cn('rounded-full px-3 py-1 font-semibold', statusClasses[task.status])}>
                        {statusLabels[task.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-5">
                      <Badge
                        variant="outline"
                        className={cn('rounded-full px-3 py-1 font-semibold capitalize', priorityClasses[task.priority])}
                      >
                        {priorityLabels[task.priority as TaskPriority]}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-5">
                      <div className="min-w-[180px] text-sm text-slate-700 dark:text-slate-200">
                        {task.projectId ? (
                          <>
                            <p className="font-medium text-slate-900 dark:text-white">{task.projectName ?? 'Project'}</p>
                            <p className="text-slate-500 dark:text-slate-400">{task.projectFolio ?? `#${task.projectId}`}</p>
                          </>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">No project</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-5">
                      <div className="min-w-[180px] text-sm text-slate-700 dark:text-slate-200">
                        {task.processId ? (
                          <>
                            <p className="font-medium text-slate-900 dark:text-white">{task.processTitle ?? 'Process'}</p>
                            <p className="text-slate-500 dark:text-slate-400">{task.processFolio ?? `#${task.processId}`}</p>
                          </>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">No process</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-5 text-sm text-slate-700 dark:text-slate-200">
                      {formatDate(task.updatedAt, true)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        ))}

        {isLoadingTasks ? (
          <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-16 text-center text-base text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            Loading agenda tasks...
          </section>
        ) : null}

        {!isLoadingTasks && groupedDates.length === 0 ? (
          <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-16 text-center text-base text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            No tasks with due dates match the current agenda filters.
          </section>
        ) : null}
      </div>
    </>
  );
}
