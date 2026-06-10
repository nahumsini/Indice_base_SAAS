package com.indice.erp.finance.accountingaccounts;

final class AccountingAccountSql {

    static final String SELECT_COLUMNS = """
            account.id,
            account.company_id,
            account.unit_id,
            account.business_id,
            account.code,
            account.name,
            account.group_key,
            account.description,
            account.status,
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
            INSERT INTO finance_accounting_accounts
            (company_id, unit_id, business_id, code, name, group_key, description, status,
             created_by_user_id, custom_fields_json, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

    static final String UPDATE = """
            UPDATE finance_accounting_accounts
            SET unit_id = ?,
                business_id = ?,
                code = ?,
                name = ?,
                group_key = ?,
                description = ?,
                status = ?,
                updated_by_user_id = ?,
                custom_fields_json = ?,
                metadata_json = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """;

    private AccountingAccountSql() {
    }
}
