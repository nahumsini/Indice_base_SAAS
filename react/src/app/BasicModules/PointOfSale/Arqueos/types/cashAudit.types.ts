import type { CashClosingRecord, CashClosingStatus } from '../../shared/cashClosing.types';

export type CashAuditReviewStatus = 'pending' | 'in_review' | 'resolved';
export type CashAuditFocus = 'attention' | 'difference' | 'reviewed' | 'all';

export interface CashAuditRecord extends CashClosingRecord {
  auditStatus: CashAuditReviewStatus;
  auditNote?: string;
  reviewedAt?: Date;
  requiresReview: boolean;
}

export type CashAuditStatusFilter = 'all' | CashClosingStatus;
export type CashAuditReviewStatusFilter = 'all' | CashAuditReviewStatus;

export interface CashAuditFilters {
  search: string;
  focus: CashAuditFocus;
  company: string;
  businessUnit: string;
  business: string;
  cashRegister: string;
  user: string;
  month: string;
  status: CashAuditStatusFilter;
  reviewStatus: CashAuditReviewStatusFilter;
}

export interface CashAuditKpis {
  totalSales: number;
  expectedTotal: number;
  countedTotal: number;
  netDifference: number;
  closings: number;
  balanced: number;
  over: number;
  short: number;
  pending: number;
  inReview: number;
  resolved: number;
  requiresReview: number;
}

export interface CashAuditOptions {
  companies: string[];
  businessUnits: string[];
  businesses: string[];
  cashRegisters: string[];
  users: string[];
}
