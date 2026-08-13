import type { DistributorCommercialStage } from '../types/contractsAccess';

export type DistributorPortalLocale =
  | 'en-CA'
  | 'en-US'
  | 'fr-CA'
  | 'es-MX'
  | 'es-CO'
  | 'pt-BR'
  | 'ko-CA'
  | 'zh-CA';

export interface DistributorPortalCopy {
  navigation: {
    portalName: string;
    local: string;
    backToErp: string;
  };
  tabs: { contractsAccess: string; consulting: string };
  header: { eyebrow: string; title: string; subtitle: string };
  actions: {
    refresh: string;
    refreshing: string;
    view: string;
    manage: string;
    addClient: string;
    extendTrial: string;
    close: string;
  };
  metrics: {
    totalClients: string;
    prospects: string;
    demosTrials: string;
    activeContracts: string;
    attention: string;
  };
  filters: {
    title: string;
    subtitle: string;
    matches: string;
    search: string;
    searchPlaceholder: string;
    stage: string;
    allStages: string;
  };
  table: {
    title: string;
    subtitle: string;
    company: string;
    stage: string;
    access: string;
    contract: string;
    users: string;
    nextEvent: string;
    action: string;
    noResults: string;
    noClients: string;
    noPlan: string;
    noModules: string;
    noDate: string;
    daysRemaining: string;
    members: string;
    seats: string;
    review: string;
  };
  detail: {
    eyebrow: string;
    subtitle: string;
    contact: string;
    country: string;
    stage: string;
    access: string;
    contract: string;
    billing: string;
    modules: string;
    capacity: string;
    nextEvent: string;
    directPortfolio: string;
  };
  states: Record<DistributorCommercialStage, string>;
  errors: { title: string; retry: string; forbidden: string };
}
