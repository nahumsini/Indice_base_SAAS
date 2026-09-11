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
            fund.fund_type,
            fund.name,
            fund.currency_code,
            fund.limit_amount,
            fund.current_balance_amount,
            fund.cut_off_day,
            fund.funding_source_name,
            fund.external_owner_type,
            fund.external_owner_name,
            fund.external_owner_relationship,
            fund.external_owner_reference,
            fund.statement_recipient_email,
            fund.managed_asset_type,
            fund.managed_asset_name,
            fund.managed_asset_reference,
            fund.managed_assets_json,
            fund.external_identity_pending,
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
            fund.metadata_json,
            (SELECT change_record.id FROM finance_petty_cash_type_changes change_record
              WHERE change_record.company_id = fund.company_id AND change_record.petty_cash_fund_id = fund.id
                AND change_record.status = 'SCHEDULED' ORDER BY change_record.id DESC LIMIT 1) AS pending_type_change_id,
            (SELECT change_record.next_type FROM finance_petty_cash_type_changes change_record
              WHERE change_record.company_id = fund.company_id AND change_record.petty_cash_fund_id = fund.id
                AND change_record.status = 'SCHEDULED' ORDER BY change_record.id DESC LIMIT 1) AS pending_fund_type,
            (SELECT change_record.effective_date FROM finance_petty_cash_type_changes change_record
              WHERE change_record.company_id = fund.company_id AND change_record.petty_cash_fund_id = fund.id
                AND change_record.status = 'SCHEDULED' ORDER BY change_record.id DESC LIMIT 1) AS pending_type_effective_date
            """;

    static final String STATEMENT_COLUMNS = """
            statement.id,
            statement.company_id,
            statement.petty_cash_fund_id,
            statement.fund_type_snapshot,
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
            statement.external_owner_type_snapshot,
            statement.external_owner_name_snapshot,
            statement.external_owner_relationship_snapshot,
            statement.external_owner_reference_snapshot,
            statement.statement_recipient_email_snapshot,
            statement.managed_asset_type_snapshot,
            statement.managed_asset_name_snapshot,
            statement.managed_asset_reference_snapshot,
            statement.managed_assets_snapshot_json,
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
            movement.external_source_name,
            movement.entry_category,
            movement.counterparty_name,
            movement.statement_description,
            movement.funding_method,
            movement.internal_note,
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
            settlement_line.cancellation_reason,
            settlement_line.cancelled_by_user_id,
            settlement_line.cancelled_at,
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
             funding_source_payment_account_id, responsible_user_id, fund_type, name, currency_code, limit_amount,
             current_balance_amount, cut_off_day, funding_source_name, external_owner_type, external_owner_name,
             external_owner_relationship, external_owner_reference, statement_recipient_email, managed_asset_type,
             managed_asset_name, managed_asset_reference, external_identity_pending, funding_methods_json, spending_methods_json,
             kiosk_enabled, kiosk_uses_universal_pin, kiosk_access_url, kiosk_public_token, status, created_by_user_id,
             custom_fields_json, metadata_json, managed_assets_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                fund_type = ?,
                name = ?,
                currency_code = ?,
                limit_amount = ?,
                cut_off_day = ?,
                funding_source_name = ?,
                external_owner_type = ?,
                external_owner_name = ?,
                external_owner_relationship = ?,
                external_owner_reference = ?,
                statement_recipient_email = ?,
                managed_asset_type = ?,
                managed_asset_name = ?,
                managed_asset_reference = ?,
                managed_assets_json = ?,
                external_identity_pending = ?,
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
            (company_id, petty_cash_fund_id, fund_type_snapshot, folio, period_key, period_start, period_end, cut_off_date,
             opening_balance_amount, assigned_amount, additional_deposit_amount, declared_closing_balance_amount,
             estimated_usage_amount, verified_expense_amount, returned_amount, shortage_amount, carry_forward_amount,
             currency_code, status, responsible_user_id, external_owner_type_snapshot, external_owner_name_snapshot,
             external_owner_relationship_snapshot, external_owner_reference_snapshot, statement_recipient_email_snapshot,
             managed_asset_type_snapshot, managed_asset_name_snapshot, managed_asset_reference_snapshot,
             attachment_count, created_by_user_id,
             custom_fields_json, metadata_json, managed_assets_snapshot_json, type_stage_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

    static final String INSERT_MOVEMENT = """
            INSERT INTO finance_petty_cash_movements
            (company_id, petty_cash_fund_id, petty_cash_statement_id, from_payment_account_id, to_payment_account_id,
             external_source_name, entry_category, counterparty_name, statement_description, funding_method, internal_note,
             type, amount, currency_code, movement_date, reference, created_by_user_id,
             custom_fields_json, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
