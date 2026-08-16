export type ExecutiveKpiStatus = 'healthy' | 'watch' | 'critical';

export type ExecutiveKpiCard = {
  id: string;
  title: string;
  value: number | string;
  description: string;
  status: ExecutiveKpiStatus;
};

export type ExecutiveDomainMetric = {
  id: string;
  label: string;
  value: number;
  previousValue: number | null;
  absoluteChange: number | null;
  percentChange: number | null;
  unit: 'money' | 'percent' | 'count' | string;
  direction: 'up' | 'down' | 'context' | string;
  status: ExecutiveKpiStatus;
  available: boolean;
  comparisonAvailable: boolean;
  partial: boolean;
  excludedCurrencies: string[];
  basis: 'period' | 'periodEnd' | 'currentSnapshot' | string;
  description: string;
};

export type ExecutiveDomainSignal = {
  id: string;
  severity: ExecutiveKpiStatus;
  message: string;
  value: number;
};

export type ExecutiveKpiDomain = {
  id: 'processTasks' | 'expenses' | 'pettyCash' | 'inventory' | 'sales' | string;
  label: string;
  status: ExecutiveKpiStatus;
  metrics: ExecutiveDomainMetric[];
  signals: ExecutiveDomainSignal[];
  dataQuality: {
    decisionReady: boolean;
    invalidRecords: number;
    issues: string[];
  };
};

export type ExecutiveKpiDomains = {
  contractVersion: string;
  comparisonRange: { from: string; to: string };
  preferredCurrency: string;
  items: ExecutiveKpiDomain[];
  dataQuality: {
    decisionReady: boolean;
    partial: boolean;
    excludedCurrencies: string[];
    issues: string[];
    generatedFrom: string;
    generatedAt: string;
    snapshotDate: string;
    exchangeRateDate: string;
    note: string;
  };
};

export type ExecutiveUnitRow = {
  unitId?: number | null;
  unitName: string;
  businessId?: number | null;
  businessName: string;
  salesCount: number;
  salesTotal: number;
  collectedTotal: number;
  expensesCount: number;
  expensesTotal: number;
  payablesTotal: number;
  overduePayables: number;
  receivablesTotal: number;
  overdueReceivables: number;
  pettyCashFunds: number;
  pettyCashBalance: number;
  totalTasks: number;
  closedTasks: number;
  overdueTasks: number;
  attendanceRate: number;
  taskCompletionRate: number;
  operatingProfit: number;
  operatingMargin: number;
  status: ExecutiveKpiStatus;
};

export type ExecutiveBreakdownRow = {
  source?: string;
  accountName?: string;
  count: number;
  total: number;
};

export type ExecutiveAlert = {
  status: ExecutiveKpiStatus;
  title: string;
  description: string;
};

export type ExecutivePersonSignal = {
  collaboratorId?: number | null;
  collaboratorName: string;
  unitId?: number | null;
  unitName: string;
  businessId?: number | null;
  businessName: string;
  totalTasks?: number;
  closedTasks?: number;
  overdueTasks?: number;
  averageCompletion?: number;
  productivityScore?: number;
  attendanceRecords?: number;
  absences?: number;
  lateDays?: number;
  attendanceRate?: number;
  status: ExecutiveKpiStatus;
};

export type ExecutiveKpiResponse = {
  range: {
    from: string;
    to: string;
    period: string;
  };
  context: {
    currency: string;
    nativeCurrencies: string[];
    generatedAt: string;
    scopeLabel: string;
    authoritativeContract: string;
  };
  summary: Record<string, number>;
  kpiCards: ExecutiveKpiCard[];
  unitRows: ExecutiveUnitRow[];
  salesBySource: ExecutiveBreakdownRow[];
  expensesByAccount: ExecutiveBreakdownRow[];
  lowProductivity: ExecutivePersonSignal[];
  absenteeism: ExecutivePersonSignal[];
  pettyCash: {
    funds: number;
    limitTotal: number;
    balanceTotal: number;
    attention: number;
  };
  alerts: ExecutiveAlert[];
  rankings: {
    topSales: ExecutiveUnitRow[];
    topExpenses: ExecutiveUnitRow[];
    topProfit: ExecutiveUnitRow[];
    topReceivables: ExecutiveUnitRow[];
    attention: ExecutiveUnitRow[];
  };
  domains: ExecutiveKpiDomains;
};

export type ExecutivePanelPeriod = 'monthly' | 'bimonthly' | 'quarterly' | 'semester' | 'annual' | 'custom';

export type ExecutivePanelFilters = {
  search: string;
  unitId: string;
  businessId: string;
  period: ExecutivePanelPeriod;
  from: string;
  to: string;
  risk: string;
};
