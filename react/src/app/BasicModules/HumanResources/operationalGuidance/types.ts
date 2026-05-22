export type HumanResourcesGuidanceTabId =
  | 'collaborators'
  | 'attendance'
  | 'control'
  | 'payroll'
  | 'announcements'
  | 'assets'
  | 'records'
  | 'permissions'
  | 'incentives'
  | 'kpis';

export type HumanResourcesGuidanceIcon =
  | 'collaborators'
  | 'attendance'
  | 'control'
  | 'payroll'
  | 'announcements'
  | 'assets'
  | 'records'
  | 'permissions'
  | 'incentives'
  | 'kpis';

export interface HumanResourcesGuidanceTabDefinition {
  id: HumanResourcesGuidanceTabId;
  icon: HumanResourcesGuidanceIcon;
}
