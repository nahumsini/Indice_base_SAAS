import type {
  CustomerRelationType,
  PostSaleRiskLevel,
  PostSaleStatus,
  PostSaleType,
  SalesPostSaleCase,
} from '../../salesCrmContext';
import type { SaleRecord } from '../../Sales/types/salesTypes';

export type ViewMode = 'table' | 'followUp';
export type FilterValue = 'all' | string;
export type OpportunityAutomationDelay = '30' | '60' | '90' | '180' | 'custom';

export type PostSaleFormState = {
  clientId: string;
  relatedOpportunityId: string;
  lastQuoteId: string;
  relationType: CustomerRelationType;
  postSaleType: PostSaleType;
  status: PostSaleStatus;
  owner: string;
  lastPurchaseDate: string;
  nextFollowUpDate: string;
  renewalDate: string;
  lifetimeValue: string;
  nextAction: string;
  notes: string;
  files: string;
};

export type OpportunityAutomationFormState = {
  clientId: string;
  delay: OpportunityAutomationDelay;
  scheduledDate: string;
  opportunityName: string;
  expectedCloseDate: string;
  owner: string;
  notes: string;
};

export type FutureOpportunityFormState = {
  opportunityName: string;
  expectedCloseDate: string;
  nextActionDate: string;
  notes: string;
};

export type CustomerHistory = {
  id: string;
  clientId?: string;
  clientName: string;
  contactPerson: string;
  phone?: string;
  email?: string;
  owner: string;
  relationType: CustomerRelationType;
  postSaleType: PostSaleType;
  status: PostSaleStatus;
  riskLevel: PostSaleRiskLevel;
  lastPurchaseDate?: string;
  nextFollowUpDate?: string;
  renewalDate?: string;
  lifetimeValue: number;
  currency?: string;
  notes: string;
  files: string[];
  sales: SaleRecord[];
  postSaleCase?: SalesPostSaleCase;
};
