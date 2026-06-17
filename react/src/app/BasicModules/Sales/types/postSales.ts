export type PostSaleType = 'Standard post-sale' | 'Recurrent post-sale';
export type PostSaleStatus =
  | 'Active'
  | 'Pending follow-up'
  | 'In service'
  | 'Renewal soon'
  | 'Recurrent'
  | 'At risk'
  | 'Completed'
  | 'Closed';
export type CustomerRelationType =
  | 'One-time customer'
  | 'Recurrent customer'
  | 'Renewal customer'
  | 'Dormant customer'
  | 'Lost prospect';
export type LostReason = 'Price' | 'Timing' | 'No response' | 'Competitor' | 'Not qualified' | 'Budget' | 'Other';
export type PostSaleRiskLevel = 'Low' | 'Medium' | 'High';

export type SalesPostSaleCase = {
  id: string;
  backendId?: number;
  clientId?: string;
  clientName: string;
  contactPerson: string;
  relatedOpportunityId?: string;
  lastQuoteId?: string;
  relationType: CustomerRelationType;
  postSaleType: PostSaleType;
  status: PostSaleStatus;
  owner: string;
  lastPurchaseDate?: string;
  nextFollowUpDate: string;
  renewalDate?: string;
  lifetimeValue: number;
  currency?: string;
  notes: string;
  files: string[];
  lostReason?: LostReason;
  nextAction: string;
  riskLevel: PostSaleRiskLevel;
  commercialHistory: string[];
  lastUpdated: string;
  filesCount?: number;
};

export const postSaleTypes: PostSaleType[] = ['Standard post-sale', 'Recurrent post-sale'];
export const postSaleStatuses: PostSaleStatus[] = [
  'Active',
  'Pending follow-up',
  'In service',
  'Renewal soon',
  'Recurrent',
  'At risk',
  'Completed',
  'Closed',
];
export const customerRelationTypes: CustomerRelationType[] = [
  'One-time customer',
  'Recurrent customer',
  'Renewal customer',
  'Dormant customer',
  'Lost prospect',
];
export const lostReasons: LostReason[] = ['Price', 'Timing', 'No response', 'Competitor', 'Not qualified', 'Budget', 'Other'];
export const postSaleRiskLevels: PostSaleRiskLevel[] = ['Low', 'Medium', 'High'];
