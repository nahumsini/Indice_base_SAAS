import type {
  Option,
  ProcessColumnConfig,
  ProcessFormState,
  ProcessFrequency,
  ProcessPriority,
  ProcessRecurrenceConfig,
  ProcessRecord,
  Weekday,
} from './types';

export const accentButtonClass = 'bg-[rgb(235,165,52)] text-white hover:bg-[rgb(214,144,35)]';

export const priorityLabels: Record<ProcessPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const priorityClasses: Record<ProcessPriority, string> = {
  high: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
  medium: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
};

export const frequencyLabels: Record<ProcessFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  'bi-weekly': 'Bi-weekly',
  monthly: 'Monthly',
  'specific-dates': 'Specific dates',
};

export const frequencyOptions: Option<ProcessFrequency>[] = [
  { value: 'daily', label: frequencyLabels.daily },
  { value: 'weekly', label: frequencyLabels.weekly },
  { value: 'bi-weekly', label: frequencyLabels['bi-weekly'] },
  { value: 'monthly', label: frequencyLabels.monthly },
  { value: 'specific-dates', label: frequencyLabels['specific-dates'] },
];

export const weekdayLabels: Record<Weekday, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export const weekdayOptions: Option<Weekday>[] = [
  { value: 'monday', label: weekdayLabels.monday },
  { value: 'tuesday', label: weekdayLabels.tuesday },
  { value: 'wednesday', label: weekdayLabels.wednesday },
  { value: 'thursday', label: weekdayLabels.thursday },
  { value: 'friday', label: weekdayLabels.friday },
  { value: 'saturday', label: weekdayLabels.saturday },
  { value: 'sunday', label: weekdayLabels.sunday },
];

export const monthDayOptions = Array.from({ length: 31 }, (_, index) => index + 1);

export const priorityOptions: Option<ProcessPriority>[] = [
  { value: 'high', label: priorityLabels.high },
  { value: 'medium', label: priorityLabels.medium },
  { value: 'low', label: priorityLabels.low },
];

export const defaultColumns: ProcessColumnConfig[] = [
  { id: 'folio', label: 'Folio', visible: true, locked: true },
  { id: 'unit', label: 'Unit', visible: true },
  { id: 'business', label: 'Business', visible: true },
  { id: 'title', label: 'Title', visible: true },
  { id: 'description', label: 'Description', visible: true },
  { id: 'createdAt', label: 'Creation Date', visible: true },
  { id: 'frequency', label: 'Frequency', visible: true },
  { id: 'creator', label: 'Creator', visible: true },
  { id: 'responsible', label: 'Responsible', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
];

export const processRecordsSeed: ProcessRecord[] = [
  {
    id: 1,
    folio: 'PR-2026-001',
    unit: 'Operations',
    business: 'Commercial',
    title: 'Daily branch opening checklist',
    description: 'Create and assign the opening checklist so each branch lead receives it in their daily calendar.',
    createdAt: '2026-04-03',
    frequency: 'daily',
    creator: 'Andrea Molina',
    responsible: 'Daniela Solis',
    priority: 'high',
    recurrence: {
      weeklyDay: 'monday',
      biWeeklyDays: ['monday'],
      biWeeklyAnchorDate: '2026-04-03',
      monthlyDays: [1],
      specificDates: [],
    },
    isActive: true,
  },
  {
    id: 2,
    folio: 'PR-2026-002',
    unit: 'Finance',
    business: 'Administration',
    title: 'Weekly cash variance review',
    description: 'Review cash differences, assign follow-up work, and publish a weekly close task to the finance calendar.',
    createdAt: '2026-04-04',
    frequency: 'weekly',
    creator: 'María Rodríguez',
    responsible: 'Carlos López',
    priority: 'high',
    recurrence: {
      weeklyDay: 'friday',
      biWeeklyDays: ['friday'],
      biWeeklyAnchorDate: '2026-04-04',
      monthlyDays: [1],
      specificDates: [],
    },
    isActive: true,
  },
  {
    id: 3,
    folio: 'PR-2026-003',
    unit: 'Human Resources',
    business: 'People',
    title: 'Bi-weekly onboarding pulse',
    description: 'Trigger onboarding follow-up tasks every two weeks for newly hired collaborators.',
    createdAt: '2026-04-05',
    frequency: 'bi-weekly',
    creator: 'Ana García',
    responsible: 'Marta Ruiz',
    priority: 'medium',
    recurrence: {
      weeklyDay: 'monday',
      biWeeklyDays: ['tuesday', 'thursday'],
      biWeeklyAnchorDate: '2026-04-17',
      monthlyDays: [1],
      specificDates: [],
    },
    isActive: true,
  },
  {
    id: 4,
    folio: 'PR-2026-004',
    unit: 'Technology',
    business: 'Operations',
    title: 'Monthly infrastructure resilience audit',
    description: 'Create the recurring audit task package for infrastructure checks and exception logs.',
    createdAt: '2026-04-06',
    frequency: 'monthly',
    creator: 'Carlos López',
    responsible: 'Jorge Herrera',
    priority: 'medium',
    recurrence: {
      weeklyDay: 'monday',
      biWeeklyDays: ['monday'],
      biWeeklyAnchorDate: '2026-04-06',
      monthlyDays: [5, 20],
      specificDates: [],
    },
    isActive: false,
  },
  {
    id: 5,
    folio: 'PR-2026-005',
    unit: 'Operations',
    business: 'People',
    title: 'Specific dates labor climate survey',
    description: 'Schedule survey launch tasks for specific campaign dates and route them to the assigned collaborator.',
    createdAt: '2026-04-08',
    frequency: 'specific-dates',
    creator: 'Andrea Molina',
    responsible: 'Daniela Solis',
    priority: 'low',
    recurrence: {
      weeklyDay: 'monday',
      biWeeklyDays: ['monday'],
      biWeeklyAnchorDate: '2026-04-08',
      monthlyDays: [1],
      specificDates: ['2026-05-12', '2026-06-09', '2026-07-14'],
    },
    isActive: true,
  },
];

export const baseUnitOptions = ['Operations', 'Finance', 'Human Resources', 'Technology'];
export const baseBusinessOptions = ['Commercial', 'Administration', 'People', 'Operations'];
export const baseCollaboratorOptions = [
  'Andrea Molina',
  'Daniela Solis',
  'Carlos López',
  'María Rodríguez',
  'Ana García',
  'Jorge Herrera',
  'Marta Ruiz',
];

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function cloneRecurrenceConfig(
  recurrence: ProcessRecurrenceConfig,
): ProcessRecurrenceConfig {
  return {
    weeklyDay: recurrence.weeklyDay,
    biWeeklyDays: [...recurrence.biWeeklyDays],
    biWeeklyAnchorDate: recurrence.biWeeklyAnchorDate,
    monthlyDays: [...recurrence.monthlyDays],
    specificDates: [...recurrence.specificDates],
  };
}

export function createDefaultRecurrenceConfig(): ProcessRecurrenceConfig {
  return {
    weeklyDay: 'monday',
    biWeeklyDays: ['monday'],
    biWeeklyAnchorDate: getTodayIsoDate(),
    monthlyDays: [1],
    specificDates: [],
  };
}

export function normalizeRecurrenceConfig(
  frequency: ProcessFrequency,
  recurrence: ProcessRecurrenceConfig,
): ProcessRecurrenceConfig {
  const nextRecurrence = cloneRecurrenceConfig(recurrence);

  if (!nextRecurrence.weeklyDay) {
    nextRecurrence.weeklyDay = 'monday';
  }

  if (nextRecurrence.biWeeklyDays.length === 0) {
    nextRecurrence.biWeeklyDays = ['monday'];
  }

  if (!nextRecurrence.biWeeklyAnchorDate) {
    nextRecurrence.biWeeklyAnchorDate = getTodayIsoDate();
  }

  if (nextRecurrence.monthlyDays.length === 0) {
    nextRecurrence.monthlyDays = [1];
  }

  nextRecurrence.monthlyDays = Array.from(new Set(nextRecurrence.monthlyDays))
    .filter((day) => day >= 1 && day <= 31)
    .sort((left, right) => left - right);

  nextRecurrence.specificDates = Array.from(new Set(nextRecurrence.specificDates))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

  if (frequency === 'specific-dates') {
    return nextRecurrence;
  }

  return nextRecurrence;
}

export function isRecurrenceConfigValid(
  frequency: ProcessFrequency,
  recurrence: ProcessRecurrenceConfig,
) {
  switch (frequency) {
    case 'daily':
    case 'weekly':
      return Boolean(recurrence.weeklyDay);
    case 'bi-weekly':
      return recurrence.biWeeklyDays.length > 0 && recurrence.biWeeklyAnchorDate.length > 0;
    case 'monthly':
      return recurrence.monthlyDays.length > 0;
    case 'specific-dates':
      return recurrence.specificDates.length > 0;
    default:
      return true;
  }
}

export function describeProcessFrequency(
  frequency: ProcessFrequency,
  recurrence: ProcessRecurrenceConfig,
) {
  switch (frequency) {
    case 'daily':
      return 'Every day';
    case 'weekly':
      return `Every ${weekdayLabels[recurrence.weeklyDay]}`;
    case 'bi-weekly': {
      const labels = recurrence.biWeeklyDays.map((day) => weekdayLabels[day]).join(', ');
      return `Every 2 weeks on ${labels}`;
    }
    case 'monthly':
      return `Days ${recurrence.monthlyDays.join(', ')}`;
    case 'specific-dates':
      return recurrence.specificDates.length === 1
        ? '1 configured date'
        : `${recurrence.specificDates.length} configured dates`;
    default:
      return frequencyLabels[frequency];
  }
}

export function createDefaultProcessForm(
  unitOptions: string[],
  businessOptions: string[],
  collaboratorOptions: string[],
): ProcessFormState {
  return {
    unit: unitOptions[0] ?? '',
    business: businessOptions[0] ?? '',
    title: '',
    description: '',
    frequency: 'weekly',
    responsible: collaboratorOptions[0] ?? '',
    priority: 'medium',
    recurrence: createDefaultRecurrenceConfig(),
  };
}
