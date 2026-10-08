# Matriz exacta: Gastos y Caja Chica en MCP

Fecha: 2026-10-07. Contrato: [operación financiera](lupita-finance-delivery-contract-v1.md).

Fuente finita: `financeContracts.ts` y `FinanceAssistantTools.java`; se verifican mediante pruebas MCP y permisos backend.
24 consultas + 52 pares + tres pares de archivos + una exportación = **135 herramientas nuevas**.
Cada par usa `preview_<acción>` y `<acción>`; la confirmación solo recibe token y clave.

## Consultas

| Herramienta | Scope | Módulo.pestaña | Propietario |
| --- | --- | --- | --- |
| `list_finance_accounting_accounts` | `expenses.read` | `expenses.accounting` | AccountingAccountService |
| `get_finance_accounting_account` | `expenses.read` | `expenses.accounting` | AccountingAccountService |
| `list_finance_payment_accounts` | `expenses.read` | `expenses.payment-accounts` | PaymentAccountService |
| `get_finance_payment_account` | `expenses.read` | `expenses.payment-accounts` | PaymentAccountService |
| `list_finance_providers` | `expenses.read` | `expenses.providers` | ProviderService |
| `get_finance_provider` | `expenses.read` | `expenses.providers` | ProviderService |
| `list_finance_budgets` | `expenses.read` | `expenses.budgets` | BudgetService |
| `get_finance_budget` | `expenses.read` | `expenses.budgets` | BudgetService |
| `list_finance_budget_lines` | `expenses.read` | `expenses.budgets` | BudgetLineService / BudgetExpenseSynchronizationService |
| `get_finance_budget_line` | `expenses.read` | `expenses.budgets` | BudgetLineService / BudgetExpenseSynchronizationService |
| `list_budget_obligation_reviews` | `expenses.read` | `expenses.expenses` | BudgetExpenseSynchronizationService |
| `list_finance_expenses` | `expenses.read` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `get_finance_expense` | `expenses.read` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `list_expense_payments` | `expenses.read` | `expenses.expenses` | ExpenseService |
| `list_petty_cash_funds` | `petty_cash.read` | `petty_cash.cash` | PettyCashService / PettyCashTypeChanges |
| `get_petty_cash_fund` | `petty_cash.read` | `petty_cash.cash` | PettyCashService / PettyCashTypeChanges |
| `list_petty_cash_receipts` | `petty_cash.read` | `petty_cash.control` | PettyCashService / PettyCashBulkActionService |
| `get_petty_cash_receipt` | `petty_cash.read` | `petty_cash.control` | PettyCashService / PettyCashBulkActionService |
| `list_petty_cash_statements` | `petty_cash.read` | `petty_cash.statements` | PettyCashService |
| `get_petty_cash_statement` | `petty_cash.read` | `petty_cash.statements` | PettyCashService |
| `list_petty_cash_movements` | `petty_cash.read` | `petty_cash.control` | PettyCashService |
| `get_petty_cash_movement` | `petty_cash.read` | `petty_cash.control` | PettyCashService |
| `list_petty_cash_type_changes` | `petty_cash.read` | `petty_cash.cash` | PettyCashTypeChanges |
| `list_petty_cash_responsibles` | `petty_cash.read` | `petty_cash.cash` | FinanceAccessService |

## Acciones con revisión y confirmación

| Acción y su `preview_` | Scope | Módulo.pestaña | Propietario |
| --- | --- | --- | --- |
| `preview_create_finance_accounting_account`, `create_finance_accounting_account` | `expenses.accounting.manage` | `expenses.accounting` | AccountingAccountService |
| `preview_update_finance_accounting_account`, `update_finance_accounting_account` | `expenses.accounting.manage` | `expenses.accounting` | AccountingAccountService |
| `preview_inactivate_finance_accounting_account`, `inactivate_finance_accounting_account` | `expenses.accounting.manage` | `expenses.accounting` | AccountingAccountService |
| `preview_create_finance_payment_account`, `create_finance_payment_account` | `expenses.accounts.manage` | `expenses.payment-accounts` | PaymentAccountService |
| `preview_update_finance_payment_account`, `update_finance_payment_account` | `expenses.accounts.manage` | `expenses.payment-accounts` | PaymentAccountService |
| `preview_inactivate_finance_payment_account`, `inactivate_finance_payment_account` | `expenses.accounts.manage` | `expenses.payment-accounts` | PaymentAccountService |
| `preview_create_finance_provider`, `create_finance_provider` | `expenses.providers.manage` | `expenses.providers` | ProviderService |
| `preview_update_finance_provider`, `update_finance_provider` | `expenses.providers.manage` | `expenses.providers` | ProviderService |
| `preview_inactivate_finance_provider`, `inactivate_finance_provider` | `expenses.providers.manage` | `expenses.providers` | ProviderService |
| `preview_create_finance_budget`, `create_finance_budget` | `expenses.budgets.manage` | `expenses.budgets` | BudgetService |
| `preview_update_finance_budget`, `update_finance_budget` | `expenses.budgets.manage` | `expenses.budgets` | BudgetService |
| `preview_inactivate_finance_budget`, `inactivate_finance_budget` | `expenses.budgets.manage` | `expenses.budgets` | BudgetService |
| `preview_create_finance_budget_line`, `create_finance_budget_line` | `expenses.budgets.manage` | `expenses.budgets` | BudgetLineService / BudgetExpenseSynchronizationService |
| `preview_update_finance_budget_line`, `update_finance_budget_line` | `expenses.budgets.manage` | `expenses.budgets` | BudgetLineService / BudgetExpenseSynchronizationService |
| `preview_inactivate_finance_budget_line`, `inactivate_finance_budget_line` | `expenses.budgets.manage` | `expenses.budgets` | BudgetLineService / BudgetExpenseSynchronizationService |
| `preview_create_budget_obligation_schedule`, `create_budget_obligation_schedule` | `expenses.budgets.manage` | `expenses.budgets` | BudgetLineService / BudgetExpenseSynchronizationService |
| `preview_create_expense_payable`, `create_expense_payable` | `expenses.manage` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_correct_finance_expense`, `correct_finance_expense` | `expenses.manage` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_submit_finance_expense`, `submit_finance_expense` | `expenses.manage` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_approve_finance_expense`, `approve_finance_expense` | `expenses.approve` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_reject_finance_expense`, `reject_finance_expense` | `expenses.approve` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_cancel_finance_expense`, `cancel_finance_expense` | `expenses.reverse` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_close_finance_expense`, `close_finance_expense` | `expenses.manage` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_remove_finance_expense`, `remove_finance_expense` | `expenses.reverse` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_classify_finance_expense`, `classify_finance_expense` | `expenses.manage` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_import_finance_expenses`, `import_finance_expenses` | `expenses.manage` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_classify_finance_expenses`, `classify_finance_expenses` | `expenses.manage` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_update_finance_expense_due_status`, `update_finance_expense_due_status` | `expenses.manage` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_register_expense_payment`, `register_expense_payment` | `expenses.pay` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_settle_expense_payment`, `settle_expense_payment` | `expenses.pay` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_reverse_expense_payment`, `reverse_expense_payment` | `expenses.reverse` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_pay_finance_expenses`, `pay_finance_expenses` | `expenses.pay` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_correct_finance_expenses`, `correct_finance_expenses` | `expenses.manage` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_create_petty_cash_fund`, `create_petty_cash_fund` | `petty_cash.funds.manage` | `petty_cash.cash` | PettyCashService / PettyCashTypeChanges |
| `preview_update_petty_cash_fund`, `update_petty_cash_fund` | `petty_cash.funds.manage` | `petty_cash.cash` | PettyCashService / PettyCashTypeChanges |
| `preview_close_petty_cash_fund`, `close_petty_cash_fund` | `petty_cash.funds.manage` | `petty_cash.cash` | PettyCashService / PettyCashTypeChanges |
| `preview_schedule_type_change_petty_cash_fund`, `schedule_type_change_petty_cash_fund` | `petty_cash.funds.manage` | `petty_cash.cash` | PettyCashService / PettyCashTypeChanges |
| `preview_cancel_type_change_petty_cash_fund`, `cancel_type_change_petty_cash_fund` | `petty_cash.funds.manage` | `petty_cash.cash` | PettyCashService / PettyCashTypeChanges |
| `preview_disable_kiosk_petty_cash_fund`, `disable_kiosk_petty_cash_fund` | `petty_cash.funds.manage` | `petty_cash.cash` | PettyCashService / PettyCashTypeChanges |
| `preview_enable_kiosk_petty_cash_fund`, `enable_kiosk_petty_cash_fund` | `petty_cash.funds.manage` | `petty_cash.cash` | PettyCashService / PettyCashTypeChanges |
| `preview_revoke_kiosk_petty_cash_fund`, `revoke_kiosk_petty_cash_fund` | `petty_cash.funds.manage` | `petty_cash.cash` | PettyCashService / PettyCashTypeChanges |
| `preview_deposit_petty_cash_fund`, `deposit_petty_cash_fund` | `petty_cash.deposit:create` | `petty_cash.control` | PettyCashService / PettyCashTypeChanges |
| `preview_capture_petty_cash_receipt`, `capture_petty_cash_receipt` | `petty_cash.expense:create` | `petty_cash.control` | PettyCashService / PettyCashBulkActionService |
| `preview_authorize_petty_cash_receipt`, `authorize_petty_cash_receipt` | `petty_cash.receipts.approve` | `petty_cash.control` | PettyCashService / PettyCashBulkActionService |
| `preview_reject_petty_cash_receipt`, `reject_petty_cash_receipt` | `petty_cash.receipts.manage` | `petty_cash.control` | PettyCashService / PettyCashBulkActionService |
| `preview_reverse_petty_cash_receipt`, `reverse_petty_cash_receipt` | `petty_cash.receipts.manage` | `petty_cash.control` | PettyCashService / PettyCashBulkActionService |
| `preview_classify_petty_cash_receipt`, `classify_petty_cash_receipt` | `petty_cash.receipts.manage` | `petty_cash.control` | PettyCashService / PettyCashBulkActionService |
| `preview_bulk_classify_petty_cash_receipt`, `bulk_classify_petty_cash_receipt` | `petty_cash.receipts.manage` | `petty_cash.control` | PettyCashService / PettyCashBulkActionService |
| `preview_close_petty_cash_statement`, `close_petty_cash_statement` | `petty_cash.statements.close` | `petty_cash.statements` | PettyCashService |
| `preview_remove_expense_attachment`, `remove_expense_attachment` | `expenses.manage` | `expenses.expenses` | ExpenseService / correction / import / bulk / reversal |
| `preview_remove_budget_line_attachment`, `remove_budget_line_attachment` | `expenses.budgets.manage` | `expenses.budgets` | BudgetLineService / BudgetExpenseSynchronizationService |
| `preview_remove_petty_cash_receipt_attachment`, `remove_petty_cash_receipt_attachment` | `petty_cash.receipts.manage` | `petty_cash.control` | PettyCashService / PettyCashBulkActionService |

Importar capturas pagadas requiere además `expenses.pay`; cambiar vencimientos con aprobación requiere además `expenses.approve`.
Quitar adjuntos requiere además `files.attach`. Los catálogos/configuración de fondos requieren rol administrativo actual.

## Archivos y reportes

| Herramienta | Scopes | Pestaña/propietario |
| --- | --- | --- |
| `preview_attach_expense_file`, `attach_expense_file` | `files.attach` + `expenses.manage` | Gastos / ExpenseAttachmentService |
| `preview_attach_budget_line_file`, `attach_budget_line_file` | `files.attach` + `expenses.budgets.manage` | Presupuestos / BudgetLineAttachmentService |
| `preview_attach_petty_cash_receipt_file`, `attach_petty_cash_receipt_file` | `files.attach` + `petty_cash.receipts.manage` | Control / PettyCashAttachmentService |
| `export_finance_report` | `files.read` + `expenses.read` o `petty_cash.read` | Pestaña exacta del reporte seleccionado / FinanceAssistantService |

Entrada y lectura reutilizan `stage_operational_file`, `stage_chatgpt_file`, `list_operational_files` y `get_operational_file`, con consentimiento y propietario del destino.

## Verificación por recorrido

| Recorrido | Evidencia automatizada |
| --- | --- |
| Pagos parciales, corrección, reversión, liquidación sin cuenta, cierre y PDF | AiFinanceWorkflowIntegrationTest + regresiones nativas de gastos |
| Importación pagada/impuesto explícito, corrección masiva y restricciones de fuente | AiFinanceWorkflowIntegrationTest + ExpenseOperationsIntegrationTest |
| Fondos internos/externos, captura, autorización, devolución y cierre | AiFinanceWorkflowIntegrationTest + FundExpenseCloseoutIntegrationTest |
| Rechazo y reversión una vez; decisiones firmadas de corte y obligación RH | AiFinanceWorkflowIntegrationTest + PettyCashCloseResolutionIntegrationTest |
| Cambio futuro/cancelación, kiosco y privacidad | AiFinanceWorkflowIntegrationTest + PettyCashTypeChangeIntegrationTest |
| Adjuntos privados, comprobación de bytes y reintentos | AiFileWorkflowIntegrationTest y propietarios nativos de archivos |
| Paginación, totales completos, exportación, cambio de estado y autoridad | AiFinanceWorkflowIntegrationTest + AiToolAuthorizationServiceTest + financeWorkflows.test.ts |
| Catálogo cerrado, scopes, HTTP y confirmación inmutable | financeWorkflows.test.ts + httpContinuity.test.ts + mcpServer.test.ts |
| Compatibilidad de acciones financieras previas | AiFinanceActionServiceTest + AiFinanceWorkflowIntegrationTest |

La evidencia de recorridos no afirma una prueba aislada de cada herramienta. Resultados y límites de liberación: [entrega](lupita-finance-delivery-2026-10-07.md).
