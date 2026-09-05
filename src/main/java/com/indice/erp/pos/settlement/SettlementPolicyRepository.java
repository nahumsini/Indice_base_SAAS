package com.indice.erp.pos.settlement;

import com.indice.erp.pos.PosContext;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SettlementPolicyRepository {

    private final JdbcTemplate jdbcTemplate;

    SettlementPolicyRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    List<SettlementRuleResponse> findAll(PosContext context, long registerId) {
        return jdbcTemplate.query(
            selectSql() + """
            WHERE rule.company_id = ? AND rule.cash_register_id = ?
            ORDER BY FIELD(rule.payment_method, 'CASH', 'CARD', 'TRANSFER', 'WALLET', 'CREDIT'),
                     rule.currency_code
            """,
            this::map,
            context.companyId(), registerId
        );
    }

    List<SettlementRuleResponse> findByCurrency(PosContext context, long registerId, String currencyCode) {
        return jdbcTemplate.query(
            selectSql() + """
            WHERE rule.company_id = ? AND rule.cash_register_id = ? AND rule.currency_code = ?
            ORDER BY FIELD(rule.payment_method, 'CASH', 'CARD', 'TRANSFER', 'WALLET', 'CREDIT')
            """,
            this::map,
            context.companyId(), registerId, currencyCode
        );
    }

    void upsert(
            PosContext context,
            long registerId,
            String paymentMethod,
            String currencyCode,
            Long accountId,
            String timing,
            boolean enabled,
            String reviewStatus) {
        jdbcTemplate.update(
            """
            INSERT INTO pos_cash_register_settlement_rules
              (company_id, cash_register_id, payment_method, currency_code,
               destination_payment_account_id, settlement_timing, enabled, review_status,
               created_by_user_id, updated_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              destination_payment_account_id = VALUES(destination_payment_account_id),
              settlement_timing = VALUES(settlement_timing),
              enabled = VALUES(enabled),
              review_status = VALUES(review_status),
              updated_by_user_id = VALUES(updated_by_user_id),
              version = version + 1
            """,
            context.companyId(), registerId, paymentMethod, currencyCode, accountId, timing,
            enabled, reviewStatus, context.userId(), context.userId()
        );
    }

    private String selectSql() {
        return """
            SELECT rule.id, rule.cash_register_id, rule.payment_method, rule.currency_code,
                   rule.destination_payment_account_id, account.name AS destination_account_name,
                   account.type AS destination_account_type,
                   account.current_balance AS destination_available_balance,
                   account.pending_balance AS destination_pending_balance,
                   rule.settlement_timing, rule.enabled, rule.review_status, rule.version
            FROM pos_cash_register_settlement_rules rule
            LEFT JOIN finance_payment_accounts account
              ON account.id = rule.destination_payment_account_id
             AND account.company_id = rule.company_id
             AND account.deleted_at IS NULL
            """;
    }

    private SettlementRuleResponse map(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        var accountId = rs.getLong("destination_payment_account_id");
        Long destinationAccountId = rs.wasNull() ? null : accountId;
        return new SettlementRuleResponse(
            rs.getLong("id"),
            rs.getLong("cash_register_id"),
            rs.getString("payment_method"),
            rs.getString("currency_code"),
            destinationAccountId,
            rs.getString("destination_account_name"),
            rs.getString("destination_account_type"),
            rs.getBigDecimal("destination_available_balance"),
            rs.getBigDecimal("destination_pending_balance"),
            rs.getString("settlement_timing"),
            rs.getBoolean("enabled"),
            rs.getString("review_status"),
            rs.getLong("version")
        );
    }
}
