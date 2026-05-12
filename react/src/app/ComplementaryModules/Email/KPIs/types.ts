export type ProcessKpiCategory =
  | 'main-product'
  | 'business'
  | 'operational'
  | 'project'
  | 'process'
  | 'performance';

export type ProcessKpiStatus = 'healthy' | 'watch' | 'critical';

export type ProcessKpiTrend = 'up' | 'down' | 'neutral';

export type ProcessKpiDisplayType =
  | 'percentage'
  | 'rating'
  | 'days'
  | 'tasks'
  | 'score'
  | 'ratio'
  | 'ranking';

export interface ProcessKpiCard {
  id: string;
  title: string;
  description: string;
  category: ProcessKpiCategory;
  displayType: ProcessKpiDisplayType;
  currentValue: number;
  targetValue: number;
  displayValue: string;
  targetLabel: string;
  trendLabel: string;
  trendDirection: ProcessKpiTrend;
  status: ProcessKpiStatus;
  unit: string;
  business: string;
  employee: string;
  supportText: string;
  secondaryValue?: number;
  inverseGoal?: boolean;
  featured?: boolean;
}

export type EmployeePerformanceStatus = 'top' | 'solid' | 'watch';

export interface ProcessEmployeePerformanceRow {
  employee: string;
  unit: string;
  business: string;
  performanceScore: number;
  compliance: number;
  rating: number;
  tasksCompleted: number;
  status: EmployeePerformanceStatus;
}
