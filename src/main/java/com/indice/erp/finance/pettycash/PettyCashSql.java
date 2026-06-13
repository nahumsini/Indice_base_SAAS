package com.indice.erp.finance.pettycash;

final class PettyCashSql {

    static final String FUND_COLUMNS = """
            fund.id,
            fund.company_id,
            fund.unit_id,
            fund.business_id,
            fund.budget_id,
            fund.budget_line_id,
            fund.payment_account_id,
            fund.funding_source_payment_account_id,
            fund.responsible_user_id,
            fund.name,
            fund.currency_code,
            fund.limit_amount,
            fund.current_balance_amount,
            fund.cut_off_day,
            fund.funding_source_name,
            fund.funding_methods_json,
            fund.spending_methods_json,
            fund.kiosk_enabled,
            fund.kiosk_uses_universal_pin,
            fund.kiosk_access_url,
            fund.kiosk_public_token,
            fund.status,
            fund.created_by_user_id,
            fund.updated_by_user_id,
            fund.created_at,
            fund.updated_at,
            fund.deleted_at,
            fund.version,
            fund.custom_fields_json,
            fund.metadata_json
            """;

    static final String STATEMENT_COLUMNS = """
            statement.id,
            statement.company_id,
            statement.petty_cash_fund_id,
            statement.folio,
            statement.period_key,
            statement.period_start,
            statement.period_end,
            statement.cut_off_date,
            statement.opening_balance_amount,
            statement.assigned_amount,
            statement.additional_deposit_amount,
            statement.declared_closing_balance_amount,
            statement.estimated_usage_amount,
            statement.verified_expense_amount,
            statement.returned_amount,
            statement.shortage_amount,
            statement.carry_forward_amount,
            statement.currency_code,
            statement.status,
            statement.responsible_user_id,
            statement.reviewed_by_user_id,
            statement.attachment_count,
            statement.created_by_user_id,
            statement.updated_by_user_id,
            statement.created_at,
            statement.updated_at,
            statement.deleted_at,
            statement.version,
            statement.custom_fields_json,
            statement.metadata_json
            """;

    static final String MOVEMENT_COLUMNS = """
            movement.id,
            movement.company_id,
            movement.petty_cash_fund_id,
            movement.petty_cash_statement_id,
            movement.from_payment_account_id,
            movement.to_payment_account_id,
            movement.type,
            movement.amount,
            movement.currency_code,
            movement.movement_date,
            movement.reference,
            movement.created_by_user_id,
            movement.updated_by_user_id,
            movement.created_at,
            movement.updated_at,
            movement.deleted_at,
            movement.version,
            movement.custom_fields_json,
            movement.metadata_json
            """;

    static final String SETTLEMENT_LINE_COLUMNS = """
            settlement_line.id,
            settlement_line.company_id,
            settlement_line.petty_cash_fund_id,
            settlement_line.petty_cash_statement_id,
            settlement_line.expense_id,
            settlement_line.provider_id,
            settlement_line.accounting_account_id,
            settlement_line.description,
            settlement_line.receipt_reference,
            settlement_line.subtotal_amount,
            settlement_line.tax_amount,
            settlement_line.total_amount,
            settlement_line.currency_code,
            settlement_line.expense_date,
            settlement_line.attachment_count,
            settlement_line.status,
            settlement_line.created_by_user_id,
            settlement_line.updated_by_user_id,
            settlement_line.created_at,
            settlement_line.updated_at,
            settlement_line.deleted_at,
            settlement_line.version,
            settlement_line.custom_fields_json,
            settlement_line.metadata_json
            """;

    static final String INSERT_FUND = """
            INSERT INTO finance_petty_cash_funds
            (company_id, unit_id, business_id, budget_id, budget_line_id, payment_account_id,
             funding_source_payment_account_id, responsible_user_id, name, currency_code, limit_amount,
             current_balance_amount, cut_off_day, funding_source_name, funding_methods_json, spending_methods_json,
             kiosk_enabled, kiosk_uses_universal_pin, kiosk_access_url, kiosk_public_token, status, created_by_user_id,
             custom_fields_json, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

    static final String UPDATE_FUND = """
            UPDATE finance_petty_cash_funds
            SET unit_id = ?,
                business_id = ?,
                budget_id = ?,
                budget_line_id = ?,
                payment_account_id = ?,
                funding_source_payment_account_id = ?,
                responsible_user_id = ?,
                name = ?,
                currency_code = ?,
                limit_amount = ?,
                cut_off_day = ?,
                funding_source_name = ?,
                funding_methods_json = ?,
                spending_methods_json = ?,
                kiosk_enabled = ?,
                kiosk_uses_universal_pin = ?,
                kiosk_access_url = ?,
                kiosk_public_token = ?,
                status = ?,
                updated_by_user_id = ?,
                custom_fields_json = ?,
                metadata_json = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """;

    static final String INSERT_STATEMENT = """
            INSERT INTO finance_petty_cash_statements
            (company_id, petty_cash_fund_id, folio, period_key, period_start, period_end, cut_off_date,
             opening_balance_amount, assigned_amount, additional_deposit_amount, declared_closing_balance_amount,
             estimated_usage_amount, verified_expense_amount, returned_amount, shortage_amount, carry_forward_amount,
             currency_code, status, responsible_user_id, attachment_count, created_by_user_id,
             custom_fields_json, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

    static final String INSERT_MOVEMENT = """
            INSERT INTO finance_petty_cash_movements
            (company_id, petty_cash_fund_id, petty_cash_statement_id, from_payment_account_id, to_payment_account_id,
             type, amount, currency_code, movement_date, reference, created_by_user_id, custom_fields_json, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

    static final String INSERT_SETTLEMENT_LINE = """
            INSERT INTO finance_petty_cash_settlement_lines
            (company_id, petty_cash_fund_id, petty_cash_statement_id, expense_id, provider_id, accounting_account_id,
             description, receipt_reference, subtotal_amount, tax_amount, total_amount, currency_code, expense_date,
             attachment_count, status, created_by_user_id, custom_fields_json, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

    private PettyCashSql() {
    }
}
