import type { PanelInicialGuidanceTabDefinition } from './types';

export const panelInicialGuidanceTabs: readonly PanelInicialGuidanceTabDefinition[] = [
  {
    id: 'profile',
    icon: 'profile',
  },
  {
    id: 'business-structure',
    icon: 'structure',
  },
  {
    id: 'business-profile',
    icon: 'maturity',
  },
  {
    id: 'personal-performance',
    icon: 'performance',
  },
  {
    id: 'users',
    icon: 'users',
  },
] as const;
