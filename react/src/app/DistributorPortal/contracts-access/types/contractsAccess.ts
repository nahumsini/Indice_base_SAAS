export type DistributorCommercialStage =
  | 'PROSPECT'
  | 'DEMO'
  | 'TRIAL'
  | 'ACTIVE'
  | 'ATTENTION'
  | 'INACTIVE';

export type DistributorStageFilter = 'ALL' | DistributorCommercialStage;

export interface DistributorPortalContext {
  company_id: number;
  company_name: string;
  operator_name: string;
  account_type: 'DISTRIBUTOR';
  role: string;
  available_tabs: Array<'CONTRACTS_ACCESS' | 'CONSULTING'>;
}

export interface DistributorClient {
  company_id: number;
  company_name: string;
  owner_email: string | null;
  country_code: string | null;
  commercial_stage: DistributorCommercialStage;
  billing_status: string | null;
  offer_code: string | null;
  billing_interval: string | null;
  currency: string | null;
  access_mode: string | null;
  module_names: string[];
  active_members: number;
  seat_capacity: number;
  last_payment_status: string | null;
  next_event_at: string | null;
  trial_ends_at: string | null;
  trial_source: 'STRIPE' | 'LOCAL_DEMO' | null;
  trial_days_remaining: number;
  trial_extendable: boolean;
  trial_permanent: boolean;
}

export interface DistributorPortfolioSummary {
  total_clients: number;
  prospects: number;
  demos_and_trials: number;
  active_contracts: number;
  attention_required: number;
}

export interface DistributorPortfolio {
  summary: DistributorPortfolioSummary;
  clients: DistributorClient[];
  matching_clients: number;
}
