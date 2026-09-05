package com.indice.erp.finance.paymentaccounts;

final class PaymentAccountSql {

    static final String SELECT_COLUMNS = """
            account.id,
            account.company_id,
            account.unit_id,
            account.business_id,
            account.name,
            account.type,
            account.currency_code,
            account.opening_balance,
            account.current_balance,
            account.pending_balance,
            account.status,
            account.description,
            account.system_key,
            account.is_system_managed,
            account.created_by_user_id,
            account.updated_by_user_id,
            account.created_at,
            account.updated_at,
            account.deleted_at,
            account.version,
            account.custom_fields_json,
            account.metadata_json
            """;

    static final String INSERT = """
            INSERT INTO finance_payment_accounts
            (company_id, unit_id, business_id, name, type, currency_code, opening_balance, current_balance,
             pending_balance, status, description, created_by_user_id, custom_fields_json, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.0000, ?, ?, ?, ?, ?)
            """;

    static final String UPDATE = """
            UPDATE finance_payment_accounts
            SET unit_id = ?,
                business_id = ?,
                name = ?,
                type = ?,
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
              AND is_system_managed = FALSE
            """;

    private PaymentAccountSql() {
    }
}
