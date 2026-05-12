export const enCA = {
  shell: {
    title: 'Processes and Tasks',
    subtitle: 'Agenda, projects, KPIs, and recurring operational processes',
    back: 'Back',
    loading: {
      title: 'Loading process tab',
      description: 'Opening the selected agenda, project, or process workspace.',
      fallbackTitle: 'Loading process tab',
      fallbackDescription: 'Downloading only the selected process workspace.',
    },
    tabs: {
      agenda: 'Agenda',
      tasks: 'Tasks',
      projects: 'Projects',
      processes: 'Processes',
      kpis: 'KPIs',
      orgChart: 'Org Chart',
    },
  },
  headers: {
    agenda: {
      emoji: '📅',
      title: 'Agenda',
      subtitle: 'Operational agenda with real tasks, carried-over overdue work, closure, evidence, and audit.',
      actions: {
        table: 'Table',
        kanban: 'Kanban',
        columns: 'Columns',
        create: 'Create task',
      },
    },
    projects: {
      emoji: '🗂️',
      title: 'Projects',
      subtitle: 'Operational portfolio with real tasks, evidence, closure, audit, and progress calculated from the agenda.',
      actions: {
        columns: 'Columns',
        create: 'Create project',
      },
    },
    processes: {
      emoji: '✅',
      title: 'Processes',
      subtitle: 'Create recurring processes that generate real agenda tasks for each responsible user.',
      actions: {
        columns: 'Columns',
        create: 'Create process',
      },
    },
    kpis: {
      emoji: '📊',
      title: 'Operational KPIs',
      subtitle: 'Real dashboard for productivity, compliance, audit, processes, projects, and collaborator performance.',
    },
  },
  agenda: {
    periods: {
      today: 'Daily agenda',
      week: 'This week',
      month: 'This month',
      overdue: 'Overdue',
      custom: 'Custom date',
    },
  },
  kpis: {
    periods: {
      day: 'Daily agenda',
      week: 'This week',
      month: 'This month',
      overdue: 'Overdue',
      custom: 'Custom date',
    },
  },
} as const;
