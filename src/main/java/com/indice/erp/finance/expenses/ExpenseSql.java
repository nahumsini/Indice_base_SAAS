package com.indice.erp.finance.expenses;

final class ExpenseSql {

    static final String TABLE = "finance_expenses";

    static final String SELECT_COLUMNS = """
            expense.id,
            expense.company_id,
            expense.unit_id,
            expense.business_id,
            expense.provider_id,
            expense.budget_line_id,
            expense.accounting_account_id,
            expense.payment_account_id,
            expense.purchase_order_id,
            expense.folio,
            expense.concept,
            expense.description,
            expense.expense_type,
            expense.subtotal_amount,
            expense.tax_amount,
            expense.total_amount,
            expense.paid_amount,
            expense.balance_amount,
            expense.currency_code,
            expense.expense_date,
            expense.due_date,
            expense.payment_date,
            expense.close_date,
            expense.requested_by_user_id,
            expense.approved_by_user_id,
            expense.performed_by_user_id,
            expense.status,
            expense.payment_status,
            expense.audit_status,
            COALESCE((
                SELECT COUNT(*)
                FROM finance_expense_attachments attachment
                WHERE attachment.company_id = expense.company_id
                  AND attachment.expense_id = expense.id
                  AND attachment.deleted_at IS NULL
            ), expense.attachment_count) AS attachment_count,
            expense.created_by_user_id,
            expense.updated_by_user_id,
            expense.created_at,
            expense.updated_at,
            expense.deleted_at,
            expense.version,
            expense.custom_fields_json,
            expense.metadata_json
            """;

    private ExpenseSql() {
    }
}
