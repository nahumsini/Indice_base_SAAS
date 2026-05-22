import type { ProcessesTasksGuidanceTabDefinition } from './types';

export const processesTasksGuidanceTabs: readonly ProcessesTasksGuidanceTabDefinition[] = [
  { id: 'calendar', icon: 'agenda' },
  { id: 'projects', icon: 'projects' },
  { id: 'processes', icon: 'processes' },
  { id: 'kpis', icon: 'kpis' },
] as const;
