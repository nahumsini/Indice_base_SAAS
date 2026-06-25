package com.indice.erp.finance.providers;

final class ProviderSql {

    static final String SELECT_COLUMNS = """
            provider.id,
            provider.company_id,
            provider.unit_id,
            provider.business_id,
            provider.name,
            provider.legal_name,
            provider.tax_id,
            provider.email,
            provider.phone,
            provider.contact_name,
            provider.payment_terms_days,
            provider.status,
            provider.notes,
            provider.created_by_user_id,
            provider.updated_by_user_id,
            provider.created_at,
            provider.updated_at,
            provider.deleted_at,
            provider.version,
            provider.custom_fields_json,
            provider.metadata_json
            """;

    static final String INSERT = """
            INSERT INTO finance_providers
            (company_id, unit_id, business_id, name, legal_name, tax_id, email, phone, contact_name,
             payment_terms_days, status, notes, created_by_user_id, custom_fields_json, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

    static final String UPDATE = """
            UPDATE finance_providers
            SET unit_id = ?,
                business_id = ?,
                name = ?,
                legal_name = ?,
                tax_id = ?,
                email = ?,
                phone = ?,
                contact_name = ?,
                payment_terms_days = ?,
                status = ?,
                notes = ?,
                updated_by_user_id = ?,
                custom_fields_json = ?,
                metadata_json = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """;

    private ProviderSql() {
    }
}
