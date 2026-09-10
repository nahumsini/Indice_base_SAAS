import type { AgendaFocusFilter, AgendaLoadRange, AgendaStatus, PeriodFilter, StatusFilter } from '../Agenda/types';
import type { PublicTaskKioskTask } from './processTaskKioskApi';

export const kioskAllFilterValue = 'all';
export const kioskEmptyFilterValue = 'empty';

export type TaskKioskFilterState = {
  focus: AgendaFocusFilter;
  period: PeriodFilter;
  status: StatusFilter;
  unit: string;
  business: string;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKioskDateKey() {
  return toDateKey(new Date());
}

function dateKeyFromDateTime(value: string | null) {
  return value ? value.slice(0, 10) : null;
}

function taskDueDateValue(task: PublicTaskKioskTask) {
  return task.due_date ?? task.start_date ?? null;
}

function taskAgendaDateValue(task: PublicTaskKioskTask) {
  return task.agenda_date ?? null;
}

function taskExistsByDate(task: PublicTaskKioskTask, dateKey: string) {
  const createdDate = dateKeyFromDateTime(task.created_at);
  return !createdDate || createdDate <= dateKey;
}

function toRelativeDateKey(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

function buildRange(period: PeriodFilter, todayValue: string): AgendaLoadRange | null {
  const date = new Date(`${todayValue}T00:00:00`);

  if (period === 'week') {
    const day = date.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    const from = new Date(date);
    from.setDate(date.getDate() + offset);
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    return { from: toDateKey(from), to: toDateKey(to) };
  }

  if (period === 'month') {
    const from = new Date(date.getFullYear(), date.getMonth(), 1);
    const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { from: toDateKey(from), to: toDateKey(to) };
  }

  return null;
}

function isDateInRange(dateKey: string | null, range: AgendaLoadRange) {
  return Boolean(dateKey && dateKey >= range.from && dateKey <= range.to);
}

function isTaskScheduledForPeriod(
  task: PublicTaskKioskTask,
  period: PeriodFilter,
  referenceDate: string,
) {
  const agendaDate = taskAgendaDateValue(task);
  if (!agendaDate || period === 'all') return false;
  if (period === 'today' || period === 'custom') return agendaDate === referenceDate;
  if (period === 'tomorrow') return agendaDate === toRelativeDateKey(referenceDate, 1);
  if (period === 'yesterday') return agendaDate === toRelativeDateKey(referenceDate, -1);
  const range = buildRange(period, referenceDate);
  return range ? isDateInRange(agendaDate, range) : false;
}

function currentOpenStatus(task: PublicTaskKioskTask): Extract<AgendaStatus, 'in_progress' | 'paused'> | null {
  return task.status === 'in_progress' || task.status === 'paused' ? task.status : null;
}

export function getKioskTaskAgendaStatus(
  task: PublicTaskKioskTask,
  referenceDate: string = todayKioskDateKey(),
): Exclude<AgendaStatus, 'audited'> | null {
  if (!['pending', 'in_progress', 'paused', 'completed'].includes(task.status)) return null;
  if (!taskExistsByDate(task, referenceDate)) {
    return null;
  }

  const completedDate = dateKeyFromDateTime(task.completed_at);
  if (task.status === 'completed') {
    return !completedDate || completedDate === referenceDate ? 'completed' : null;
  }

  const openStatus = currentOpenStatus(task);
  if (openStatus) {
    return openStatus;
  }

  if (taskAgendaDateValue(task) === referenceDate) {
    return 'pending';
  }

  const dueDate = taskDueDateValue(task);
  if (!dueDate) {
    return 'pending';
  }

  if (task.is_overdue || dueDate < referenceDate) {
    return 'overdue';
  }

  return dueDate === referenceDate ? 'pending' : null;
}

function getKioskTaskAgendaStatusInRange(
  task: PublicTaskKioskTask,
  range: AgendaLoadRange,
  referenceDate: string,
): Exclude<AgendaStatus, 'audited'> | null {
  if (!['pending', 'in_progress', 'paused', 'completed'].includes(task.status)) return null;
  if (!taskExistsByDate(task, range.to)) {
    return null;
  }

  const completedDate = dateKeyFromDateTime(task.completed_at);
  if (task.status === 'completed') {
    return isDateInRange(completedDate, range) || !completedDate ? 'completed' : null;
  }

  const openStatus = currentOpenStatus(task);
  if (openStatus) {
    return openStatus;
  }

  if (isDateInRange(taskAgendaDateValue(task), range)) {
    return 'pending';
  }

  const dueDate = taskDueDateValue(task);
  if (!dueDate) {
    return 'pending';
  }

  if (dueDate < range.from || (dueDate < referenceDate && dueDate <= range.to)) {
    return 'overdue';
  }

  return isDateInRange(dueDate, range) ? 'pending' : null;
}

function resolveKioskTaskAgendaStatus(
  task: PublicTaskKioskTask,
  options: { period?: PeriodFilter; referenceDate?: string } = {},
) {
  const today = options.referenceDate ?? todayKioskDateKey();
  const referenceDate = options.period === 'tomorrow' ? toRelativeDateKey(today, 1)
    : options.period === 'yesterday' ? toRelativeDateKey(today, -1) : today;
  // An unbounded period includes future pending tasks and historical completions.
  // It must not fall back to the single-day projection used by Today.
  if (options.period === 'all') {
    if (task.status === 'completed') return 'completed';
    if (task.status === 'in_progress' || task.status === 'paused') return task.status;
    if (task.status !== 'pending') return null;
    const due = taskDueDateValue(task);
    return due && due < today ? 'overdue' : 'pending';
  }
  const range = options.period ? buildRange(options.period, referenceDate) : null;
  return range
    ? getKioskTaskAgendaStatusInRange(task, range, referenceDate)
    : getKioskTaskAgendaStatus(task, referenceDate);
}

export function matchesKioskPeriod(
  task: PublicTaskKioskTask,
  period: PeriodFilter,
  todayValue: string = todayKioskDateKey(),
) {
  if (isTaskScheduledForPeriod(task, period, todayValue)) return true;
  switch (period) {
    case 'all':
      return true;
    case 'today':
      return getKioskTaskAgendaStatus(task, todayValue) != null;
    case 'tomorrow':
      return getKioskTaskAgendaStatus(task, toRelativeDateKey(todayValue, 1)) != null;
    case 'yesterday':
      return getKioskTaskAgendaStatus(task, toRelativeDateKey(todayValue, -1)) != null;
    case 'week':
    case 'month':
    case 'custom':
      return resolveKioskTaskAgendaStatus(task, { period, referenceDate: todayValue }) != null;
  }
}

export function matchesKioskFocus(task: PublicTaskKioskTask, focus: AgendaFocusFilter) {
  const delegatedToAnotherUser = task.assigned_user_company_id != null && !task.is_assigned_to_current_user;

  switch (focus) {
    case 'mine':
      return task.is_assigned_to_current_user || (task.is_created_by_current_user && !delegatedToAnotherUser);
    case 'delegated':
      return task.is_created_by_current_user && delegatedToAnotherUser;
    case 'team':
      return true;
  }
}

export function matchesKioskStatus(
  task: PublicTaskKioskTask,
  status: StatusFilter,
  period: PeriodFilter,
  todayValue: string = todayKioskDateKey(),
) {
  const agendaStatus = resolveKioskTaskAgendaStatus(task, { period, referenceDate: todayValue });

  if (status === 'all') {
    return agendaStatus != null;
  }

  if (status === 'pending_overdue') {
    return agendaStatus === 'pending' || agendaStatus === 'overdue' || agendaStatus === 'in_progress' || agendaStatus === 'paused';
  }

  if (status === 'audited') {
    return false;
  }

  return agendaStatus === status;
}

export function filterKioskTasks(
  tasks: PublicTaskKioskTask[],
  filters: TaskKioskFilterState,
  todayValue: string = todayKioskDateKey(),
) {
  return tasks
    .filter((task) => {
      const taskUnitValue = String(task.unit_id ?? kioskEmptyFilterValue);
      const taskBusinessValue = String(task.business_id ?? kioskEmptyFilterValue);

      return (
        matchesKioskFocus(task, filters.focus) &&
        matchesKioskPeriod(task, filters.period, todayValue) &&
        matchesKioskStatus(task, filters.status, filters.period, todayValue) &&
        (filters.unit === kioskAllFilterValue || taskUnitValue === filters.unit) &&
        (filters.business === kioskAllFilterValue || taskBusinessValue === filters.business)
      );
    })
    .sort((left, right) => {
      const leftStatus = resolveKioskTaskAgendaStatus(left, { period: filters.period, referenceDate: todayValue });
      const rightStatus = resolveKioskTaskAgendaStatus(right, { period: filters.period, referenceDate: todayValue });
      const leftOverdue = leftStatus === 'overdue' ? 1 : 0;
      const rightOverdue = rightStatus === 'overdue' ? 1 : 0;

      if (leftOverdue !== rightOverdue) {
        return rightOverdue - leftOverdue;
      }

      const leftDue = taskDueDateValue(left) ?? '9999-12-31';
      const rightDue = taskDueDateValue(right) ?? '9999-12-31';
      if (leftDue !== rightDue) {
        return leftDue.localeCompare(rightDue);
      }

      return (right.created_at ?? '').localeCompare(left.created_at ?? '');
    });
}
