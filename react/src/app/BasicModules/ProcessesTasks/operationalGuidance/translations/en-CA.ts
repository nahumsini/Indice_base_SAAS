export const enCA = {
  eyebrow: 'Learning mode',
  title: 'Operations execution guide',
  subtitle: 'Use Processes and Tasks to turn operational priorities into visible work, repeatable routines, and measurable execution.',
  controlLabel: 'Execution control',
  functionsLabel: 'Tab functions',
  guideProgressLabel: 'Guide progress',
  guideProgressCompleteLabel: 'reviewed',
  previousStepLabel: 'Previous recommendation',
  nextStepLabel: 'Next recommendation',
  stepIndicatorLabel: 'Show recommendation',
  tabs: {
    calendar: {
      label: 'Agenda',
      ctaLabel: 'Review agenda',
      title: 'Run daily work from one operational board',
      summary: 'Use Agenda to create, assign, prioritize, complete, audit, and follow up on tasks without losing execution context.',
      value: 'A disciplined agenda reduces forgotten work, makes ownership visible, and helps supervisors close the day with clearer evidence.',
      steps: [
        {
          title: 'Keep tasks actionable',
          description: 'Write tasks with clear titles, responsible owners, due dates, priority, and business context so execution is easy to inspect.',
        },
        {
          title: 'Use views for the right operating moment',
          description: 'Use table for control, kanban for flow, and diagram for timing so the same work can be understood from different angles.',
        },
        {
          title: 'Close with evidence',
          description: 'Use notes, progress, files, and audit status to make completed work reliable, not only marked as done.',
        },
      ],
    },
    projects: {
      label: 'Projects',
      ctaLabel: 'Review projects',
      title: 'Coordinate initiatives without losing task control',
      summary: 'Use Projects to group related work, organize owners, and connect task execution to a larger operational objective.',
      value: 'Project visibility helps teams understand why tasks matter and where delays can affect wider business commitments.',
      steps: [
        {
          title: 'Define the project outcome',
          description: 'Keep each project tied to a clear operational result so tasks do not become disconnected activity.',
        },
        {
          title: 'Track the task portfolio',
          description: 'Use project task lists and diagrams to identify workload, delays, owners, and timing risks.',
        },
        {
          title: 'Review progress consistently',
          description: 'Use project status and linked tasks to guide follow-up conversations before deadlines become emergencies.',
        },
      ],
    },
    processes: {
      label: 'Processes',
      ctaLabel: 'Review processes',
      title: 'Convert recurring work into operating routines',
      summary: 'Use Processes to define repeatable operational generators that create future tasks from clear recurrence rules.',
      value: 'Recurring processes protect consistency: active processes generate future work, paused ones stop, and deleted ones stop permanently.',
      steps: [
        {
          title: 'Separate processes from tasks',
          description: 'Treat processes as operating routines that generate tasks, not as individual items to complete.',
        },
        {
          title: 'Control recurrence carefully',
          description: 'Keep frequency, next execution, owner, and status accurate so the engine generates only the work the operation needs.',
        },
        {
          title: 'Pause before deleting when in doubt',
          description: 'Pause processes to stop future work temporarily; delete only when the routine should no longer generate tasks.',
        },
      ],
    },
    kpis: {
      label: 'KPIs',
      ctaLabel: 'Review KPIs',
      title: 'Measure execution health before work drifts',
      summary: 'Use operational KPIs to read agenda compliance, project flow, recurring process discipline, and execution risk.',
      value: 'KPIs turn task activity into management signals so leaders can act before missed work becomes operational debt.',
      steps: [
        {
          title: 'Read leading indicators',
          description: 'Watch open, overdue, audited, and completed work to understand whether execution is improving or accumulating risk.',
        },
        {
          title: 'Connect metrics to action',
          description: 'Use KPI movement to decide which team, project, process, or owner needs follow-up.',
        },
        {
          title: 'Review trends, not only totals',
          description: 'A single number is useful, but trend changes show whether the operating system is getting healthier.',
        },
      ],
    },
  },
} as const;
