import type { KPIItem } from '../components/KPIConfiguration';
import type { MainDashboardTranslations } from './translations';

export interface DashboardKpiCardData {
  id?: string;
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  tone?: 'positive' | 'negative' | 'neutral';
}

export interface DashboardKpiModuleLabels {
  expenses: string;
  pettyCash: string;
  sales: string;
  pointOfSale: string;
  humanResources: string;
  processesTasks: string;
  inventory: string;
  maintenance: string;
  invoicing: string;
  workClimate: string;
}

export const defaultDashboardKpiIds = [
  'activeEmployees',
  'pendingTasks',
  'monthlyExpenses',
  'pendingExpenses',
  'overdueExpenses',
  'completedTasks',
  'taskCompletionRate',
  'overdueTasks',
  'newHires',
] as const;

const liveDashboardKpiIds = new Set<string>([
  'weeklyRevenue',
  'dailyExchangeRate',
  'monthlyRevenue',
  'averageTicket',
  'salesConversion',
  'activeClients',
  'monthlyExpenses',
  'pendingExpenses',
  'overdueExpenses',
  'budgetAvailable',
  'budgetUtilization',
  'cashDue7Days',
  'activeEmployees',
  'newHires',
  'absenteeismRate',
  'payrollCost',
  'pendingTasks',
  'completedTasks',
  'taskCompletionRate',
  'overdueTasks',
]);

export function buildDashboardKpiDataMap(copy: MainDashboardTranslations): Record<string, DashboardKpiCardData> {
  const { kpis } = copy;

  return {
    weeklyRevenue: { title: kpis.weeklyRevenue.title, value: '$45,200', change: kpis.weeklyRevenue.change, isPositive: true },
    dailyExchangeRate: { title: kpis.dailyExchangeRate.title, value: '1 USD', change: kpis.dailyExchangeRate.change, isPositive: true, tone: 'neutral' },
    netProfit: { title: kpis.netProfit.title, value: '$28,750', change: kpis.netProfit.change, isPositive: true },
    activeClients: { title: kpis.activeClients.title, value: '245', change: kpis.activeClients.change, isPositive: true },
    activeEmployees: { title: kpis.activeEmployees.title, value: '18', change: kpis.activeEmployees.change, isPositive: true },
    pendingTasks: { title: kpis.pendingTasks.title, value: '12', change: kpis.pendingTasks.change, isPositive: false },
    monthlyExpenses: { title: kpis.monthlyExpenses.title, value: '$15,320', change: kpis.monthlyExpenses.change, isPositive: false },
    expensesByCategory: { title: kpis.expensesByCategory.title, value: '$8,450', change: kpis.expensesByCategory.change, isPositive: false },
    pendingExpenses: { title: kpis.pendingExpenses.title, value: '8', change: kpis.pendingExpenses.change, isPositive: false },
    overdueExpenses: { title: kpis.overdueExpenses.title, value: '$0', change: kpis.overdueExpenses.change, isPositive: true },
    budgetAvailable: { title: kpis.budgetAvailable.title, value: '$0', change: kpis.budgetAvailable.change, isPositive: true },
    budgetUtilization: { title: kpis.budgetUtilization.title, value: '0%', change: kpis.budgetUtilization.change, isPositive: true },
    cashDue7Days: { title: kpis.cashDue7Days.title, value: '$0', change: kpis.cashDue7Days.change, isPositive: true },
    pettyCashBalance: { title: kpis.pettyCashBalance.title, value: '$2,500', change: kpis.pettyCashBalance.change, isPositive: false },
    pettyCashExpenses: { title: kpis.pettyCashExpenses.title, value: '$1,800', change: kpis.pettyCashExpenses.change, isPositive: false },
    monthlyRevenue: { title: kpis.monthlyRevenue.title, value: '$180,500', change: kpis.monthlyRevenue.change, isPositive: true },
    averageTicket: { title: kpis.averageTicket.title, value: '$736', change: kpis.averageTicket.change, isPositive: true },
    salesConversion: { title: kpis.salesConversion.title, value: '23%', change: kpis.salesConversion.change, isPositive: true },
    dailySales: { title: kpis.dailySales.title, value: '$6,200', change: kpis.dailySales.change, isPositive: true },
    transactionsCount: { title: kpis.transactionsCount.title, value: '142', change: kpis.transactionsCount.change, isPositive: true },
    newHires: { title: kpis.newHires.title, value: '3', change: kpis.newHires.change, isPositive: true },
    employeeTurnover: { title: kpis.employeeTurnover.title, value: '5%', change: kpis.employeeTurnover.change, isPositive: true },
    absenteeismRate: { title: kpis.absenteeismRate.title, value: '3%', change: kpis.absenteeismRate.change, isPositive: false },
    payrollCost: { title: kpis.payrollCost.title, value: '$45,000', change: kpis.payrollCost.change, isPositive: false },
    newClients: { title: kpis.newClients.title, value: '28', change: kpis.newClients.change, isPositive: true },
    clientRetention: { title: kpis.clientRetention.title, value: '92%', change: kpis.clientRetention.change, isPositive: true },
    customerLifetimeValue: { title: kpis.customerLifetimeValue.title, value: '$12,450', change: kpis.customerLifetimeValue.change, isPositive: true },
    completedTasks: { title: kpis.completedTasks.title, value: '48', change: kpis.completedTasks.change, isPositive: true },
    taskCompletionRate: { title: kpis.taskCompletionRate.title, value: '87%', change: kpis.taskCompletionRate.change, isPositive: true },
    overdueTasks: { title: kpis.overdueTasks.title, value: '5', change: kpis.overdueTasks.change, isPositive: true },
    inventoryValue: { title: kpis.inventoryValue.title, value: '$85,000', change: kpis.inventoryValue.change, isPositive: true },
    stockLevel: { title: kpis.stockLevel.title, value: '850', change: kpis.stockLevel.change, isPositive: true },
    lowStockItems: { title: kpis.lowStockItems.title, value: '12', change: kpis.lowStockItems.change, isPositive: false },
    inventoryTurnover: { title: kpis.inventoryTurnover.title, value: '4.2x', change: kpis.inventoryTurnover.change, isPositive: true },
    pendingMaintenance: { title: kpis.pendingMaintenance.title, value: '6', change: kpis.pendingMaintenance.change, isPositive: false },
    maintenanceCost: { title: kpis.maintenanceCost.title, value: '$3,200', change: kpis.maintenanceCost.change, isPositive: false },
    equipmentUptime: { title: kpis.equipmentUptime.title, value: '95%', change: kpis.equipmentUptime.change, isPositive: true },
    invoicesIssued: { title: kpis.invoicesIssued.title, value: '156', change: kpis.invoicesIssued.change, isPositive: true },
    pendingInvoices: { title: kpis.pendingInvoices.title, value: '23', change: kpis.pendingInvoices.change, isPositive: false },
    collectionRate: { title: kpis.collectionRate.title, value: '88%', change: kpis.collectionRate.change, isPositive: true },
    employeeSatisfaction: { title: kpis.employeeSatisfaction.title, value: '8.2/10', change: kpis.employeeSatisfaction.change, isPositive: true },
    engagementScore: { title: kpis.engagementScore.title, value: '78%', change: kpis.engagementScore.change, isPositive: true },
  };
}

export function buildDashboardAvailableKpis(
  copy: MainDashboardTranslations,
  modules: DashboardKpiModuleLabels,
): KPIItem[] {
  const { kpis } = copy;

  const items: KPIItem[] = [
    { id: 'monthlyExpenses', title: kpis.monthlyExpenses.title, module: modules.expenses, moduleEmoji: '💸', moduleColor: 'green', category: 'financial' },
    { id: 'pendingExpenses', title: kpis.pendingExpenses.title, module: modules.expenses, moduleEmoji: '💸', moduleColor: 'green', category: 'financial' },
    { id: 'overdueExpenses', title: kpis.overdueExpenses.title, module: modules.expenses, moduleEmoji: '💸', moduleColor: 'green', category: 'financial' },
    { id: 'budgetAvailable', title: kpis.budgetAvailable.title, module: modules.expenses, moduleEmoji: '💸', moduleColor: 'green', category: 'financial' },
    { id: 'budgetUtilization', title: kpis.budgetUtilization.title, module: modules.expenses, moduleEmoji: '💸', moduleColor: 'green', category: 'financial' },
    { id: 'cashDue7Days', title: kpis.cashDue7Days.title, module: modules.expenses, moduleEmoji: '💸', moduleColor: 'green', category: 'financial' },
    { id: 'expensesByCategory', title: kpis.expensesByCategory.title, module: modules.expenses, moduleEmoji: '💸', moduleColor: 'green', category: 'financial' },
    { id: 'pettyCashBalance', title: kpis.pettyCashBalance.title, module: modules.pettyCash, moduleEmoji: '💳', moduleColor: 'green', category: 'financial' },
    { id: 'pettyCashExpenses', title: kpis.pettyCashExpenses.title, module: modules.pettyCash, moduleEmoji: '💳', moduleColor: 'green', category: 'financial' },
    { id: 'weeklyRevenue', title: kpis.weeklyRevenue.title, module: modules.sales, moduleEmoji: '💼', moduleColor: 'coral', category: 'sales' },
    { id: 'dailyExchangeRate', title: kpis.dailyExchangeRate.title, module: 'Sistema', moduleEmoji: '💱', moduleColor: 'aqua', category: 'financial' },
    { id: 'monthlyRevenue', title: kpis.monthlyRevenue.title, module: modules.sales, moduleEmoji: '💼', moduleColor: 'coral', category: 'sales' },
    { id: 'netProfit', title: kpis.netProfit.title, module: modules.sales, moduleEmoji: '💼', moduleColor: 'coral', category: 'financial' },
    { id: 'averageTicket', title: kpis.averageTicket.title, module: modules.sales, moduleEmoji: '💼', moduleColor: 'coral', category: 'sales' },
    { id: 'salesConversion', title: kpis.salesConversion.title, module: modules.sales, moduleEmoji: '💼', moduleColor: 'coral', category: 'sales' },
    { id: 'dailySales', title: kpis.dailySales.title, module: modules.pointOfSale, moduleEmoji: '🛒', moduleColor: 'orange', category: 'sales' },
    { id: 'transactionsCount', title: kpis.transactionsCount.title, module: modules.pointOfSale, moduleEmoji: '🛒', moduleColor: 'orange', category: 'sales' },
    { id: 'activeEmployees', title: kpis.activeEmployees.title, module: modules.humanResources, moduleEmoji: '👥', moduleColor: 'aqua', category: 'people' },
    { id: 'newHires', title: kpis.newHires.title, module: modules.humanResources, moduleEmoji: '👥', moduleColor: 'aqua', category: 'people' },
    { id: 'employeeTurnover', title: kpis.employeeTurnover.title, module: modules.humanResources, moduleEmoji: '👥', moduleColor: 'aqua', category: 'people' },
    { id: 'absenteeismRate', title: kpis.absenteeismRate.title, module: modules.humanResources, moduleEmoji: '👥', moduleColor: 'aqua', category: 'people' },
    { id: 'payrollCost', title: kpis.payrollCost.title, module: modules.humanResources, moduleEmoji: '👥', moduleColor: 'aqua', category: 'financial' },
    { id: 'activeClients', title: kpis.activeClients.title, module: modules.sales, moduleEmoji: '💼', moduleColor: 'coral', category: 'sales' },
    { id: 'newClients', title: kpis.newClients.title, module: modules.sales, moduleEmoji: '💼', moduleColor: 'coral', category: 'sales' },
    { id: 'clientRetention', title: kpis.clientRetention.title, module: modules.sales, moduleEmoji: '💼', moduleColor: 'coral', category: 'sales' },
    { id: 'customerLifetimeValue', title: kpis.customerLifetimeValue.title, module: modules.sales, moduleEmoji: '💼', moduleColor: 'coral', category: 'sales' },
    { id: 'pendingTasks', title: kpis.pendingTasks.title, module: modules.processesTasks, moduleEmoji: '✅', moduleColor: 'yellow', category: 'operational' },
    { id: 'completedTasks', title: kpis.completedTasks.title, module: modules.processesTasks, moduleEmoji: '✅', moduleColor: 'yellow', category: 'operational' },
    { id: 'taskCompletionRate', title: kpis.taskCompletionRate.title, module: modules.processesTasks, moduleEmoji: '✅', moduleColor: 'yellow', category: 'operational' },
    { id: 'overdueTasks', title: kpis.overdueTasks.title, module: modules.processesTasks, moduleEmoji: '✅', moduleColor: 'yellow', category: 'operational' },
    { id: 'inventoryValue', title: kpis.inventoryValue.title, module: modules.inventory, moduleEmoji: '📦', moduleColor: 'coral', category: 'inventory' },
    { id: 'stockLevel', title: kpis.stockLevel.title, module: modules.inventory, moduleEmoji: '📦', moduleColor: 'coral', category: 'inventory' },
    { id: 'lowStockItems', title: kpis.lowStockItems.title, module: modules.inventory, moduleEmoji: '📦', moduleColor: 'coral', category: 'inventory' },
    { id: 'inventoryTurnover', title: kpis.inventoryTurnover.title, module: modules.inventory, moduleEmoji: '📦', moduleColor: 'coral', category: 'inventory' },
    { id: 'pendingMaintenance', title: kpis.pendingMaintenance.title, module: modules.maintenance, moduleEmoji: '🔧', moduleColor: 'gray', category: 'operational' },
    { id: 'maintenanceCost', title: kpis.maintenanceCost.title, module: modules.maintenance, moduleEmoji: '🔧', moduleColor: 'gray', category: 'financial' },
    { id: 'equipmentUptime', title: kpis.equipmentUptime.title, module: modules.maintenance, moduleEmoji: '🔧', moduleColor: 'gray', category: 'operational' },
    { id: 'invoicesIssued', title: kpis.invoicesIssued.title, module: modules.invoicing, moduleEmoji: '🧾', moduleColor: 'gray', category: 'financial' },
    { id: 'pendingInvoices', title: kpis.pendingInvoices.title, module: modules.invoicing, moduleEmoji: '🧾', moduleColor: 'gray', category: 'financial' },
    { id: 'collectionRate', title: kpis.collectionRate.title, module: modules.invoicing, moduleEmoji: '🧾', moduleColor: 'gray', category: 'financial' },
    { id: 'employeeSatisfaction', title: kpis.employeeSatisfaction.title, module: modules.workClimate, moduleEmoji: '😊', moduleColor: 'gray', category: 'people' },
    { id: 'engagementScore', title: kpis.engagementScore.title, module: modules.workClimate, moduleEmoji: '😊', moduleColor: 'gray', category: 'people' },
  ];

  return items.filter((kpi) => liveDashboardKpiIds.has(kpi.id));
}
