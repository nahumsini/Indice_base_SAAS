import type { HumanResourcesGuidanceTabDefinition } from './types';

export const humanResourcesGuidanceTabs: readonly HumanResourcesGuidanceTabDefinition[] = [
  { id: 'collaborators', icon: 'collaborators' },
  { id: 'attendance', icon: 'attendance' },
  { id: 'control', icon: 'control' },
  { id: 'payroll', icon: 'payroll' },
  { id: 'announcements', icon: 'announcements' },
  { id: 'assets', icon: 'assets' },
  { id: 'records', icon: 'records' },
  { id: 'permissions', icon: 'permissions' },
  { id: 'incentives', icon: 'incentives' },
  { id: 'kpis', icon: 'kpis' },
] as const;
