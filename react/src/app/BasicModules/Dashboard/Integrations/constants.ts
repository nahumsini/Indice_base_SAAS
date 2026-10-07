export type AiScopeKind = 'read' | 'action';

export const INDICE_MCP_SERVER_URL = 'https://app.indiceapp.com/api/v1/ai/mcp';

export const AI_SCOPE_DEFINITIONS = [
  { code: 'pos.registers.manage', group: 'actions', kind: 'action' },
  { code: 'pos.shifts.manage', group: 'actions', kind: 'action' },
  { code: 'pos.cash.manage', group: 'actions', kind: 'action' },
  { code: 'pos.terminal.manage', group: 'actions', kind: 'action' },
  { code: 'pos.settlements.manage', group: 'actions', kind: 'action' },
  { code: 'pos.orders.manage', group: 'actions', kind: 'action' },
  { code: 'sales.commissions.cut', group: 'actions', kind: 'action' },
  { code: 'sales.commissions.schedule', group: 'actions', kind: 'action' },
  { code: 'inventory.providers.manage', group: 'actions', kind: 'action' },
  { code: 'inventory.discounts.manage', group: 'actions', kind: 'action' },
  { code: 'inventory.procurement.manage', group: 'actions', kind: 'action' },
  { code: 'inventory.procurement.approve', group: 'actions', kind: 'action' },
  { code: 'inventory.procurement.receive', group: 'actions', kind: 'action' },
  { code: 'inventory.invoices.manage', group: 'actions', kind: 'action' },
  { code: 'pos.checkout', group: 'actions', kind: 'action' },
  { code: 'pos.inventory.receive', group: 'actions', kind: 'action' },
  { code: 'pos.returns.manage', group: 'actions', kind: 'action' },
  { code: 'sales.manage', group: 'actions', kind: 'action' },
  { code: 'sales.collections.confirm', group: 'actions', kind: 'action' },
  { code: 'sales.cancel', group: 'actions', kind: 'action' },
  { code: 'sales.contracts.manage', group: 'actions', kind: 'action' },
  { code: 'sales.followups.manage', group: 'actions', kind: 'action' },
  { code: 'sales.commissions.manage', group: 'actions', kind: 'action' },
  { code: 'inventory.products.manage', group: 'actions', kind: 'action' },
  { code: 'inventory.warehouses.manage', group: 'actions', kind: 'action' },
  { code: 'inventory.stock.manage', group: 'actions', kind: 'action' },
  { code: 'inventory.movements.create', group: 'actions', kind: 'action' },
  { code: 'inventory.movements.cancel', group: 'actions', kind: 'action' },
  { code: 'files.read', group: 'actions', kind: 'action' },
  { code: 'files.attach', group: 'actions', kind: 'action' },
  { code: 'opportunities.read', group: 'sales', kind: 'read' },
  { code: 'quotes.read', group: 'sales', kind: 'read' },
  { code: 'commercial.references:read', group: 'sales', kind: 'read' },
  { code: 'customers.create', group: 'actions', kind: 'action' },
  { code: 'customers.update', group: 'actions', kind: 'action' },
  { code: 'opportunities.create', group: 'actions', kind: 'action' },
  { code: 'opportunities.update', group: 'actions', kind: 'action' },
  { code: 'quotes.create', group: 'actions', kind: 'action' },
  { code: 'quotes.update', group: 'actions', kind: 'action' },

  { code: 'sales.today:read', group: 'overview', kind: 'read' },
  { code: 'business.snapshot:read', group: 'overview', kind: 'read' },
  { code: 'business.context:read', group: 'overview', kind: 'read' },
  { code: 'sales.read', group: 'sales', kind: 'read' },
  { code: 'pos.read', group: 'sales', kind: 'read' },
  { code: 'inventory.read', group: 'inventory', kind: 'read' },
  { code: 'hr.people:read', group: 'people', kind: 'read' },
  { code: 'hr.people.details:read', group: 'people', kind: 'read' },
  { code: 'hr.assets.read', group: 'people', kind: 'read' },
  { code: 'hr.records.read', group: 'people', kind: 'read' },
  { code: 'hr.announcements.read', group: 'people', kind: 'read' },
  { code: 'hr.people.terminate', group: 'actions', kind: 'action' },
  { code: 'hr.records.manage', group: 'actions', kind: 'action' },
  { code: 'hr.announcements.respond', group: 'actions', kind: 'action' },
  { code: 'hr.permissions.self:read', group: 'people', kind: 'read' },
  { code: 'hr.permissions.read', group: 'people', kind: 'read' },
  { code: 'hr.permissions.request', group: 'actions', kind: 'action' },
  { code: 'hr.permissions.review', group: 'actions', kind: 'action' },
  { code: 'hr.incentives.read', group: 'people', kind: 'read' },
  { code: 'hr.incentives.manage', group: 'actions', kind: 'action' },
  { code: 'hr.announcements.receipts:read', group: 'people', kind: 'read' },
  { code: 'hr.people.manage', group: 'actions', kind: 'action' },
  { code: 'hr.people.import', group: 'actions', kind: 'action' },
  { code: 'hr.assets.manage', group: 'actions', kind: 'action' },
  { code: 'hr.announcements.manage', group: 'actions', kind: 'action' },
  { code: 'hr.attendance:read', group: 'people', kind: 'read' },
  { code: 'hr.control.read', group: 'people', kind: 'read' },
  { code: 'hr.control.manage', group: 'actions', kind: 'action' },
  { code: 'hr.attendance.correct', group: 'actions', kind: 'action' },
  { code: 'tasks.read', group: 'work', kind: 'read' },
  { code: 'hr.kpis:read', group: 'people', kind: 'read' },
  { code: 'hr.payroll.read', group: 'people', kind: 'read' },
  { code: 'hr.payroll.prepare', group: 'actions', kind: 'action' },
  { code: 'hr.payroll.approve', group: 'actions', kind: 'action' },
  { code: 'hr.payroll.pay', group: 'actions', kind: 'action' },
  { code: 'projects.read', group: 'work', kind: 'read' },
  { code: 'processes.read', group: 'work', kind: 'read' },
  { code: 'projects.manage', group: 'actions', kind: 'action' },
  { code: 'processes.manage', group: 'actions', kind: 'action' },
  { code: 'processes.run', group: 'actions', kind: 'action' },
  { code: 'tasks.kpis:read', group: 'work', kind: 'read' },
  { code: 'expenses.read', group: 'finance', kind: 'read' },
  { code: 'petty_cash.read', group: 'finance', kind: 'read' },
  { code: 'receivables.read', group: 'finance', kind: 'read' },
  { code: 'finance.references:read', group: 'finance', kind: 'read' },
  { code: 'customers.read', group: 'sales', kind: 'read' },
  { code: 'providers.read', group: 'finance', kind: 'read' },
  { code: 'warehouses.read', group: 'inventory', kind: 'read' },
  { code: 'budget_lines.read', group: 'finance', kind: 'read' },
  { code: 'accounting_accounts.read', group: 'finance', kind: 'read' },
  { code: 'tasks.delegate', group: 'actions', kind: 'action' },
  { code: 'tasks.update', group: 'actions', kind: 'action' },
  { code: 'tasks.organize', group: 'actions', kind: 'action' },
  { code: 'learning.read', group: 'people', kind: 'read' },
  { code: 'learning.manage', group: 'actions', kind: 'action' },
  { code: 'tasks.operate', group: 'actions', kind: 'action' },
  { code: 'tasks.audit', group: 'actions', kind: 'action' },
  { code: 'tasks.create', group: 'actions', kind: 'action' },
  { code: 'expenses.accounting.manage', group: 'actions', kind: 'action' },
  { code: 'expenses.accounts.manage', group: 'actions', kind: 'action' },
  { code: 'expenses.providers.manage', group: 'actions', kind: 'action' },
  { code: 'expenses.budgets.manage', group: 'actions', kind: 'action' },
  { code: 'expenses.manage', group: 'actions', kind: 'action' },
  { code: 'expenses.approve', group: 'actions', kind: 'action' },
  { code: 'expenses.pay', group: 'actions', kind: 'action' },
  { code: 'expenses.reverse', group: 'actions', kind: 'action' },
  { code: 'petty_cash.funds.manage', group: 'actions', kind: 'action' },
  { code: 'petty_cash.receipts.manage', group: 'actions', kind: 'action' },
  { code: 'petty_cash.receipts.approve', group: 'actions', kind: 'action' },
  { code: 'petty_cash.statements.close', group: 'actions', kind: 'action' },
  { code: 'expenses.create', group: 'actions', kind: 'action' },
  { code: 'petty_cash.expense:create', group: 'actions', kind: 'action' },
  { code: 'petty_cash.deposit:create', group: 'actions', kind: 'action' },
] as const;

export type AiScopeCode = typeof AI_SCOPE_DEFINITIONS[number]['code'];
export type ReadScopeGroup = 'overview' | 'sales' | 'inventory' | 'people' | 'work' | 'finance';
export type QuestionCategory = 'pulse' | 'money' | 'products' | 'team';
export type QuestionIdeaId =
  | 'salesToday'
  | 'salesDetail'
  | 'overdueExpenses'
  | 'receivables'
  | 'inventoryRisk'
  | 'productDetail'
  | 'employeeTasks'
  | 'attendance';

export const READ_SCOPE_GROUPS: ReadonlyArray<{
  id: ReadScopeGroup;
  scopeCodes: AiScopeCode[];
}> = [
  { id: 'overview', scopeCodes: ['sales.today:read', 'business.snapshot:read', 'business.context:read'] },
  { id: 'sales', scopeCodes: ['sales.read', 'pos.read', 'customers.read', 'opportunities.read', 'quotes.read', 'commercial.references:read'] },
  { id: 'inventory', scopeCodes: ['inventory.read', 'warehouses.read'] },
  { id: 'people', scopeCodes: ['learning.read', 'hr.people:read', 'hr.people.details:read', 'hr.assets.read', 'hr.records.read', 'hr.announcements.read', 'hr.announcements.receipts:read', 'hr.permissions.self:read', 'hr.permissions.read', 'hr.incentives.read', 'hr.attendance:read', 'hr.control.read', 'hr.payroll.read', 'hr.kpis:read'] },
  { id: 'work', scopeCodes: ['tasks.read', 'tasks.kpis:read', 'projects.read', 'processes.read'] },
  { id: 'finance', scopeCodes: ['expenses.read', 'petty_cash.read', 'receivables.read', 'finance.references:read', 'providers.read', 'budget_lines.read', 'accounting_accounts.read'] },
];

export const READ_SCOPE_CODES = AI_SCOPE_DEFINITIONS
  .filter((scope) => scope.kind === 'read')
  .map((scope) => scope.code);

export const ACTION_SCOPE_CODES = AI_SCOPE_DEFINITIONS
  .filter((scope) => scope.kind === 'action')
  .map((scope) => scope.code);

export const QUESTION_IDEAS: ReadonlyArray<{ id: QuestionIdeaId; category: QuestionCategory }> = [
  { id: 'salesToday', category: 'pulse' },
  { id: 'salesDetail', category: 'pulse' },
  { id: 'overdueExpenses', category: 'money' },
  { id: 'receivables', category: 'money' },
  { id: 'inventoryRisk', category: 'products' },
  { id: 'productDetail', category: 'products' },
  { id: 'employeeTasks', category: 'team' },
  { id: 'attendance', category: 'team' },
];

export const scopeKindByCode = new Map<string, AiScopeKind>(
  AI_SCOPE_DEFINITIONS.map((scope) => [scope.code, scope.kind]),
);
