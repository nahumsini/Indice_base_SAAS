import type { PublicTaskKioskTask } from './processTaskKioskApi';
import type {
  TaskKioskLocale,
  TaskKioskTranslations,
} from './translations';

export function employeeTaskTypeLabel(
  task: PublicTaskKioskTask,
  copy: TaskKioskTranslations,
) {
  return {
    task: copy.task.task,
    'project-task': copy.task.projectTask,
    process: copy.task.process,
  }[task.task_type];
}

export function formatEmployeeTaskDate(
  value: string | null,
  locale: TaskKioskLocale,
  emptyLabel: string,
) {
  if (!value) return emptyLabel;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function employeeInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || '??';
}

export function multiKioskCsrfFor(token: string) {
  try {
    return sessionStorage.getItem(`indice.multi-kiosk.${token}.csrf`) ?? '';
  } catch {
    return '';
  }
}
