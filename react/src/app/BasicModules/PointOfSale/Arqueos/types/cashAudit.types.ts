import type { CashClosingRecord, CashClosingStatus } from '../../shared/cashClosing.types';

export type CashAuditRecord = CashClosingRecord;
export type CashAuditStatusFilter = 'all' | CashClosingStatus;

export interface CashAuditFilters {
  search: string;
  company: string;
  businessUnit: string;
  business: string;
  cashRegister: string;
  user: string;
  month: string;
  status: CashAuditStatusFilter;
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
}

export interface CashAuditOptions {
  companies: string[];
  businessUnits: string[];
  businesses: string[];
  cashRegisters: string[];
  users: string[];
}
