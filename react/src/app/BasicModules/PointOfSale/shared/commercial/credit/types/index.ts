export type CreditRiskLevel = 'low' | 'medium' | 'high';
export type CreditRuleStatus = 'active' | 'inactive' | 'suspended';
export type CreditDecisionStatus = 'approved' | 'review' | 'blocked';

export interface CreditRule {
  id: string;
  name?: string;
  customerId?: string;
  customerGroup?: string;
  currency?: string;
  creditLimit: number;
  paymentTermDays: number;
  lateInterestRate: number;
  penaltyFee: number;
  gracePeriodDays: number;
  blockWhenOverdue: boolean;
  minimumTicketAmount?: number;
  requiresApprovalAbove?: number;
  reviewAtUtilizationPercent?: number;
  maxOpenInvoices?: number;
  riskLevel: CreditRiskLevel;
  status: CreditRuleStatus;
  notes?: string;
}

export interface CreditEvaluationContext {
  ticketAmount: number;
  currentBalance: number;
  customerId?: string;
  customerGroup?: string;
  customerType?: 'individual' | 'business';
  overdueBalance?: number;
  openInvoices?: number;
  saleDate?: Date;
}

export interface CreditEvaluationResult {
  decision: CreditDecisionStatus;
  availableCredit: number;
  projectedBalance: number;
  utilizationPercent: number;
  dueDate: Date;
  daysToPay: number;
  lateInterestEstimate: number;
  penaltyFee: number;
  messages: string[];
}
