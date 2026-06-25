import type { ExpenseOperationalColumnKey } from './expense-column-contract.types';
import type {
  BudgetHealthStatus,
  BudgetStatus,
  ExpenseStatus,
  PaymentStatus,
  PettyCashStatus,
  PurchaseOrderStatus,
} from './finance-status.types';

export type FinanceTabKey =
  | 'expenses'
  | 'budgets'
  | 'providers'
  | 'paymentAccounts'
  | 'accountingAccounts'
  | 'pettyCash'
  | 'purchaseOrders'
  | 'financialOverview';

export type FinanceUiTabRouteKey =
  | 'expenses'
  | 'budgets'
  | 'providers'
  | 'accounting'
  | 'payment_accounts'
  | 'kpis'
  | 'petty_cash'
  | 'purchase_orders';

export type FinanceTabPurpose =
  | 'record_real_business_expenses'
  | 'plan_and_control_budget'
  | 'manage_provider_catalog'
  | 'manage_payment_accounts'
  | 'manage_accounting_classification'
  | 'manage_petty_cash_issuance_and_settlement'
  | 'commit_purchase_orders'
  | 'report_financial_overview';

export type FinanceTabReadinessLevel =
  | 'current_frontend_ready'
  | 'contract_ready'
  | 'backend_contract_required'
  | 'planned_not_implemented';

export type FinanceTabBudgetEffect =
  | 'none'
  | 'planned_budget'
  | 'committed_budget'
  | 'actual_budget_consumption'
  | 'temporary_issue_and_actual_settlement'
  | 'reporting_output';

export type FinanceTabCashEffect =
  | 'none'
  | 'expense_payment'
  | 'fund_movement'
  | 'payment_account_balance'
  | 'indirect_reference'
  | 'derived_reporting';

export type FinanceTabFinancialOverviewEffect =
  | 'none'
  | 'direct_source'
  | 'indirect_dimension'
  | 'reporting_output';

export type FinanceTabSourceOfTruth =
  | 'future_finance_api'
  | 'frontend_mock_until_api'
  | 'derived_finance_projection';

export type FinanceTabEntityName =
  | 'Expense'
  | 'BudgetLine'
  | 'Provider'
  | 'PaymentAccount'
  | 'AccountingAccount'
  | 'PettyCashMovement'
  | 'PurchaseOrder'
  | 'FinancialOverview'
  | 'FinanceAttachment'
  | 'FinanceFundMovement';

export type FinanceRowNature =
  | 'real_expense'
  | 'planned_budget'
  | 'committed_order'
  | 'fund_movement'
  | 'payment_account_balance'
  | 'reference_catalog'
  | 'accounting_classification'
  | 'reporting_output';

export type FinanceTabStatusKey =
  | ExpenseStatus
  | BudgetStatus
  | BudgetHealthStatus
  | PaymentStatus
  | PettyCashStatus
  | PurchaseOrderStatus
  | 'ACTIVE'
  | 'INACTIVE'
  | 'DERIVED';

export type FinanceTableColumnKey =
  | ExpenseOperationalColumnKey
  | 'id'
  | 'name'
  | 'period'
  | 'plannedAmount'
  | 'committedAmount'
  | 'actualAmount'
  | 'actualExpenseAmount'
  | 'pettyCashIssuedAmount'
  | 'pettyCashSettledAmount'
  | 'availableAmount'
  | 'healthStatus'
  | 'taxId'
  | 'email'
  | 'phone'
  | 'paymentTerms'
  | 'totalSpent'
  | 'openBalance'
  | 'code'
  | 'group'
  | 'type'
  | 'source'
  | 'lastMovementDate'
  | 'custodian'
  | 'movementType'
  | 'issuedAmount'
  | 'settledAmount'
  | 'settlementBalance'
  | 'issuedDate'
  | 'settlementDueDate'
  | 'settledDate'
  | 'requestedDate'
  | 'receivedDate'
  | 'metric'
  | 'issuedBudgetAmount'
  | 'settledBudgetAmount'
  | 'cashFlowAmount'
  | 'variance'
  | 'rowNature'
  | 'createdAt'
  | 'updatedAt';

export type FinanceTableSourceKey =
  | FinanceTableColumnKey
  | 'not_applicable'
  | 'entity_audit_fields'
  | 'storage_attachment_links'
  | 'derived_metrics'
  | 'budget_line_rollup'
  | 'payment_account_movements';

export interface FinanceTableCoherence {
  readonly primaryEntityIdentifier: FinanceTableSourceKey;
  readonly statusSource: FinanceTableSourceKey;
  readonly monetarySource: FinanceTableSourceKey;
  readonly budgetSource: FinanceTableSourceKey;
  readonly paymentAccountSource: FinanceTableSourceKey;
  readonly auditSource: FinanceTableSourceKey;
  readonly attachmentSource: FinanceTableSourceKey;
  readonly rowNature: FinanceRowNature;
}

export interface FinanceTabAlignment {
  readonly tabKey: FinanceTabKey;
  readonly currentUiTab: FinanceUiTabRouteKey | null;
  readonly tabName: string;
  readonly purpose: FinanceTabPurpose;
  readonly mainEntity: FinanceTabEntityName;
  readonly secondaryEntities: readonly FinanceTabEntityName[];
  readonly sourceOfTruth: FinanceTabSourceOfTruth;
  readonly defaultTableColumns: readonly FinanceTableColumnKey[];
  readonly optionalTableColumns: readonly FinanceTableColumnKey[];
  readonly statusesUsed: readonly FinanceTabStatusKey[];
  readonly createsExpense: boolean;
  readonly consumesBudget: boolean;
  readonly budgetEffect: FinanceTabBudgetEffect;
  readonly affectsPaymentAccount: boolean;
  readonly cashEffect: FinanceTabCashEffect;
  readonly affectsCashFlow: boolean;
  readonly affectsFinancialOverview: boolean;
  readonly financialOverviewEffect: FinanceTabFinancialOverviewEffect;
  readonly requiresApproval: boolean;
  readonly requiresAttachment: boolean;
  readonly backendReadinessLevel: FinanceTabReadinessLevel;
  readonly frontendReadinessLevel: FinanceTabReadinessLevel;
  readonly isImplementedInCurrentUi: boolean;
  readonly tableCoherence: FinanceTableCoherence;
  readonly openQuestions: readonly string[];
}

export interface FinanceUiTabMigration {
  readonly currentUiTab: FinanceUiTabRouteKey;
  readonly targetTabKey: FinanceTabKey;
  readonly targetEntity: FinanceTabEntityName;
  readonly implementationState: FinanceTabReadinessLevel;
  readonly notes: string;
}
