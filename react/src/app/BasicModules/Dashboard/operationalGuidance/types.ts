export type PanelInicialGuidanceTabId =
  | 'profile'
  | 'business-structure'
  | 'business-profile'
  | 'consulting'
  | 'personal-performance'
  | 'users';

export type PanelInicialGuidanceIcon =
  | 'profile'
  | 'structure'
  | 'maturity'
  | 'consulting'
  | 'performance'
  | 'users';

export interface PanelInicialGuidanceTabDefinition {
  id: PanelInicialGuidanceTabId;
  icon: PanelInicialGuidanceIcon;
}
