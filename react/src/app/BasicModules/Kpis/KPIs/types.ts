export type ExecutiveKpiStatus = 'healthy' | 'watch' | 'critical';
export type ExecutiveDiagnosisKind = 'strength' | 'symptom' | 'opportunity' | 'data_gap';
export type ExecutiveDiagnosisSectorId = 'people' | 'processes' | 'products' | 'finance';
export type ProductPortfolioQuadrant = 'star' | 'cash_cow' | 'question_mark' | 'dog' | 'unclassified';
export type ProductPortfolioStockStatus = 'not_tracked' | 'unavailable' | 'out_of_stock' | 'low_stock' | 'healthy';

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

export type ExecutiveDiagnosisFinding = {
  code: string;
  kind: ExecutiveDiagnosisKind;
  severity: ExecutiveKpiStatus;
  sourceDomainId: string;
  metricId: string;
  value: number | null;
  previousValue: number | null;
  unit: 'money' | 'percent' | 'count' | string;
  available: boolean;
  partial: boolean;
  basis: 'period' | 'periodEnd' | 'currentSnapshot' | string;
  weight: number;
  ownerModule: string;
};

export type ExecutiveDiagnosisSector = {
  id: ExecutiveDiagnosisSectorId;
  status: ExecutiveKpiStatus;
  score: number | null;
  coveragePercent: number;
  decisionReady: boolean;
  findings: ExecutiveDiagnosisFinding[];
};

export type ExecutiveKpiDiagnosis = {
  contractVersion: string;
  methodology: {
    id: 'indice-four-sectors' | string;
    version: string;
    minimumSectorCoveragePercent: number;
    healthyPoints: number;
    watchPoints: number;
    criticalPoints: number;
    scoreBasis: string;
  };
  status: ExecutiveKpiStatus;
  score: number | null;
  coveragePercent: number;
  decisionReady: boolean;
  prioritySectorId: ExecutiveDiagnosisSectorId;
  sectors: ExecutiveDiagnosisSector[];
  crossSectorFindings: Array<{
    code: string;
    severity: ExecutiveKpiStatus;
    sectorIds: ExecutiveDiagnosisSectorId[];
    evidenceFindingCodes: string[];
    ownerModule: string;
  }>;
  dataQuality: {
    decisionReady: boolean;
    issues: string[];
    unavailableFindingCodes: string[];
    generatedFrom: string;
    snapshotDate: string;
    note: string;
  };
};

export type ExecutiveProductPortfolioItem = {
  productId: number;
  productName: string;
  sku: string;
  category: string;
  quadrant: ProductPortfolioQuadrant;
  currentRevenue: number;
  previousRevenue: number;
  growthPercent: number | null;
  portfolioSharePercent: number;
  relativeCategorySharePercent: number;
  currentUnits: number;
  previousUnits: number;
  currentSaleCount: number;
  previousSaleCount: number;
  currentCost: number | null;
  contributionMargin: number | null;
  contributionMarginPercent: number | null;
  costAvailable: boolean;
  stockStatus: ProductPortfolioStockStatus;
  availableQuantity: number | null;
  minimumQuantity: number | null;
  stockLocations: number;
  partial: boolean;
};

export type ExecutiveProductPortfolio = {
  contractVersion: string;
  methodology: {
    id: string;
    version: string;
    shareBasis: string;
    growthBasis: string;
    highRelativeShareThresholdPercent: number;
    highGrowthThresholdPercent: number;
    displayGrowthFloorPercent: number;
    displayGrowthCeilingPercent: number;
    maximumDisplayedProducts: number;
    externalMarketDataIncluded: boolean;
  };
  preferredCurrency: string;
  currentRange: { from: string; to: string };
  comparisonRange: { from: string; to: string };
  totalRevenue: number;
  previousTotalRevenue: number;
  eligibleProducts: number;
  classifiedProducts: number;
  unclassifiedProducts: number;
  displayedProducts: number;
  truncated: boolean;
  quadrants: Array<{
    quadrant: ProductPortfolioQuadrant;
    productCount: number;
    revenue: number;
    revenueSharePercent: number;
  }>;
  items: ExecutiveProductPortfolioItem[];
  dataQuality: {
    decisionReady: boolean;
    partial: boolean;
    issues: string[];
    excludedCurrencies: string[];
    currentSalesWithoutLines: number;
    previousSalesWithoutLines: number;
    invalidLineRows: number;
    unlinkedProductRows: number;
    generatedFrom: string;
    snapshotDate: string;
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
  attendanceRecords?: number;
  taskCompletionRate: number;
  operatingProfit: number;
  operatingMargin: number;
  status: ExecutiveKpiStatus;
};

export type BusinessHealthQuadrant = 'engine' | 'contained_potential' | 'fragile_growth' | 'priority_intervention' | 'unclassified';
export type ProductProfitabilityQuadrant = 'winner' | 'sacrificed_volume' | 'hidden_gem' | 'catalog_drain' | 'unclassified';
export type InventoryIntelligenceQuadrant = 'stockout_risk' | 'balanced' | 'overstock' | 'stagnant' | 'unclassified';

export type DecisionMatrixQuality = {
  decisionReady: boolean;
  partial: boolean;
  issues: string[];
  generatedFrom: string;
  note: string;
};

export type ExecutiveDecisionMatrices = {
  contractVersion: string;
  preferredCurrency: string;
  range: { from: string; to: string };
  businessHealth: {
    highExecutionThreshold: number;
    highMarginThreshold: number;
    items: Array<{
      itemId: string;
      unitId?: number | null;
      unitName: string;
      businessId?: number | null;
      businessName: string;
      revenue: number;
      operatingProfit: number;
      operatingMarginPercent: number;
      executionScore: number;
      taskCompletionRate: number;
      attendanceRate: number;
      overdueTasks: number;
      overdueReceivables: number;
      quadrant: BusinessHealthQuadrant;
      decisionReady: boolean;
    }>;
    dataQuality: DecisionMatrixQuality;
  };
  productProfitability: {
    highVelocityThresholdPerDay: number;
    highMarginThresholdPercent: number;
    items: Array<{
      productId: number;
      productName: string;
      sku: string;
      category: string;
      revenue: number;
      cost: number | null;
      contributionMargin: number | null;
      contributionMarginPercent: number | null;
      unitsSold: number;
      salesVelocityPerDay: number;
      availableQuantity: number | null;
      stockStatus: ProductPortfolioStockStatus;
      quadrant: ProductProfitabilityQuadrant;
      decisionReady: boolean;
    }>;
    dataQuality: DecisionMatrixQuality;
  };
  inventoryIntelligence: {
    lowCoverageThresholdDays: number;
    highCoverageThresholdDays: number;
    items: Array<{
      productId: number;
      productName: string;
      sku: string;
      category: string;
      revenue: number;
      unitsSold: number;
      salesVelocityPerDay: number;
      availableQuantity: number | null;
      minimumQuantity: number | null;
      stockCoverageDays: number | null;
      stockStatus: ProductPortfolioStockStatus;
      quadrant: InventoryIntelligenceQuadrant;
      decisionReady: boolean;
    }>;
    dataQuality: DecisionMatrixQuality;
  };
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
    diagnosisContract: string;
    productPortfolioContract: string;
    decisionMatrixContract: string;
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
  diagnosis: ExecutiveKpiDiagnosis;
  productPortfolio: ExecutiveProductPortfolio;
  decisionMatrices: ExecutiveDecisionMatrices;
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
