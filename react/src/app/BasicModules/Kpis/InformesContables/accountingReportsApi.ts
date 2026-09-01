import { apiClient } from '../../../lib/apiClient';

export type AccountingViewId = 'overview' | 'statements' | 'trial-balance' | 'close-quality';

export type AccountingStatementLine = {
  code: string;
  label: string;
  level: number;
  subtotal: boolean;
  current: number;
  comparative: number;
  variance: number;
  variancePercent: number;
  tone: 'UP' | 'DOWN' | 'FLAT';
};

export type AccountingStatement = {
  id: string;
  title: string;
  subtitle: string;
  standardReference: string;
  lines: AccountingStatementLine[];
  internallyConsistent: boolean;
};

export type AccountingReport = {
  context: {
    from: string;
    to: string;
    comparativeFrom: string;
    comparativeTo: string;
    unitId: number | null;
    businessId: number | null;
    reportingFramework: string;
    frameworkEffectiveDate: string;
    functionalCurrency: string;
    presentationCurrency: string;
    periodKey: string;
    periodStatus: 'OPEN' | 'REVIEW' | 'CLOSED' | 'NOT_CREATED';
    generatedAt: string;
  };
  readiness: {
    status: 'PRELIMINARY' | 'READY' | 'CLOSED';
    decisionReady: boolean;
    blockingFindings: number;
    warnings: number;
    postedEntries: number;
    pendingSourceEvents: number;
    coveragePercent: number;
    message: string;
  };
  headline: {
    revenue: number;
    grossProfit: number;
    operatingProfit: number;
    netProfit: number;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    netCashChange: number;
  };
  organization: {
    units: Array<{
      id: number;
      name: string;
      businesses: Array<{ id: number; name: string }>;
    }>;
  };
  statements: AccountingStatement[];
  trialBalance: Array<{
    accountId: number;
    accountCode: string;
    accountName: string;
    accountType: string;
    debit: number;
    credit: number;
    balance: number;
    journalCount: number;
  }>;
  sourceCoverage: Array<{
    module: 'sales' | 'expenses' | 'receivables' | 'payroll';
    eligible: number;
    posted: number;
    blocked: number;
    coveragePercent: number;
    status: 'READY' | 'PENDING' | 'BLOCKED';
  }>;
  findings: Array<{
    code: string;
    severity: 'BLOCKING' | 'WARNING' | 'INFO';
    title: string;
    detail: string;
    action: string;
    sourceModule: string;
    affectedRecords: number;
  }>;
};

export type SynchronizeResult = {
  syncRunId: number;
  status: 'COMPLETED' | 'COMPLETED_WITH_ISSUES';
  discovered: number;
  posted: number;
  alreadyPosted: number;
  blocked: number;
  findings: AccountingReport['findings'];
  completedAt: string;
};

export type AccountingAnalytics = {
  context: {
    from: string;
    to: string;
    presentationCurrency: string;
    trendMonths: number;
    generatedAt: string;
  };
  kpis: Array<{
    id: 'REVENUE' | 'GROSS_PROFIT' | 'OPERATING_PROFIT' | 'NET_MARGIN' | 'CLOSING_CASH' | 'WORKING_CAPITAL' | 'CURRENT_RATIO' | 'ACCOUNTING_COVERAGE';
    value: number | null;
    comparativeValue: number | null;
    changePercent: number | null;
    valueType: 'MONEY' | 'PERCENT' | 'RATIO';
    availability: 'AVAILABLE' | 'NOT_AVAILABLE';
    targetStatus: 'NOT_CONFIGURED';
  }>;
  profitBridge: AccountingBridgePoint[];
  cashBridge: AccountingBridgePoint[];
  monthlyTrend: Array<{
    periodKey: string;
    revenue: number;
    grossProfit: number;
    operatingProfit: number;
    netProfit: number;
  }>;
  organizationComparison: Array<{
    unitId: number;
    unitName: string;
    revenue: number;
    grossProfit: number;
    operatingProfit: number;
    netProfit: number;
  }>;
  insights: Array<{
    code: string;
    severity: 'BLOCKING' | 'WARNING' | 'INFO';
    primaryMetricId: string;
    primaryValue: number;
    actionCode: string;
  }>;
};

export type AccountingBridgePoint = {
  code: string;
  amount: number;
  cumulativeAmount: number;
  kind: 'CHANGE' | 'TOTAL';
};

export type AccountingDrilldown = {
  context: {
    from: string;
    to: string;
    unitId: number | null;
    businessId: number | null;
    presentationCurrency: string;
    generatedAt: string;
  };
  subject: { type: 'STATEMENT_LINE' | 'ACCOUNT'; id: string; label: string };
  summary: { debit: number; credit: number; netAmount: number; journalCount: number; accountCount: number };
  rows: Array<{
    lineId: number;
    journalEntryId: number;
    entryNumber: string;
    entryDate: string;
    entryDescription: string;
    sourceModule: string;
    sourceType: string;
    sourceId: string;
    accountId: number;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    netAmount: number;
    unitId: number | null;
    unitName: string | null;
    businessId: number | null;
    businessName: string | null;
    sourceDocumentReference: string | null;
  }>;
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
};

const basePath = '/api/v1/kpis/accounting-reports';

export const accountingReportsApi = {
  get(params: { from: string; to: string; unitId?: string; businessId?: string }) {
    const search = new URLSearchParams({ from: params.from, to: params.to });
    if (params.unitId) search.set('unitId', params.unitId);
    if (params.businessId) search.set('businessId', params.businessId);
    return apiClient<AccountingReport>(`${basePath}?${search.toString()}`);
  },
  analytics(params: { from: string; to: string; unitId?: string; businessId?: string; months?: number }) {
    const search = scopeSearch(params);
    search.set('months', String(params.months ?? 12));
    return apiClient<AccountingAnalytics>(`${basePath}/analytics?${search.toString()}`);
  },
  drilldown(params: {
    from: string;
    to: string;
    unitId?: string;
    businessId?: string;
    subjectType: 'STATEMENT_LINE' | 'ACCOUNT';
    subjectId: string;
    page: number;
    pageSize: number;
    sortBy?: 'entryDate' | 'entryNumber' | 'accountCode' | 'debit' | 'credit';
    sortDirection?: 'asc' | 'desc';
  }) {
    const search = scopeSearch(params);
    search.set('subjectType', params.subjectType);
    search.set('subjectId', params.subjectId);
    search.set('page', String(params.page));
    search.set('pageSize', String(params.pageSize));
    search.set('sortBy', params.sortBy ?? 'entryDate');
    search.set('sortDirection', params.sortDirection ?? 'desc');
    return apiClient<AccountingDrilldown>(`${basePath}/drilldown?${search.toString()}`);
  },
  synchronize(from: string, to: string) {
    return apiClient<SynchronizeResult>(`${basePath}/synchronize`, {
      method: 'POST',
      body: JSON.stringify({ from, to }),
    });
  },
  close(periodKey: string) {
    return apiClient<{ periodKey: string; status: string; changedAt: string; message: string }>(
      `${basePath}/periods/${encodeURIComponent(periodKey)}/close`,
      { method: 'POST', body: JSON.stringify({}) },
    );
  },
  reopen(periodKey: string, reason: string) {
    return apiClient<{ periodKey: string; status: string; changedAt: string; message: string }>(
      `${basePath}/periods/${encodeURIComponent(periodKey)}/reopen`,
      { method: 'POST', body: JSON.stringify({ reason }) },
    );
  },
};

function scopeSearch(params: { from: string; to: string; unitId?: string; businessId?: string }) {
  const search = new URLSearchParams({ from: params.from, to: params.to });
  if (params.unitId) search.set('unitId', params.unitId);
  if (params.businessId) search.set('businessId', params.businessId);
  return search;
}
