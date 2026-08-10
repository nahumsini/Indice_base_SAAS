export type PanelInicialLocale =
  | 'es-MX'
  | 'es-CO'
  | 'en-US'
  | 'en-CA'
  | 'fr-CA'
  | 'pt-BR'
  | 'ko-CA'
  | 'zh-CA';

export interface PanelInicialShellTranslations {
  subtitle: string;
  tabDescriptions: {
    profile: string;
    businessStructure: string;
    businessProfile: string;
    personalPerformance: string;
    consulting: string;
    users: string;
  };
  loadingTabTitle: string;
  loadingTabDescription: string;
  downloadingTabDescription: string;
  accessEmptyTitle: string;
  accessEmptyDescription: string;
  accessErrorTitle: string;
  accessErrorDescription: string;
  retry: string;
  tabErrorEyebrow: string;
  tabErrorTitle: string;
  tabErrorDescription: string;
  reload: string;
  navigationLabel: string;
}
