type DashboardTranslator = Record<string, any>;

export interface DashboardKpiCardData {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
}

export const defaultDashboardKpiIds = [
  'weeklyRevenue',
  'netProfit',
  'activeClients',
  'activeEmployees',
  'pendingTasks',
  'monthlyExpenses',
] as const;

export function buildDashboardKpiDataMap(t: DashboardTranslator): Record<string, DashboardKpiCardData> {
  return {
    weeklyRevenue: { title: t.kpis.weeklyRevenue, value: '$45,200', change: `+6% ${t.kpis.vsWeekBefore}`, isPositive: true },
    netProfit: { title: t.kpis.netProfit, value: '$28,750', change: `+12% ${t.kpis.thisMonth}`, isPositive: true },
    activeClients: { title: t.kpis.activeClients, value: '245', change: `+18 ${t.kpis.newOnes}`, isPositive: true },
    activeEmployees: { title: t.kpis.activeEmployees, value: '18', change: `+2 ${t.kpis.thisMonth}`, isPositive: true },
    pendingTasks: { title: t.kpis.pendingTasks, value: '12', change: `3 ${t.kpis.dueToday}`, isPositive: false },
    monthlyExpenses: { title: t.kpis.monthlyExpenses, value: '$15,320', change: `+10% ${t.kpis.vsMonthBefore}`, isPositive: false },
    expensesByCategory: { title: 'Expenses by Category', value: '$8,450', change: '+5% vs last month', isPositive: false },
    pendingExpenses: { title: 'Pending Expenses', value: '8', change: '2 due today', isPositive: false },
    pettyCashBalance: { title: 'Petty Cash Balance', value: '$2,500', change: '-15% vs last month', isPositive: false },
    pettyCashExpenses: { title: 'Monthly Petty Cash Expenses', value: '$1,800', change: '+8% vs last month', isPositive: false },
    monthlyRevenue: { title: 'Monthly Revenue', value: '$180,500', change: '+15% vs last month', isPositive: true },
    averageTicket: { title: 'Average Ticket', value: '$736', change: '+3% vs last month', isPositive: true },
    salesConversion: { title: 'Sales Conversion Rate', value: '23%', change: '+2% vs last month', isPositive: true },
    dailySales: { title: 'Daily Sales', value: '$6,200', change: '+8% vs yesterday', isPositive: true },
    transactionsCount: { title: 'Transactions', value: '142', change: '+12 vs yesterday', isPositive: true },
    newHires: { title: 'New Hires', value: '3', change: 'this month', isPositive: true },
    employeeTurnover: { title: 'Employee Turnover', value: '5%', change: '-2% vs last month', isPositive: true },
    absenteeismRate: { title: 'Absenteeism Rate', value: '3%', change: '+1% vs last month', isPositive: false },
    payrollCost: { title: 'Payroll Cost', value: '$45,000', change: '+5% vs last month', isPositive: false },
    newClients: { title: 'New Clients', value: '28', change: '+10 vs last month', isPositive: true },
    clientRetention: { title: 'Client Retention', value: '92%', change: '+3% vs last month', isPositive: true },
    customerLifetimeValue: { title: 'Customer Lifetime Value', value: '$12,450', change: '+8% vs last month', isPositive: true },
    completedTasks: { title: 'Completed Tasks', value: '48', change: 'this week', isPositive: true },
    taskCompletionRate: { title: 'Task Completion Rate', value: '87%', change: '+5% vs last week', isPositive: true },
    overdueTasks: { title: 'Overdue Tasks', value: '5', change: '-2 vs last week', isPositive: true },
    inventoryValue: { title: 'Inventory Value', value: '$85,000', change: '+3% vs last month', isPositive: true },
    stockLevel: { title: 'Stock Level', value: '850', change: 'units', isPositive: true },
    lowStockItems: { title: 'Low Stock Items', value: '12', change: '+3 vs last week', isPositive: false },
    inventoryTurnover: { title: 'Inventory Turnover', value: '4.2x', change: '+0.3 vs last month', isPositive: true },
    pendingMaintenance: { title: 'Pending Maintenance', value: '6', change: '2 urgent', isPositive: false },
    maintenanceCost: { title: 'Maintenance Cost', value: '$3,200', change: '+12% vs last month', isPositive: false },
    equipmentUptime: { title: 'Equipment Uptime', value: '95%', change: '+2% vs last month', isPositive: true },
    invoicesIssued: { title: 'Invoices Issued', value: '156', change: 'this month', isPositive: true },
    pendingInvoices: { title: 'Pending Invoices', value: '23', change: '8 overdue', isPositive: false },
    collectionRate: { title: 'Collection Rate', value: '88%', change: '+3% vs last month', isPositive: true },
    employeeSatisfaction: { title: 'Employee Satisfaction', value: '8.2/10', change: '+0.5 vs last quarter', isPositive: true },
    engagementScore: { title: 'Engagement Score', value: '78%', change: '+6% vs last quarter', isPositive: true },
  };
}
