export type PanelInicialGuidanceTabId =
  | 'profile'
  | 'business-structure'
  | 'business-profile'
  | 'personal-performance'
  | 'users';

export type PanelInicialGuidanceIcon =
  | 'profile'
  | 'structure'
  | 'maturity'
  | 'performance'
  | 'users';

export interface PanelInicialGuidanceTabDefinition {
  id: PanelInicialGuidanceTabId;
  icon: PanelInicialGuidanceIcon;
}
