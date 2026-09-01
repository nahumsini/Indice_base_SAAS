export type AiScopeKind = 'read' | 'action';

export const AI_SCOPE_DEFINITIONS = [
  { code: 'sales.today:read', group: 'overview', kind: 'read' },
  { code: 'business.snapshot:read', group: 'overview', kind: 'read' },
  { code: 'sales.read', group: 'sales', kind: 'read' },
  { code: 'pos.read', group: 'sales', kind: 'read' },
  { code: 'inventory.read', group: 'inventory', kind: 'read' },
  { code: 'hr.people:read', group: 'people', kind: 'read' },
  { code: 'hr.attendance:read', group: 'people', kind: 'read' },
  { code: 'tasks.read', group: 'work', kind: 'read' },
  { code: 'expenses.read', group: 'finance', kind: 'read' },
  { code: 'petty_cash.read', group: 'finance', kind: 'read' },
  { code: 'receivables.read', group: 'finance', kind: 'read' },
  { code: 'tasks.create', group: 'actions', kind: 'action' },
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
  { id: 'overview', scopeCodes: ['sales.today:read', 'business.snapshot:read'] },
  { id: 'sales', scopeCodes: ['sales.read', 'pos.read'] },
  { id: 'inventory', scopeCodes: ['inventory.read'] },
  { id: 'people', scopeCodes: ['hr.people:read', 'hr.attendance:read'] },
  { id: 'work', scopeCodes: ['tasks.read'] },
  { id: 'finance', scopeCodes: ['expenses.read', 'petty_cash.read', 'receivables.read'] },
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
