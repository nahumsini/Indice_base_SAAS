export type OpportunityStage = string;
export type OpportunityFlowStageType = 'OPEN' | 'WON' | 'LOST';
export type OpportunityFlowColorToken = 'BLUE' | 'AQUA' | 'GREEN' | 'YELLOW' | 'CORAL' | 'VIOLET' | 'SLATE';

export type OpportunityFlowStage = {
  key: OpportunityStage;
  label: string;
  type: OpportunityFlowStageType;
  colorToken: OpportunityFlowColorToken;
  defaultProbabilityPercent: number;
  position: number;
  required: boolean;
  opportunityCount: number;
  usesDefaultLabel?: boolean;
};
export type OpportunityFlow = {
  id: number;
  key: string;
  name: string;
  factory: boolean;
  defaultFlow: boolean;
  stages: OpportunityFlowStage[];
};
export type OpportunityFlowPosition = {
  opportunityId: number;
  stageKey: OpportunityStage;
  probabilityPercent: number;
};
export type OpportunityTemperature = 'Hot' | 'Warm' | 'Cold';
export type OpportunitySource = 'Manual' | 'Website' | 'Referral' | 'Campaign' | 'Social media' | 'WhatsApp' | 'Existing customer' | 'Post Sale Opportunity' | 'Other';
export type OpportunityStatus = 'Active' | 'Pending follow-up' | 'Overdue' | 'On hold' | 'Closed';
export type OpportunityNextAction = 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Send proposal' | 'Follow up' | 'Review documents' | 'Close deal';
export type OpportunityProbability = string;

export type SalesOpportunity = {
  id: string;
  backendId?: number;
  opportunityCode?: string;
  unitId?: number | null;
  businessId?: number | null;
  opportunityName: string;
  contactId: string;
  company: string;
  contactPerson: string;
  phone: string;
  email: string;
  source: OpportunitySource;
  flowId?: number;
  stage: OpportunityStage;
  lifecycleStatus?: OpportunityFlowStageType;
  temperature: OpportunityTemperature;
  ownerUserCompanyId?: number | null;
  owner: string;
  estimatedValue: string;
  currency?: string;
  probability: OpportunityProbability;
  expectedCloseDate: string;
  nextAction: OpportunityNextAction;
  nextActionDate: string;
  lastContact: string;
  files: string[];
  status: OpportunityStatus;
  notes: string;
  filesCount?: number;
};

export const opportunityStages: OpportunityStage[] = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
];

export const defaultOpportunityFlowStages: OpportunityFlowStage[] = [
  { key: 'New', label: 'New', type: 'OPEN', colorToken: 'BLUE', defaultProbabilityPercent: 10, position: 0, required: false, opportunityCount: 0, usesDefaultLabel: true },
  { key: 'Contacted', label: 'Contacted', type: 'OPEN', colorToken: 'AQUA', defaultProbabilityPercent: 25, position: 1, required: false, opportunityCount: 0, usesDefaultLabel: true },
  { key: 'Qualified', label: 'Qualified', type: 'OPEN', colorToken: 'GREEN', defaultProbabilityPercent: 50, position: 2, required: false, opportunityCount: 0, usesDefaultLabel: true },
  { key: 'Proposal', label: 'Proposal', type: 'OPEN', colorToken: 'YELLOW', defaultProbabilityPercent: 75, position: 3, required: false, opportunityCount: 0, usesDefaultLabel: true },
  { key: 'Negotiation', label: 'Negotiation', type: 'OPEN', colorToken: 'CORAL', defaultProbabilityPercent: 90, position: 4, required: false, opportunityCount: 0, usesDefaultLabel: true },
  { key: 'Won', label: 'Won', type: 'WON', colorToken: 'GREEN', defaultProbabilityPercent: 100, position: 5, required: true, opportunityCount: 0, usesDefaultLabel: true },
  { key: 'Lost', label: 'Lost', type: 'LOST', colorToken: 'CORAL', defaultProbabilityPercent: 0, position: 6, required: true, opportunityCount: 0, usesDefaultLabel: true },
];

export const opportunityTemperatures: OpportunityTemperature[] = ['Hot', 'Warm', 'Cold'];
export const opportunitySources: OpportunitySource[] = ['Manual', 'Website', 'Referral', 'Campaign', 'Social media', 'WhatsApp', 'Existing customer', 'Post Sale Opportunity', 'Other'];
export const opportunityStatuses: OpportunityStatus[] = ['Active', 'Pending follow-up', 'Overdue', 'On hold', 'Closed'];
export const opportunityNextActions: OpportunityNextAction[] = ['Call', 'WhatsApp', 'Email', 'Meeting', 'Send proposal', 'Follow up', 'Review documents', 'Close deal'];
export const opportunityProbabilities: OpportunityProbability[] = ['10%', '25%', '50%', '75%', '90%', '100%'];
export const salesOwners = ['Nahum Pena', 'Ana Lopez', 'Ventas Norte', 'Diana Cruz'];
