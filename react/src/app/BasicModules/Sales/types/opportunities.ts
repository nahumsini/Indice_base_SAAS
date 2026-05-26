export type OpportunityStage = 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
export type OpportunityTemperature = 'Hot' | 'Warm' | 'Cold';
export type OpportunitySource = 'Manual' | 'Website' | 'Referral' | 'Campaign' | 'Social media' | 'WhatsApp' | 'Existing customer' | 'Other';
export type OpportunityStatus = 'Active' | 'Pending follow-up' | 'Overdue' | 'On hold' | 'Closed';
export type OpportunityNextAction = 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Send proposal' | 'Follow up' | 'Review documents' | 'Close deal';
export type OpportunityProbability = '10%' | '25%' | '50%' | '75%' | '90%' | '100%';

export type SalesOpportunity = {
  id: string;
  opportunityName: string;
  contactId: string;
  company: string;
  contactPerson: string;
  phone: string;
  email: string;
  source: OpportunitySource;
  stage: OpportunityStage;
  temperature: OpportunityTemperature;
  ownerUserCompanyId?: number | null;
  owner: string;
  estimatedValue: string;
  probability: OpportunityProbability;
  expectedCloseDate: string;
  nextAction: OpportunityNextAction;
  nextActionDate: string;
  lastContact: string;
  files: string[];
  status: OpportunityStatus;
  notes: string;
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

export const opportunityTemperatures: OpportunityTemperature[] = ['Hot', 'Warm', 'Cold'];
export const opportunitySources: OpportunitySource[] = ['Manual', 'Website', 'Referral', 'Campaign', 'Social media', 'WhatsApp', 'Existing customer', 'Other'];
export const opportunityStatuses: OpportunityStatus[] = ['Active', 'Pending follow-up', 'Overdue', 'On hold', 'Closed'];
export const opportunityNextActions: OpportunityNextAction[] = ['Call', 'WhatsApp', 'Email', 'Meeting', 'Send proposal', 'Follow up', 'Review documents', 'Close deal'];
export const opportunityProbabilities: OpportunityProbability[] = ['10%', '25%', '50%', '75%', '90%', '100%'];
export const salesOwners = ['Nahum Pena', 'Ana Lopez', 'Ventas Norte', 'Diana Cruz'];
