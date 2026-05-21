export type ProcessesTasksGuidanceTabId =
  | 'calendar'
  | 'projects'
  | 'processes'
  | 'kpis';

export type ProcessesTasksGuidanceIcon =
  | 'agenda'
  | 'projects'
  | 'processes'
  | 'kpis';

export interface ProcessesTasksGuidanceTabDefinition {
  id: ProcessesTasksGuidanceTabId;
  icon: ProcessesTasksGuidanceIcon;
}
