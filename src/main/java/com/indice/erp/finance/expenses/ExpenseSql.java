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
            expense.metadata_json,
            origin_fund.id AS origin_fund_id,
            origin_fund.name AS origin_fund_name,
            origin_fund.fund_type AS origin_fund_type,
            EXISTS(SELECT 1 FROM finance_journal_entries journal
                   WHERE journal.company_id = expense.company_id
                     AND journal.source_type = 'EXPENSE'
                     AND journal.source_id = CAST(expense.id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci
                     AND journal.status = 'POSTED') AS accounting_posted,
            (expense.purchase_order_id IS NOT NULL AND (
                NOT EXISTS(SELECT 1 FROM pos_purchase_orders po WHERE po.company_id = expense.company_id AND po.id = expense.purchase_order_id)
                OR EXISTS(SELECT 1 FROM pos_purchase_orders po WHERE po.company_id = expense.company_id AND po.id = expense.purchase_order_id AND po.status IN ('PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED'))
                OR EXISTS(SELECT 1 FROM pos_purchase_order_items item WHERE item.company_id = expense.company_id AND item.purchase_order_id = expense.purchase_order_id AND item.received_quantity > 0)
                OR EXISTS(SELECT 1 FROM pos_purchase_receipts receipt WHERE receipt.company_id = expense.company_id AND receipt.purchase_order_id = expense.purchase_order_id)
            )) AS purchase_order_received
            """;

    // Settlements are authoritative. Legacy fallback requires an unambiguous custody account;
    // ordinary bank/cash/card accounts may be shared by historical funds and ordinary expenses.
    static final String FUND_JOIN = """
        LEFT JOIN finance_petty_cash_funds origin_fund
          ON origin_fund.company_id = expense.company_id
         AND origin_fund.id = COALESCE(
             (SELECT line.petty_cash_fund_id FROM finance_petty_cash_settlement_lines line
              WHERE line.company_id = expense.company_id AND line.expense_id = expense.id
              ORDER BY line.id LIMIT 1),
             (SELECT MIN(fund.id) FROM finance_petty_cash_funds fund
              JOIN finance_payment_accounts custody
                ON custody.company_id = fund.company_id AND custody.id = fund.payment_account_id
               AND custody.type = 'PETTY_CASH'
              WHERE fund.company_id = expense.company_id
                AND fund.payment_account_id = expense.payment_account_id
              HAVING COUNT(*) = 1))
        """;
    static final String COMPANY_EXPENSE = "(origin_fund.id IS NULL OR origin_fund.fund_type = 'INTERNAL_COMPANY')";

    private ExpenseSql() {
    }
}
