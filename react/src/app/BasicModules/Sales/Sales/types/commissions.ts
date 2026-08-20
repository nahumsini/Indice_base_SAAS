import type { SaleRecord } from './salesTypes';

export type CommissionType =
  | 'fixed_per_sale'
  | 'fixed_per_product'
  | 'percentage_of_sale'
  | 'percentage_of_product';

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled';
export type CommissionRuleStatus = 'active' | 'inactive';
export type CommissionViewMode = 'sales' | 'commissions';
export type CommissionPeriodFilter = 'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';

export type CommissionRule = {
  id: string;
  backendId?: number;
  name: string;
  userId: string;
  userName: string;
  userIds: string[];
  userNames: string[];
  productId: string;
  productName: string;
  productIds: string[];
  productNames: string[];
  categoryId?: string;
  categoryName?: string;
  type: CommissionType;
  value: number;
  validFrom?: string;
  validUntil?: string;
  status: CommissionRuleStatus;
  priority: number;
  notes?: string;
};

export type CommissionRecord = {
  id: string;
  saleId: string;
  saleCode: string;
  customerId: string;
  customerName: string;
  salesRepId: string;
  salesRepName: string;
  productId: string;
  productName: string;
  commissionRuleId: string;
  commissionRuleName: string;
  commissionType: CommissionType;
  commissionValue: number;
  saleAmount: number;
  commissionAmount: number;
  currency: string;
  status: CommissionStatus;
  createdDate: string;
  approvedDate?: string;
  paidDate?: string;
  unitId?: string;
  unitName?: string;
  businessId?: string;
  businessName?: string;
};

export type CommissionKpis = {
  totalCommissions: number;
  totalCommissionsLabel: string;
  pendingCommissions: number;
  pendingCommissionsLabel: string;
  approvedCommissions: number;
  approvedCommissionsLabel: string;
  paidCommissions: number;
  paidCommissionsLabel: string;
  commissionRate: number;
  commissionCount: number;
};

export type CommissionFiltersState = {
  search: string;
  unit: string;
  business: string;
  period: CommissionPeriodFilter;
  salesRep: string;
  product: string;
  status: string;
};

export type CommissionOption = {
  id: string;
  name: string;
};

export type CommissionCut = {
  id: number;
  cutCode: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalAmount: number;
  commissionCount: number;
  employeeCount: number;
  appliedCount: number;
  currencyTotals: Record<string, number>;
};

export type CommissionCalculationInput = {
  type: CommissionType;
  value: number;
  saleAmount: number;
  productAmount?: number;
  quantity?: number;
};

export type CommissionCalculationContext = {
  sale: SaleRecord;
  rules: CommissionRule[];
};
