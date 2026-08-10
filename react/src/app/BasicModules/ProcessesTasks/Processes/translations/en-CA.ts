import type { ProcessFrequency, ProcessRecurrenceConfig, Weekday } from '../types';

export const enCA = {
  common: {
    all: 'All',
    allFemale: 'All',
    retry: 'Retry',
    cancel: 'Cancel',
    close: 'Close',
    previous: 'Previous',
    continue: 'Continue',
    saving: 'Saving...',
    noDate: 'No date',
    noUnit: 'No unit',
    noBusiness: 'No business',
    unassigned: 'Unassigned',
    backup: 'backup',
    actions: 'Actions',
    requiredFields: 'Fields marked with * are required.',
  },
  header: {
    emoji: '🔄',
    title: 'Processes',
    subtitle: 'Create recurring processes that generate real agenda tasks for each responsible user.',
    actions: {
      table: 'Table',
      diagram: 'Diagram',
      columns: 'Columns',
      create: 'Create process',
    },
  },
  filters: {
    title: 'Filters',
    search: 'Search process',
    searchPlaceholder: 'Folio, title, description, unit, or responsible',
    unit: 'Unit',
    business: 'Business',
    collaborator: 'Collaborator',
    frequency: 'Frequency',
    clear: 'Clear filters',
  },
  diagram: { previousMonth: 'Previous month', nextMonth: 'Next month' },
  statuses: {
    active: 'Active',
    paused: 'Paused',
    atRisk: 'At risk',
  },
  priorities: {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  },
  frequencies: {
    daily: 'Daily',
    weekly: 'Weekly',
    'bi-weekly': 'Bi-weekly',
    monthly: 'Monthly',
    'specific-dates': 'Specific dates',
  },
  weekdays: {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  },
  columns: {
    folio: { label: 'Folio', description: 'Operational process identifier.' },
    unit: { label: 'Unit', description: 'Unit related to the process.' },
    business: { label: 'Business', description: 'Business related to the process.' },
    title: { label: 'Process', description: 'Editable recurring process name.' },
    description: { label: 'Description', description: 'Operational detail and scope of the process.' },
    template: { label: 'Template', description: 'Data copied into each generated task.' },
    createdAt: { label: 'Creation date', description: 'Date when the process was registered.' },
    frequency: { label: 'Frequency', description: 'Task generation cadence.' },
    nextOccurrence: { label: 'Next generation', description: 'Next occurrence scheduled by the engine.' },
    generatedUntil: { label: 'Generated until', description: 'Future limit materialized by the engine.' },
    progress: { label: 'Progress', description: 'Progress calculated from generated tasks.' },
    tasks: { label: 'Tasks', description: 'Generated, open, closed, and overdue tasks.' },
    creator: { label: 'Creator', description: 'User who created the process.' },
    responsible: { label: 'Responsible', description: 'User responsible for executing the process.' },
    priority: { label: 'Priority', description: 'Assigned priority level.' },
  },
  fixedColumns: {
    actions: {
      label: 'Actions',
      description: 'Buttons to update tasks, pause, edit, copy, or delete the process.',
    },
  },
  columnsDialog: {
    title: 'Manage columns',
    description: 'Choose which table columns stay visible in the Processes workspace.',
    visibleCount: (visible: number, total: number) => `${visible} of ${total} columns visible`,
    selectAll: 'Select all',
    minimumSet: 'Minimum set',
    requiredColumn: 'Required column for the workspace.',
    optionalColumn: 'Optional column that can be hidden from the table.',
  },
  table: {
    loading: 'Loading recurring processes...',
    empty: 'No recurring processes match the current filters.',
    progress: 'Progress',
    status: 'Status',
    graceDays: (days: number) => `Grace ${days} days`,
    evidenceRequired: 'Evidence required',
    start: 'Start',
    end: 'End',
    until: 'Until',
    window: (days: number) => `Window ${days} days`,
    taskCounts: {
      open: 'Open',
      closed: 'Closed',
      overdue: 'Overdue',
      audited: 'Audited',
    },
  },
  actions: {
    runEngine: 'Update process tasks',
    pause: 'Pause process',
    activate: 'Activate process',
    edit: 'Edit process',
    copy: 'Copy process',
    delete: 'Delete process',
  },
  bulk: {
    selected: (count: number) => `${count} selected`,
    title: 'Bulk actions',
    applied: (count: number) => `Bulk action applied to ${count} selected process${count === 1 ? '' : 'es'}.`,
    assignDescription: (count: number) =>
      `Apply responsible user to ${count} selected process${count === 1 ? '' : 'es'}.`,
    itemName: (count: number) => `${count} process${count === 1 ? '' : 'es'}`,
    selectVisible: 'Select visible processes',
    selectRow: (folio: string) => `Select ${folio}`,
  },
  messages: {
    loadProcesses: 'Unable to load processes.',
    loadCatalogs: 'Unable to load process catalogs.',
    saveChanges: 'Unable to save process changes.',
    deleteProcess: 'Unable to delete process.',
    duplicateProcess: 'Unable to copy process.',
    runEngine: 'Unable to update process tasks.',
    saveProcess: 'Unable to save process.',
    titleRequired: 'Title is required.',
    descriptionRequired: 'Description is required.',
    copyPrefix: (title: string) => `Copy of ${title}`,
  },
  kpis: {
    labels: {
      visible: 'visible',
      active: 'active',
      open: 'open',
      closed: 'closed',
      overdue: 'overdue',
      averageProgress: 'avg. progress',
      tasks: 'tasks',
      health: 'health',
    },
    segments: {
      active: 'Active',
      paused: 'Paused',
      closedTasks: 'Closed tasks',
      audited: 'Audited',
      overdue: 'Overdue',
    },
    badges: {
      overdue: (count: number) => `${count} overdue`,
      paused: (count: number) => `${count} paused`,
      health: (score: number) => `${score}% health`,
    },
    insights: {
      empty: 'There are no processes in the current filter. Create or adjust filters to evaluate recurring operations.',
      overdue: (overdue: number, average: number, open: number) =>
        `${overdue} overdue tasks come from active processes; average progress is ${average}% and ${open} tasks remain open.`,
      paused: (paused: number, open: number, health: number) =>
        `There are ${paused} paused processes in the filter. Active processes support ${open} open tasks with estimated health of ${health}%.`,
      healthy: (active: number, closed: number, health: number) =>
        `The process portfolio looks healthy: ${active} active, ${closed} closed tasks, and estimated health of ${health}%.`,
      default: (health: number, active: number, average: number) =>
        `Estimated filter health is ${health}% with ${active} active processes and ${average}% average progress.`,
    },
  },
  form: {
    titles: {
      create: 'Create recurring process',
      edit: 'Edit recurring process',
    },
    descriptions: {
      create: 'Create a recurring process to generate tasks and assign them in the responsible user agenda.',
      edit: 'Update configuration, responsible user, and frequency without changing the module flow.',
    },
    labels: {
      unit: 'Unit',
      business: 'Business',
      title: 'Title *',
      description: 'Description *',
      taskTitle: 'Task title',
      taskDescription: 'Task description',
      taskNotes: 'Initial notes',
      frequency: 'Frequency',
      responsible: 'Responsible',
      priority: 'Priority',
      start: 'Start',
      end: 'End',
      graceDays: 'Grace days',
      window: 'Window',
      referenceDate: 'Reference date',
    },
    placeholders: {
      unit: 'No unit',
      business: 'No business',
      responsible: 'Unassigned',
      title: 'Recurring process title',
      description: 'Describe how recurring work should appear in the responsible user agenda',
      taskTitle: 'If empty, the process title is used',
      taskDescription: 'If empty, the process description is used',
      taskNotes: 'Operational notes for each generated task',
    },
    sections: {
      taskTemplate: 'Task template',
      taskTemplateDescription: 'These values are copied into each task generated by the engine.',
      evidenceRequired: 'Evidence required',
      evidenceDescription: 'Mark this process if its tasks must be closed with evidence files or photos.',
      engineControl: 'Engine control',
      engineDescription: 'Define when generation starts, when it applies until, and how many days ahead it materializes.',
      schedule: 'Process schedule',
      scheduleDescription: (frequency: string) =>
        `Configure how the recurring process is generated when the selected frequency is ${frequency}.`,
    },
    recurrence: {
      daily: 'The process will create tasks every day for the assigned responsible user.',
      weeklyTitle: 'Weekly configuration',
      weeklyDescription: 'Choose the weekday when the process should appear in the responsible user agenda.',
      biWeeklyTitle: 'Bi-weekly configuration',
      biWeeklyDescription: 'Choose the days and reference date to repeat the process every two weeks.',
      monthlyTitle: 'Monthly configuration',
      monthlyDescription: 'Choose the day or days of the month when the process should generate.',
      specificDatesTitle: 'Specific date configuration',
      specificDatesDescription: 'Add the exact dates when the process should create tasks in the responsible user agenda.',
      addDate: 'Add date',
      emptyDates: 'Add at least one date to activate this schedule.',
      selectedDay: (day: string) => `Selected day: ${day}`,
      removeDate: (date: string) => `Remove ${date}`,
    },
    submit: {
      create: 'Create process',
      edit: 'Save changes',
    },
  },
  confirmation: {
    deleteTitle: 'Delete process',
    deleteDescription: 'This removes the process from the active catalog and cancels open tasks generated by it. Completed or already cancelled tasks remain as history.',
    deleteConfirm: 'Delete process',
  },
  describeFrequency: (frequency: ProcessFrequency, recurrence: ProcessRecurrenceConfig) => {
    const weekdays = enCA.weekdays as Record<Weekday, string>;

    switch (frequency) {
      case 'daily':
        return 'Every day';
      case 'weekly':
        return `Every ${weekdays[recurrence.weeklyDay]}`;
      case 'bi-weekly': {
        const labels = recurrence.biWeeklyDays.map((day) => weekdays[day]).join(', ');
        return `Every 2 weeks: ${labels}`;
      }
      case 'monthly':
        return `Days ${recurrence.monthlyDays.join(', ')}`;
      case 'specific-dates':
        return recurrence.specificDates.length === 1
          ? '1 configured date'
          : `${recurrence.specificDates.length} configured dates`;
      default:
        return enCA.frequencies[frequency];
    }
  },
} as const;
