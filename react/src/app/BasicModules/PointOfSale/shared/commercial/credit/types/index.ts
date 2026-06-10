export type CreditRiskLevel = 'low' | 'medium' | 'high';
export type CreditRuleStatus = 'active' | 'inactive' | 'suspended';

export interface CreditRule {
  id: string;
  customerId?: string;
  customerGroup?: string;
  creditLimit: number;
  paymentTermDays: number;
  lateInterestRate: number;
  penaltyFee: number;
  gracePeriodDays: number;
  blockWhenOverdue: boolean;
  riskLevel: CreditRiskLevel;
  status: CreditRuleStatus;
  notes?: string;
}
