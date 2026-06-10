package com.indice.erp.finance.budgetlines;

final class BudgetLineSql {

    static final String SELECT_COLUMNS = """
            line.id,
            line.company_id,
            line.unit_id,
            line.business_id,
            line.budget_id,
            line.name,
            line.category_key,
            line.planned_amount,
            line.committed_amount,
            line.actual_expense_amount,
            line.petty_cash_issued_amount,
            line.petty_cash_settled_amount,
            line.available_amount,
            line.health_status,
            line.currency_code,
            line.status,
            line.description,
            line.created_by_user_id,
            line.updated_by_user_id,
            line.created_at,
            line.updated_at,
            line.deleted_at,
            line.version,
            line.custom_fields_json,
            line.metadata_json
            """;

    static final String INSERT = """
            INSERT INTO finance_budget_lines
            (company_id, unit_id, business_id, budget_id, name, category_key, planned_amount,
             committed_amount, actual_expense_amount, petty_cash_issued_amount, petty_cash_settled_amount,
             available_amount, health_status, currency_code, status, description, created_by_user_id,
             custom_fields_json, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

    static final String UPDATE = """
            UPDATE finance_budget_lines
            SET unit_id = ?,
                business_id = ?,
                budget_id = ?,
                name = ?,
                category_key = ?,
                planned_amount = ?,
                committed_amount = ?,
                actual_expense_amount = ?,
                petty_cash_issued_amount = ?,
                petty_cash_settled_amount = ?,
                available_amount = ?,
                health_status = ?,
                currency_code = ?,
                status = ?,
                description = ?,
                updated_by_user_id = ?,
                custom_fields_json = ?,
                metadata_json = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """;

    private BudgetLineSql() {
    }
}
