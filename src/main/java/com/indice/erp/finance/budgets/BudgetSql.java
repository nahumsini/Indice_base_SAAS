package com.indice.erp.finance.budgets;

final class BudgetSql {

    static final String SELECT_COLUMNS = """
            budget.id,
            budget.company_id,
            budget.unit_id,
            budget.business_id,
            budget.name,
            budget.description,
            budget.period_start,
            budget.period_end,
            budget.currency_code,
            budget.status,
            budget.created_by_user_id,
            budget.updated_by_user_id,
            budget.created_at,
            budget.updated_at,
            budget.deleted_at,
            budget.version,
            budget.custom_fields_json,
            budget.metadata_json
            """;

    static final String INSERT = """
            INSERT INTO finance_budgets
            (company_id, unit_id, business_id, name, description, period_start, period_end,
             currency_code, status, created_by_user_id, custom_fields_json, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

    static final String UPDATE = """
            UPDATE finance_budgets
            SET unit_id = ?,
                business_id = ?,
                name = ?,
                description = ?,
                period_start = ?,
                period_end = ?,
                currency_code = ?,
                status = ?,
                updated_by_user_id = ?,
                custom_fields_json = ?,
                metadata_json = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """;

    private BudgetSql() {
    }
}
