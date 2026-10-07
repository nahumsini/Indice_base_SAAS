import { z } from "zod";
export const financeTools = [
    {
        "name": "list_finance_accounting_accounts",
        "kind": "accounting_account",
        "operation": "list",
        "scope": "expenses.read",
        "module": "expenses",
        "tab": "accounting"
    },
    {
        "name": "get_finance_accounting_account",
        "kind": "accounting_account",
        "operation": "get",
        "scope": "expenses.read",
        "module": "expenses",
        "tab": "accounting"
    },
    {
        "name": "create_finance_accounting_account",
        "kind": "accounting_account",
        "operation": "create",
        "scope": "expenses.accounting.manage",
        "module": "expenses",
        "tab": "accounting"
    },
    {
        "name": "update_finance_accounting_account",
        "kind": "accounting_account",
        "operation": "update",
        "scope": "expenses.accounting.manage",
        "module": "expenses",
        "tab": "accounting"
    },
    {
        "name": "inactivate_finance_accounting_account",
        "kind": "accounting_account",
        "operation": "inactivate",
        "scope": "expenses.accounting.manage",
        "module": "expenses",
        "tab": "accounting"
    },
    {
        "name": "list_finance_payment_accounts",
        "kind": "payment_account",
        "operation": "list",
        "scope": "expenses.read",
        "module": "expenses",
        "tab": "payment-accounts"
    },
    {
        "name": "get_finance_payment_account",
        "kind": "payment_account",
        "operation": "get",
        "scope": "expenses.read",
        "module": "expenses",
        "tab": "payment-accounts"
    },
    {
        "name": "create_finance_payment_account",
        "kind": "payment_account",
        "operation": "create",
        "scope": "expenses.accounts.manage",
        "module": "expenses",
        "tab": "payment-accounts"
    },
    {
        "name": "update_finance_payment_account",
        "kind": "payment_account",
        "operation": "update",
        "scope": "expenses.accounts.manage",
        "module": "expenses",
        "tab": "payment-accounts"
    },
    {
        "name": "inactivate_finance_payment_account",
        "kind": "payment_account",
        "operation": "inactivate",
        "scope": "expenses.accounts.manage",
        "module": "expenses",
        "tab": "payment-accounts"
    },
    {
        "name": "list_finance_providers",
        "kind": "provider",
        "operation": "list",
        "scope": "expenses.read",
        "module": "expenses",
        "tab": "providers"
    },
    {
        "name": "get_finance_provider",
        "kind": "provider",
        "operation": "get",
        "scope": "expenses.read",
        "module": "expenses",
        "tab": "providers"
    },
    {
        "name": "create_finance_provider",
        "kind": "provider",
        "operation": "create",
        "scope": "expenses.providers.manage",
        "module": "expenses",
        "tab": "providers"
    },
    {
        "name": "update_finance_provider",
        "kind": "provider",
        "operation": "update",
        "scope": "expenses.providers.manage",
        "module": "expenses",
        "tab": "providers"
    },
    {
        "name": "inactivate_finance_provider",
        "kind": "provider",
        "operation": "inactivate",
        "scope": "expenses.providers.manage",
        "module": "expenses",
        "tab": "providers"
    },
    {
        "name": "list_finance_budgets",
        "kind": "budget",
        "operation": "list",
        "scope": "expenses.read",
        "module": "expenses",
        "tab": "budgets"
    },
    {
        "name": "get_finance_budget",
        "kind": "budget",
        "operation": "get",
        "scope": "expenses.read",
        "module": "expenses",
        "tab": "budgets"
    },
    {
        "name": "create_finance_budget",
        "kind": "budget",
        "operation": "create",
        "scope": "expenses.budgets.manage",
        "module": "expenses",
        "tab": "budgets"
    },
    {
        "name": "update_finance_budget",
        "kind": "budget",
        "operation": "update",
        "scope": "expenses.budgets.manage",
        "module": "expenses",
        "tab": "budgets"
    },
    {
        "name": "inactivate_finance_budget",
        "kind": "budget",
        "operation": "inactivate",
        "scope": "expenses.budgets.manage",
        "module": "expenses",
        "tab": "budgets"
    },
    {
        "name": "list_finance_budget_lines",
        "kind": "budget_line",
        "operation": "list",
        "scope": "expenses.read",
        "module": "expenses",
        "tab": "budgets"
    },
    {
        "name": "get_finance_budget_line",
        "kind": "budget_line",
        "operation": "get",
        "scope": "expenses.read",
        "module": "expenses",
        "tab": "budgets"
    },
    {
        "name": "create_finance_budget_line",
        "kind": "budget_line",
        "operation": "create",
        "scope": "expenses.budgets.manage",
        "module": "expenses",
        "tab": "budgets"
    },
    {
        "name": "update_finance_budget_line",
        "kind": "budget_line",
        "operation": "update",
        "scope": "expenses.budgets.manage",
        "module": "expenses",
        "tab": "budgets"
    },
    {
        "name": "inactivate_finance_budget_line",
        "kind": "budget_line",
        "operation": "inactivate",
        "scope": "expenses.budgets.manage",
        "module": "expenses",
        "tab": "budgets"
    },
    {
        "name": "create_budget_obligation_schedule",
        "kind": "budget_line",
        "operation": "schedule",
        "scope": "expenses.budgets.manage",
        "module": "expenses",
        "tab": "budgets"
    },
    {
        "name": "list_budget_obligation_reviews",
        "kind": "review",
        "operation": "reviews",
        "scope": "expenses.read",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "list_finance_expenses",
        "kind": "expense",
        "operation": "list",
        "scope": "expenses.read",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "get_finance_expense",
        "kind": "expense",
        "operation": "get",
        "scope": "expenses.read",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "list_expense_payments",
        "kind": "payment",
        "operation": "list",
        "scope": "expenses.read",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "create_expense_payable",
        "kind": "expense",
        "operation": "create",
        "scope": "expenses.manage",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "correct_finance_expense",
        "kind": "expense",
        "operation": "correct",
        "scope": "expenses.manage",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "submit_finance_expense",
        "kind": "expense",
        "operation": "submit",
        "scope": "expenses.manage",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "approve_finance_expense",
        "kind": "expense",
        "operation": "approve",
        "scope": "expenses.approve",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "reject_finance_expense",
        "kind": "expense",
        "operation": "reject",
        "scope": "expenses.approve",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "cancel_finance_expense",
        "kind": "expense",
        "operation": "cancel",
        "scope": "expenses.reverse",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "close_finance_expense",
        "kind": "expense",
        "operation": "close",
        "scope": "expenses.manage",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "remove_finance_expense",
        "kind": "expense",
        "operation": "remove",
        "scope": "expenses.reverse",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "classify_finance_expense",
        "kind": "expense",
        "operation": "classify",
        "scope": "expenses.manage",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "import_finance_expenses",
        "kind": "expense",
        "operation": "import",
        "scope": "expenses.manage",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "classify_finance_expenses",
        "kind": "expense",
        "operation": "bulk_classify",
        "scope": "expenses.manage",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "update_finance_expense_due_status",
        "kind": "expense",
        "operation": "bulk_status",
        "scope": "expenses.manage",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "register_expense_payment",
        "kind": "expense",
        "operation": "pay",
        "scope": "expenses.pay",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "settle_expense_payment",
        "kind": "expense",
        "operation": "settle",
        "scope": "expenses.pay",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "reverse_expense_payment",
        "kind": "expense",
        "operation": "reverse_payment",
        "scope": "expenses.reverse",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "pay_finance_expenses",
        "kind": "expense",
        "operation": "bulk_pay",
        "scope": "expenses.pay",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "correct_finance_expenses",
        "kind": "expense",
        "operation": "bulk_correct",
        "scope": "expenses.manage",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "list_petty_cash_funds",
        "kind": "fund",
        "operation": "list",
        "scope": "petty_cash.read",
        "module": "petty_cash",
        "tab": "cash"
    },
    {
        "name": "get_petty_cash_fund",
        "kind": "fund",
        "operation": "get",
        "scope": "petty_cash.read",
        "module": "petty_cash",
        "tab": "cash"
    },
    {
        "name": "list_petty_cash_receipts",
        "kind": "receipt",
        "operation": "list",
        "scope": "petty_cash.read",
        "module": "petty_cash",
        "tab": "control"
    },
    {
        "name": "get_petty_cash_receipt",
        "kind": "receipt",
        "operation": "get",
        "scope": "petty_cash.read",
        "module": "petty_cash",
        "tab": "control"
    },
    {
        "name": "list_petty_cash_statements",
        "kind": "statement",
        "operation": "list",
        "scope": "petty_cash.read",
        "module": "petty_cash",
        "tab": "statements"
    },
    {
        "name": "get_petty_cash_statement",
        "kind": "statement",
        "operation": "get",
        "scope": "petty_cash.read",
        "module": "petty_cash",
        "tab": "statements"
    },
    {
        "name": "list_petty_cash_movements",
        "kind": "movement",
        "operation": "list",
        "scope": "petty_cash.read",
        "module": "petty_cash",
        "tab": "control"
    },
    {
        "name": "get_petty_cash_movement",
        "kind": "movement",
        "operation": "get",
        "scope": "petty_cash.read",
        "module": "petty_cash",
        "tab": "control"
    },
    {
        "name": "list_petty_cash_type_changes",
        "kind": "type_change",
        "operation": "list",
        "scope": "petty_cash.read",
        "module": "petty_cash",
        "tab": "cash"
    },
    {
        "name": "list_petty_cash_responsibles",
        "kind": "responsible",
        "operation": "responsibles",
        "scope": "petty_cash.read",
        "module": "petty_cash",
        "tab": "cash"
    },
    {
        "name": "create_petty_cash_fund",
        "kind": "fund",
        "operation": "create",
        "scope": "petty_cash.funds.manage",
        "module": "petty_cash",
        "tab": "cash"
    },
    {
        "name": "update_petty_cash_fund",
        "kind": "fund",
        "operation": "update",
        "scope": "petty_cash.funds.manage",
        "module": "petty_cash",
        "tab": "cash"
    },
    {
        "name": "close_petty_cash_fund",
        "kind": "fund",
        "operation": "close",
        "scope": "petty_cash.funds.manage",
        "module": "petty_cash",
        "tab": "cash"
    },
    {
        "name": "schedule_type_change_petty_cash_fund",
        "kind": "fund",
        "operation": "schedule_type_change",
        "scope": "petty_cash.funds.manage",
        "module": "petty_cash",
        "tab": "cash"
    },
    {
        "name": "cancel_type_change_petty_cash_fund",
        "kind": "fund",
        "operation": "cancel_type_change",
        "scope": "petty_cash.funds.manage",
        "module": "petty_cash",
        "tab": "cash"
    },
    {
        "name": "disable_kiosk_petty_cash_fund",
        "kind": "fund",
        "operation": "disable_kiosk",
        "scope": "petty_cash.funds.manage",
        "module": "petty_cash",
        "tab": "cash"
    },
    {
        "name": "enable_kiosk_petty_cash_fund",
        "kind": "fund",
        "operation": "enable_kiosk",
        "scope": "petty_cash.funds.manage",
        "module": "petty_cash",
        "tab": "cash"
    },
    {
        "name": "revoke_kiosk_petty_cash_fund",
        "kind": "fund",
        "operation": "revoke_kiosk",
        "scope": "petty_cash.funds.manage",
        "module": "petty_cash",
        "tab": "cash"
    },
    {
        "name": "deposit_petty_cash_fund",
        "kind": "fund",
        "operation": "deposit",
        "scope": "petty_cash.deposit:create",
        "module": "petty_cash",
        "tab": "control"
    },
    {
        "name": "capture_petty_cash_receipt",
        "kind": "receipt",
        "operation": "capture",
        "scope": "petty_cash.expense:create",
        "module": "petty_cash",
        "tab": "control"
    },
    {
        "name": "authorize_petty_cash_receipt",
        "kind": "receipt",
        "operation": "authorize",
        "scope": "petty_cash.receipts.approve",
        "module": "petty_cash",
        "tab": "control"
    },
    {
        "name": "reject_petty_cash_receipt",
        "kind": "receipt",
        "operation": "reject",
        "scope": "petty_cash.receipts.manage",
        "module": "petty_cash",
        "tab": "control"
    },
    {
        "name": "reverse_petty_cash_receipt",
        "kind": "receipt",
        "operation": "reverse",
        "scope": "petty_cash.receipts.manage",
        "module": "petty_cash",
        "tab": "control"
    },
    {
        "name": "classify_petty_cash_receipt",
        "kind": "receipt",
        "operation": "classify",
        "scope": "petty_cash.receipts.manage",
        "module": "petty_cash",
        "tab": "control"
    },
    {
        "name": "bulk_classify_petty_cash_receipt",
        "kind": "receipt",
        "operation": "bulk_classify",
        "scope": "petty_cash.receipts.manage",
        "module": "petty_cash",
        "tab": "control"
    },
    {
        "name": "close_petty_cash_statement",
        "kind": "statement",
        "operation": "close",
        "scope": "petty_cash.statements.close",
        "module": "petty_cash",
        "tab": "statements"
    },
    {
        "name": "remove_expense_attachment",
        "kind": "expense",
        "operation": "remove_attachment",
        "scope": "expenses.manage",
        "module": "expenses",
        "tab": "expenses"
    },
    {
        "name": "remove_budget_line_attachment",
        "kind": "budget_line",
        "operation": "remove_attachment",
        "scope": "expenses.budgets.manage",
        "module": "expenses",
        "tab": "budgets"
    },
    {
        "name": "remove_petty_cash_receipt_attachment",
        "kind": "receipt",
        "operation": "remove_attachment",
        "scope": "petty_cash.receipts.manage",
        "module": "petty_cash",
        "tab": "control"
    }
] as const;
export const financeReadNames = ["list_finance_accounting_accounts", "get_finance_accounting_account", "list_finance_payment_accounts", "get_finance_payment_account", "list_finance_providers", "get_finance_provider", "list_finance_budgets", "get_finance_budget", "list_finance_budget_lines", "get_finance_budget_line", "list_budget_obligation_reviews", "list_finance_expenses", "get_finance_expense", "list_expense_payments", "list_petty_cash_funds", "get_petty_cash_fund", "list_petty_cash_receipts", "get_petty_cash_receipt", "list_petty_cash_statements", "get_petty_cash_statement", "list_petty_cash_movements", "get_petty_cash_movement", "list_petty_cash_type_changes", "list_petty_cash_responsibles"] as const;
export const financeActionNames = ["create_finance_accounting_account", "update_finance_accounting_account", "inactivate_finance_accounting_account", "create_finance_payment_account", "update_finance_payment_account", "inactivate_finance_payment_account", "create_finance_provider", "update_finance_provider", "inactivate_finance_provider", "create_finance_budget", "update_finance_budget", "inactivate_finance_budget", "create_finance_budget_line", "update_finance_budget_line", "inactivate_finance_budget_line", "create_budget_obligation_schedule", "create_expense_payable", "correct_finance_expense", "submit_finance_expense", "approve_finance_expense", "reject_finance_expense", "cancel_finance_expense", "close_finance_expense", "remove_finance_expense", "classify_finance_expense", "import_finance_expenses", "classify_finance_expenses", "update_finance_expense_due_status", "register_expense_payment", "settle_expense_payment", "reverse_expense_payment", "pay_finance_expenses", "correct_finance_expenses", "create_petty_cash_fund", "update_petty_cash_fund", "close_petty_cash_fund", "schedule_type_change_petty_cash_fund", "cancel_type_change_petty_cash_fund", "disable_kiosk_petty_cash_fund", "enable_kiosk_petty_cash_fund", "revoke_kiosk_petty_cash_fund", "deposit_petty_cash_fund", "capture_petty_cash_receipt", "authorize_petty_cash_receipt", "reject_petty_cash_receipt", "reverse_petty_cash_receipt", "classify_petty_cash_receipt", "bulk_classify_petty_cash_receipt", "close_petty_cash_statement", "remove_expense_attachment", "remove_budget_line_attachment", "remove_petty_cash_receipt_attachment"] as const;
export const financeReadNameSchema = z.enum(financeReadNames);
export const financeActionNameSchema = z.enum(financeActionNames);
const id = z.number().int().positive();
const money = z.union([z.number().finite(), z.string().regex(/^-?[0-9]+(?:\.[0-9]+)?$/)]);
export const QuerySchema = z.object({ id: z.number().int().nullish(), fundId: z.number().int().nullish(), statementId: z.number().int().nullish(), unitId: z.number().int().nullish(), businessId: z.number().int().nullish(), providerId: z.number().int().nullish(), query: z.string().nullish(), status: z.string().nullish(), paymentStatus: z.string().nullish(), fundType: z.string().nullish(), currencyCode: z.string().nullish(), from: z.iso.date().nullish(), to: z.iso.date().nullish(), overdueOnly: z.boolean().nullish(), limit: z.number().int().nullish(), cursor: z.string().nullish() }).strict();
const AccountingAccountGroupSchema = z.enum(["PAYROLL", "RENT", "UTILITIES", "MAINTENANCE", "MARKETING", "SOFTWARE", "INSURANCE", "TAXES", "TRAVEL", "SUPPLIES", "PROFESSIONAL_SERVICES", "OTHER"]);
const AccountingAccountStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);
export const AccountingDataSchema = z.object({ unitId: z.number().int().nullish(), businessId: z.number().int().nullish(), code: z.string(), name: z.string(), groupKey: AccountingAccountGroupSchema, description: z.string().nullish(), status: AccountingAccountStatusSchema.nullish() }).strict();
const PaymentAccountTypeSchema = z.enum(["CASH", "BANK", "CREDIT_CARD", "PETTY_CASH"]);
const PaymentAccountStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);
export const AccountDataSchema = z.object({ unitId: z.number().int().nullish(), businessId: z.number().int().nullish(), name: z.string(), type: PaymentAccountTypeSchema, currencyCode: z.string(), openingBalance: money.nullish(), description: z.string().nullish(), status: PaymentAccountStatusSchema.nullish() }).strict();
const ProviderStatusSchema = z.enum(["ACTIVE", "INACTIVE", "BLOCKED", "ARCHIVED"]);
export const ProviderDataSchema = z.object({ unitId: z.number().int().nullish(), businessId: z.number().int().nullish(), name: z.string(), legalName: z.string().nullish(), email: z.string().nullish(), phone: z.string().nullish(), contactName: z.string().nullish(), paymentTermsDays: z.number().int().nullish(), status: ProviderStatusSchema.nullish(), notes: z.string().nullish() }).strict();
const BudgetStatusSchema = z.enum(["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"]);
export const BudgetDataSchema = z.object({ unitId: z.number().int().nullish(), businessId: z.number().int().nullish(), name: z.string(), description: z.string().nullish(), periodStart: z.iso.date(), periodEnd: z.iso.date(), currencyCode: z.string(), status: BudgetStatusSchema.nullish() }).strict();
export const BudgetLineDataSchema = z.object({ unitId: z.number().int().nullish(), businessId: z.number().int().nullish(), budgetId: z.number().int(), name: z.string(), categoryKey: z.string().nullish(), plannedAmount: money, currencyCode: z.string(), status: BudgetStatusSchema.nullish(), description: z.string().nullish(), scheduledDate: z.iso.date().nullish(), providerId: z.number().int().nullish(), accountingAccountId: z.number().int().nullish(), includesTax: z.boolean().nullish(), taxRate: money.nullish() }).strict();
const ExpenseTypeSchema = z.enum(["FIXED", "VARIABLE"]);
export const ExpenseDataSchema = z.object({ unitId: z.number().int().nullish(), businessId: z.number().int().nullish(), providerId: z.number().int().nullish(), budgetLineId: z.number().int().nullish(), accountingAccountId: z.number().int().nullish(), paymentAccountId: z.number().int().nullish(), concept: z.string(), description: z.string().nullish(), expenseType: ExpenseTypeSchema.nullish(), subtotalAmount: money.nullish(), taxAmount: money.nullish(), totalAmount: money, currencyCode: z.string(), expenseDate: z.iso.date(), dueDate: z.iso.date().nullish(), paid: z.boolean().nullish(), includesTax: z.boolean().nullish(), taxRate: money.nullish() }).strict();
const PettyCashFundTypeSchema = z.enum(["INTERNAL_COMPANY", "EXTERNAL_MANAGED"]);
export const PettyCashManagedAssetSchema = z.object({ type: z.string().nullable(), name: z.string().nullable(), reference: z.string().nullable() });
export const FundDataSchema = z.object({ unitId: z.number().int().nullish(), businessId: z.number().int().nullish(), budgetId: z.number().int().nullish(), budgetLineId: z.number().int().nullish(), paymentAccountId: z.number().int(), responsibleUserId: z.number().int().nullish(), fundType: PettyCashFundTypeSchema, name: z.string(), currencyCode: z.string(), limitAmount: money, cutOffDay: z.number().int().nullish(), externalOwnerType: z.string().nullish(), externalOwnerName: z.string().nullish(), externalOwnerRelationship: z.string().nullish(), statementRecipientEmail: z.string().nullish(), managedAssets: z.array(PettyCashManagedAssetSchema).nullish() }).strict();
export const ReceiptDataSchema = z.object({ providerId: z.number().int().nullish(), accountingAccountId: z.number().int().nullish(), description: z.string(), receiptReference: z.string().nullish(), subtotalAmount: money, taxAmount: money.nullish(), totalAmount: money.nullish(), currencyCode: z.string(), expenseDate: z.iso.date() }).strict();
export const DepositDataSchema = z.object({ amount: money, currencyCode: z.string(), movementDate: z.iso.date(), sourcePaymentAccountId: z.number().int().nullish(), externalSourceName: z.string().nullish(), reference: z.string().nullish() }).strict();
export const PaymentDataSchema = z.object({ amount: money.nullish(), paymentAccountId: z.number().int().nullish(), paymentDate: z.iso.date().nullish() }).strict();
const PettyCashStatementCloseActionSchema = z.enum(["CLOSE_CLEAN", "RETURN_TO_SOURCE", "CARRY_FORWARD", "FORGIVE_SHORTAGE", "FORGIVE_SURPLUS", "CHARGE_EMPLOYEE"]);
export const CloseDataSchema = z.object({ action: PettyCashStatementCloseActionSchema, closeDate: z.iso.date().nullish(), destinationPaymentAccountId: z.number().int().nullish(), externalDestinationName: z.string().nullish(), reference: z.string().nullish() }).strict();
export const ScheduleDataSchema = z.object({ startDate: z.iso.date(), endDate: z.iso.date(), everyMonths: z.number().int() }).strict();
export const SelectionSchema = z.object({ id: z.number().int(), expectedVersion: z.number().int().nullable() });
export const ChangeSchema = z.object({ id: z.number().int().nullish(), fundId: z.number().int().nullish(), statementId: z.number().int().nullish(), paymentId: z.number().int().nullish(), attachmentId: z.number().int().nullish(), targetId: z.number().int().nullish(), reason: z.string().nullish(), classification: z.string().nullish(), dueStatus: z.string().nullish(), effectiveDate: z.iso.date().nullish(), locale: z.string().nullish(), accounting: AccountingDataSchema.nullish(), account: AccountDataSchema.nullish(), provider: ProviderDataSchema.nullish(), budget: BudgetDataSchema.nullish(), budgetLine: BudgetLineDataSchema.nullish(), expense: ExpenseDataSchema.nullish(), fund: FundDataSchema.nullish(), receipt: ReceiptDataSchema.nullish(), deposit: DepositDataSchema.nullish(), payment: PaymentDataSchema.nullish(), closing: CloseDataSchema.nullish(), schedule: ScheduleDataSchema.nullish(), rows: z.array(SelectionSchema).nullish(), expenses: z.array(ExpenseDataSchema).nullish() }).strict();
const ExpenseStatusSchema = z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "ORDERED", "PARTIALLY_PAID", "PAID", "CLOSED", "CANCELLED", "REJECTED"]);
const PaymentStatusSchema = z.enum(["UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE"]);
export const ExpenseSchema = z.object({ id: z.number().int().nullable(), unitId: z.number().int().nullable(), businessId: z.number().int().nullable(), providerId: z.number().int().nullable(), budgetLineId: z.number().int().nullable(), accountingAccountId: z.number().int().nullable(), paymentAccountId: z.number().int().nullable(), purchaseOrderId: z.number().int().nullable(), folio: z.string().nullable(), concept: z.string().nullable(), description: z.string().nullable(), expenseType: ExpenseTypeSchema.nullable(), subtotalAmount: money.nullable(), taxAmount: money.nullable(), totalAmount: money.nullable(), paidAmount: money.nullable(), balanceAmount: money.nullable(), currencyCode: z.string().nullable(), expenseDate: z.iso.date().nullable(), dueDate: z.iso.date().nullable(), paymentDate: z.iso.date().nullable(), closeDate: z.iso.date().nullable(), status: ExpenseStatusSchema.nullable(), paymentStatus: PaymentStatusSchema.nullable(), auditStatus: z.string().nullable(), attachmentCount: z.number().int().nullable(), version: z.number().int().nullable(), accountingPosted: z.boolean(), purchaseOrderReceived: z.boolean(), originFundId: z.number().int().nullable(), originFundName: z.string().nullable() });
export const PaymentSchema = z.object({ id: z.number().int().nullable(), expenseId: z.number().int().nullable(), paymentAccountId: z.number().int().nullable(), paymentAccountName: z.string().nullable(), paymentAccountType: z.string().nullable(), amount: money.nullable(), currencyCode: z.string().nullable(), paymentDate: z.iso.date().nullable(), source: z.string().nullable(), registeredByUserId: z.number().int().nullable(), registeredByName: z.string().nullable(), reversedAt: z.iso.datetime({ offset: true }).nullable() });
const PettyCashFundStatusSchema = z.enum(["OPEN", "LOW_BALANCE", "NEEDS_RECONCILIATION", "CLOSED"]);
export const FundSchema = z.object({ id: z.number().int().nullable(), unitId: z.number().int().nullable(), businessId: z.number().int().nullable(), budgetId: z.number().int().nullable(), budgetLineId: z.number().int().nullable(), paymentAccountId: z.number().int().nullable(), responsibleUserId: z.number().int().nullable(), fundType: PettyCashFundTypeSchema.nullable(), name: z.string().nullable(), currencyCode: z.string().nullable(), limitAmount: money.nullable(), currentBalanceAmount: money.nullable(), cutOffDay: z.number().int().nullable(), externalOwnerType: z.string().nullable(), externalOwnerName: z.string().nullable(), externalOwnerRelationship: z.string().nullable(), externalIdentityPending: z.boolean().nullable(), budgetLinkPending: z.boolean().nullable(), kioskEnabled: z.boolean().nullable(), status: PettyCashFundStatusSchema.nullable(), version: z.number().int().nullable(), managedAssets: z.array(PettyCashManagedAssetSchema), pendingTypeChangeId: z.number().int().nullable(), pendingFundType: PettyCashFundTypeSchema.nullable(), pendingTypeEffectiveDate: z.iso.date().nullable() });
const PettyCashStatementStatusSchema = z.enum(["OPEN", "CUT_PENDING", "PARTIALLY_SETTLED", "SETTLED", "SHORTAGE", "FORGIVEN_SHORTAGE", "CHARGED_TO_EMPLOYEE", "TRANSFERRED_TO_NEXT_CUT", "CLOSED"]);
export const StatementSchema = z.object({ id: z.number().int().nullable(), pettyCashFundId: z.number().int().nullable(), fundTypeSnapshot: PettyCashFundTypeSchema.nullable(), folio: z.string().nullable(), periodKey: z.string().nullable(), periodStart: z.iso.date().nullable(), periodEnd: z.iso.date().nullable(), cutOffDate: z.iso.date().nullable(), openingBalanceAmount: money.nullable(), assignedAmount: money.nullable(), additionalDepositAmount: money.nullable(), declaredClosingBalanceAmount: money.nullable(), estimatedUsageAmount: money.nullable(), verifiedExpenseAmount: money.nullable(), returnedAmount: money.nullable(), shortageAmount: money.nullable(), carryForwardAmount: money.nullable(), currencyCode: z.string().nullable(), status: PettyCashStatementStatusSchema.nullable(), responsibleUserId: z.number().int().nullable(), externalOwnerTypeSnapshot: z.string().nullable(), externalOwnerNameSnapshot: z.string().nullable(), externalOwnerRelationshipSnapshot: z.string().nullable(), attachmentCount: z.number().int().nullable(), version: z.number().int().nullable(), managedAssetsSnapshot: z.array(PettyCashManagedAssetSchema) });
const PettyCashSettlementLineStatusSchema = z.enum(["DRAFT", "RECEIPT_ATTACHED", "VALIDATED", "EXPENSE_CREATED", "REJECTED", "REVERSED"]);
export const ReceiptSchema = z.object({ id: z.number().int().nullable(), pettyCashFundId: z.number().int().nullable(), pettyCashStatementId: z.number().int().nullable(), expenseId: z.number().int().nullable(), providerId: z.number().int().nullable(), accountingAccountId: z.number().int().nullable(), description: z.string().nullable(), receiptReference: z.string().nullable(), subtotalAmount: money.nullable(), taxAmount: money.nullable(), totalAmount: money.nullable(), currencyCode: z.string().nullable(), expenseDate: z.iso.date().nullable(), attachmentCount: z.number().int().nullable(), status: PettyCashSettlementLineStatusSchema.nullable(), cancellationReason: z.string().nullable(), cancelledAt: z.iso.datetime({ offset: true }).nullable(), version: z.number().int().nullable() });
const PettyCashMovementTypeSchema = z.enum(["INITIAL_FUNDING", "ADDITIONAL_DEPOSIT", "RETURN_TO_SOURCE", "CARRY_FORWARD", "SHORTAGE_ADJUSTMENT", "FORGIVEN_SHORTAGE", "EMPLOYEE_CHARGE"]);
export const MovementSchema = z.object({ id: z.number().int().nullable(), pettyCashFundId: z.number().int().nullable(), pettyCashStatementId: z.number().int().nullable(), fromPaymentAccountId: z.number().int().nullable(), toPaymentAccountId: z.number().int().nullable(), externalSourceName: z.string().nullable(), entryCategory: z.string().nullable(), counterpartyName: z.string().nullable(), statementDescription: z.string().nullable(), fundingMethod: z.string().nullable(), type: PettyCashMovementTypeSchema.nullable(), amount: money.nullable(), currencyCode: z.string().nullable(), movementDate: z.iso.date().nullable(), reference: z.string().nullable(), version: z.number().int().nullable() });
export const AccountingSchema = z.object({ id: z.number().int().nullable(), unitId: z.number().int().nullable(), businessId: z.number().int().nullable(), code: z.string().nullable(), name: z.string().nullable(), groupKey: AccountingAccountGroupSchema.nullable(), description: z.string().nullable(), status: AccountingAccountStatusSchema.nullable(), version: z.number().int().nullable() });
export const AccountSchema = z.object({ id: z.number().int().nullable(), unitId: z.number().int().nullable(), businessId: z.number().int().nullable(), name: z.string().nullable(), type: PaymentAccountTypeSchema.nullable(), currencyCode: z.string().nullable(), openingBalance: money.nullable(), currentBalance: money.nullable(), pendingBalance: money.nullable(), totalBalance: money.nullable(), status: PaymentAccountStatusSchema.nullable(), description: z.string().nullable(), systemKey: z.string().nullable(), systemManaged: z.boolean(), version: z.number().int().nullable() });
export const ProviderSchema = z.object({ id: z.number().int().nullable(), unitId: z.number().int().nullable(), businessId: z.number().int().nullable(), name: z.string().nullable(), legalName: z.string().nullable(), paymentTermsDays: z.number().int().nullable(), status: ProviderStatusSchema.nullable(), notes: z.string().nullable(), version: z.number().int().nullable() });
export const BudgetSchema = z.object({ id: z.number().int().nullable(), unitId: z.number().int().nullable(), businessId: z.number().int().nullable(), name: z.string().nullable(), description: z.string().nullable(), periodStart: z.iso.date().nullable(), periodEnd: z.iso.date().nullable(), currencyCode: z.string().nullable(), status: BudgetStatusSchema.nullable(), version: z.number().int().nullable() });
const BudgetHealthStatusSchema = z.enum(["ON_TRACK", "WARNING", "EXCEEDED"]);
export const BudgetLineSchema = z.object({ id: z.number().int().nullable(), unitId: z.number().int().nullable(), businessId: z.number().int().nullable(), budgetId: z.number().int().nullable(), name: z.string().nullable(), categoryKey: z.string().nullable(), plannedAmount: money.nullable(), committedAmount: money.nullable(), actualExpenseAmount: money.nullable(), pettyCashIssuedAmount: money.nullable(), pettyCashSettledAmount: money.nullable(), availableAmount: money.nullable(), healthStatus: BudgetHealthStatusSchema.nullable(), currencyCode: z.string().nullable(), status: BudgetStatusSchema.nullable(), description: z.string().nullable(), attachmentCount: z.number().int().nullable(), version: z.number().int().nullable(), scheduledDate: z.iso.date().nullish(), providerId: z.number().int().nullish(), accountingAccountId: z.number().int().nullish(), accountingAccountName: z.string().nullish(), includesTax: z.boolean().nullish(), taxRate: money.nullish(), taxAmount: money.nullish() });
export const PettyCashTypeChangeResponseSchema = z.object({ id: z.number().int().nullable(), previousType: PettyCashFundTypeSchema.nullable(), nextType: PettyCashFundTypeSchema.nullable(), effectiveDate: z.iso.date().nullable(), reason: z.string().nullable(), status: z.string().nullable(), createdByUserId: z.number().int().nullable(), createdAt: z.iso.datetime({ offset: true }).nullable(), appliedAt: z.iso.datetime({ offset: true }).nullable(), cancelledByUserId: z.number().int().nullable(), cancelledAt: z.iso.datetime({ offset: true }).nullable() });
export const ResponsibleSchema = z.object({ userId: z.number().int(), userCompanyId: z.number().int(), name: z.string().nullable(), unitId: z.number().int().nullable(), businessId: z.number().int().nullable() });
export const ReviewSchema = z.object({ budgetLineId: z.number().int(), folio: z.string().nullable(), reason: z.string().nullable() });
export const RecordsSchema = z.object({ expenses: z.array(ExpenseSchema), payments: z.array(PaymentSchema), funds: z.array(FundSchema), statements: z.array(StatementSchema), receipts: z.array(ReceiptSchema), movements: z.array(MovementSchema), accountingAccounts: z.array(AccountingSchema), paymentAccounts: z.array(AccountSchema), providers: z.array(ProviderSchema), budgets: z.array(BudgetSchema), budgetLines: z.array(BudgetLineSchema), typeChanges: z.array(PettyCashTypeChangeResponseSchema), responsibles: z.array(ResponsibleSchema), reviews: z.array(ReviewSchema) });
export const MetricSchema = z.object({ name: z.string().nullable(), currencyCode: z.string().nullable(), fundType: z.string().nullable(), amount: money.nullable() });
export const PageSchema = z.object({ records: RecordsSchema.nullable(), totalCount: z.number().int(), returnedCount: z.number().int(), hasMore: z.boolean(), nextCursor: z.string().nullable(), scope: z.string().nullable(), asOfDate: z.iso.date().nullable(), timeZone: z.string().nullable(), totals: z.array(MetricSchema) });
export const EffectSchema = z.object({ currencyCode: z.string().nullable(), amount: money.nullable(), treasuryDelta: money.nullable(), fundDelta: money.nullable(), createsCompanyExpense: z.boolean(), recordsPayment: z.boolean(), queuesPayrollDeduction: z.boolean(), description: z.string().nullable(), subtotalAmount: money.nullish(), taxAmount: money.nullish() });
export const PreviewSchema = z.object({ action: financeActionNameSchema, confirmationToken: z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/), expiresAt: z.iso.datetime({ offset: true }), requiresConfirmation: z.literal(true), before: RecordsSchema.nullable(), changes: ChangeSchema.nullable(), effects: z.array(EffectSchema) });
export const ResultSchema = z.object({ action: financeActionNameSchema, records: RecordsSchema.nullable(), effects: z.array(EffectSchema), nextActions: z.array(financeActionNameSchema) });
export const CommittedSchema = z.object({ action: financeActionNameSchema, replayed: z.boolean(), correlationId: z.string().min(1), result: ResultSchema.nullable() });
export const CommitRequestSchema = z.object({ confirmationToken: z.string().nullable(), idempotencyKey: z.string().nullable() });
export const financeQuerySchema = QuerySchema.extend({ limit: id.max(100).optional(), cursor: z.string().max(256).optional() });
export const financeCommitRequestSchema = CommitRequestSchema.extend({ confirmationToken: z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/), idempotencyKey: z.string().min(8).max(128) }).strict();
export type FinanceReadName = typeof financeReadNames[number];
export type FinanceWorkflowActionName = typeof financeActionNames[number];
export type FinanceQuery = z.infer<typeof financeQuerySchema>;
export type FinanceChange = z.infer<typeof ChangeSchema>;
export type FinancePage = z.infer<typeof PageSchema>;
export type FinancePreview = z.infer<typeof PreviewSchema>;
export type FinanceCommitted = z.infer<typeof CommittedSchema>;
const rows = z.array(SelectionSchema.extend({ id, expectedVersion: z.number().int().nonnegative() })).min(1).max(200);
const expenseClassification = z.enum(["ACCOUNTING_ACCOUNT", "PROVIDER", "UNIT", "BUSINESS", "PAYMENT_ACCOUNT"]);
const receiptClassification = z.enum(["ACCOUNTING_ACCOUNT", "PROVIDER"]);
export const financeInputs = {
    "create_finance_accounting_account": z.object({ accounting: AccountingDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "update_finance_accounting_account": z.object({ id, accounting: AccountingDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "inactivate_finance_accounting_account": z.object({ id, reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "create_finance_payment_account": z.object({ account: AccountDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "update_finance_payment_account": z.object({ id, account: AccountDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "inactivate_finance_payment_account": z.object({ id, reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "create_finance_provider": z.object({ provider: ProviderDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "update_finance_provider": z.object({ id, provider: ProviderDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "inactivate_finance_provider": z.object({ id, reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "create_finance_budget": z.object({ budget: BudgetDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "update_finance_budget": z.object({ id, budget: BudgetDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "inactivate_finance_budget": z.object({ id, reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "create_finance_budget_line": z.object({ budgetLine: BudgetLineDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "update_finance_budget_line": z.object({ id, budgetLine: BudgetLineDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "inactivate_finance_budget_line": z.object({ id, reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "create_budget_obligation_schedule": z.object({ budgetLine: BudgetLineDataSchema, schedule: ScheduleDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "create_expense_payable": z.object({ expense: ExpenseDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "correct_finance_expense": z.object({ id, expense: ExpenseDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "submit_finance_expense": z.object({ id, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "approve_finance_expense": z.object({ id, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "reject_finance_expense": z.object({ id, reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "cancel_finance_expense": z.object({ id, reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "close_finance_expense": z.object({ id, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "remove_finance_expense": z.object({ id, reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "classify_finance_expense": z.object({ id, classification: expenseClassification, targetId: id.nullable(), reason: z.string().max(500).optional(), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "import_finance_expenses": z.object({ expenses: z.array(ExpenseDataSchema).min(1).max(200), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "classify_finance_expenses": z.object({ rows: rows, classification: expenseClassification, targetId: id.nullable(), reason: z.string().max(500).optional(), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "update_finance_expense_due_status": z.object({ rows: rows, dueStatus: z.enum(["PENDING", "OVERDUE"]), effectiveDate: z.iso.date(), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "register_expense_payment": z.object({ id, payment: PaymentDataSchema.extend({ amount: money, paymentAccountId: id, paymentDate: z.iso.date().optional() }), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "settle_expense_payment": z.object({ id, payment: PaymentDataSchema.omit({ amount: true }).extend({ paymentAccountId: id.nullable(), paymentDate: z.iso.date().optional() }).strict(), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "reverse_expense_payment": z.object({ id, paymentId: id, reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "pay_finance_expenses": z.object({ rows: rows, targetId: id, effectiveDate: z.iso.date(), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "correct_finance_expenses": z.object({ rows: rows, expenses: z.array(ExpenseDataSchema).min(1).max(200), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "create_petty_cash_fund": z.object({ fund: FundDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "update_petty_cash_fund": z.object({ id, fund: FundDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "close_petty_cash_fund": z.object({ id, reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "schedule_type_change_petty_cash_fund": z.object({ id, fund: FundDataSchema, effectiveDate: z.iso.date(), reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "cancel_type_change_petty_cash_fund": z.object({ id, targetId: id, reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "disable_kiosk_petty_cash_fund": z.object({ id, reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "enable_kiosk_petty_cash_fund": z.object({ id, reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "revoke_kiosk_petty_cash_fund": z.object({ id, reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "deposit_petty_cash_fund": z.object({ fundId: id, statementId: id.optional(), deposit: DepositDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "capture_petty_cash_receipt": z.object({ fundId: id, statementId: id.optional(), receipt: ReceiptDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "authorize_petty_cash_receipt": z.object({ fundId: id, id, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "reject_petty_cash_receipt": z.object({ fundId: id, id, reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "reverse_petty_cash_receipt": z.object({ fundId: id, id, reason: z.string().min(1).max(500), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "classify_petty_cash_receipt": z.object({ fundId: id, id, classification: receiptClassification, targetId: id.nullable(), reason: z.string().max(500).optional(), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "bulk_classify_petty_cash_receipt": z.object({ fundId: id, statementId: id, rows: rows, classification: receiptClassification, targetId: id.nullable(), reason: z.string().max(500).optional(), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "close_petty_cash_statement": z.object({ fundId: id, statementId: id, closing: CloseDataSchema, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "remove_expense_attachment": z.object({ id, attachmentId: id, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "remove_budget_line_attachment": z.object({ id, attachmentId: id, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict(),
    "remove_petty_cash_receipt_attachment": z.object({ fundId: id, id, attachmentId: id, locale: z.enum(["es-MX", "en-CA"]).optional() }).strict()
} as const;
