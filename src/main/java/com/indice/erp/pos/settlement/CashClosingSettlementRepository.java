package com.indice.erp.pos.settlement;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class CashClosingSettlementRepository {

    private final JdbcTemplate jdbcTemplate;

    CashClosingSettlementRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    int openShifts(long companyId) {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM pos_shifts WHERE company_id = ? AND status IN ('OPEN', 'CLOSING') AND deleted_at IS NULL", Integer.class, companyId);
    }

    java.util.Map<String, java.math.BigDecimal> retainedCash(long companyId) {
        var result = new java.util.LinkedHashMap<String, java.math.BigDecimal>();
        jdbcTemplate.query("""
            SELECT shift.currency_code, SUM(closing.counted_cash_amount + closing.safe_drop_amount - COALESCE((
                SELECT SUM(settlement.transferable_amount) FROM pos_cash_closing_settlements settlement
                WHERE settlement.company_id = closing.company_id AND settlement.cash_closing_id = closing.id
                  AND settlement.payment_method = 'CASH'
            ), 0)) amount
            FROM pos_cash_closings closing JOIN pos_shifts shift ON shift.company_id = closing.company_id AND shift.id = closing.shift_id
            WHERE closing.company_id = ? AND closing.deleted_at IS NULL AND NOT EXISTS (
                SELECT 1 FROM pos_cash_closings newer WHERE newer.company_id = closing.company_id
                  AND newer.cash_register_id = closing.cash_register_id AND newer.id > closing.id AND newer.deleted_at IS NULL)
            GROUP BY shift.currency_code
            """, (org.springframework.jdbc.core.RowCallbackHandler) rs -> result.put(rs.getString(1), rs.getBigDecimal(2)), companyId);
        return result;
    }

    CashClosingSettlement insert(
            PosContext context,
            long closingId,
            long shiftId,
            long registerId,
            Long unitId,
            Long businessId,
            SettlementRuleResponse rule,
            java.math.BigDecimal grossAmount,
            java.math.BigDecimal retainedCashAmount,
            java.math.BigDecimal transferableAmount,
            java.math.BigDecimal pendingAmount,
            java.math.BigDecimal settledAmount,
            String status,
            String snapshotJson) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                INSERT INTO pos_cash_closing_settlements
                  (company_id, cash_closing_id, shift_id, cash_register_id, payment_method,
                   currency_code, gross_amount, retained_cash_amount, transferable_amount,
                   destination_payment_account_id, settlement_timing, pending_amount, settled_amount,
                   variance_amount, status, policy_snapshot_json, settled_at, settled_by_user_id,
                   created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0000, ?, ?,
                        CASE WHEN ? = 'SETTLED' THEN CURRENT_TIMESTAMP ELSE NULL END,
                        CASE WHEN ? = 'SETTLED' THEN ? ELSE NULL END, ?)
                """,
                Statement.RETURN_GENERATED_KEYS
            );
            var index = 1;
            statement.setLong(index++, context.companyId());
            statement.setLong(index++, closingId);
            statement.setLong(index++, shiftId);
            statement.setLong(index++, registerId);
            statement.setString(index++, rule.paymentMethod());
            statement.setString(index++, rule.currencyCode());
            statement.setBigDecimal(index++, grossAmount);
            statement.setBigDecimal(index++, retainedCashAmount);
            statement.setBigDecimal(index++, transferableAmount);
            statement.setLong(index++, rule.destinationPaymentAccountId());
            statement.setString(index++, rule.settlementTiming());
            statement.setBigDecimal(index++, pendingAmount);
            statement.setBigDecimal(index++, settledAmount);
            statement.setString(index++, status);
            statement.setString(index++, snapshotJson);
            statement.setString(index++, status);
            statement.setString(index++, status);
            statement.setLong(index++, context.userId());
            statement.setLong(index, context.userId());
            return statement;
        }, keyHolder);
        return findById(context, keyHolder.getKey().longValue(), false).orElseThrow();
    }

    List<CashClosingSettlement> findByClosing(PosContext context, long closingId) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(closingId);
        PosSqlSupport.appendScopeParams(params, context.scope());
        return jdbcTemplate.query(
            selectSql() + """
            WHERE settlement.company_id = ? AND settlement.cash_closing_id = ?
              AND %s
            ORDER BY FIELD(settlement.payment_method, 'CASH', 'CARD', 'TRANSFER', 'WALLET')
            """.formatted(PosSqlSupport.scopePredicate("closing", context.scope())),
            this::map,
            params.toArray()
        );
    }

    Optional<CashClosingSettlement> lockById(PosContext context, long closingId, long settlementId) {
        return findByIdAndClosing(context, closingId, settlementId, true);
    }

    private Optional<CashClosingSettlement> findById(PosContext context, long settlementId, boolean lock) {
        return jdbcTemplate.query(
            selectSql() + """
            WHERE settlement.company_id = ? AND settlement.id = ?
            """ + (lock ? " FOR UPDATE" : ""),
            this::map,
            context.companyId(), settlementId
        ).stream().findFirst();
    }

    private Optional<CashClosingSettlement> findByIdAndClosing(
            PosContext context,
            long closingId,
            long settlementId,
            boolean lock) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(closingId);
        params.add(settlementId);
        PosSqlSupport.appendScopeParams(params, context.scope());
        return jdbcTemplate.query(
            selectSql() + """
            WHERE settlement.company_id = ? AND settlement.cash_closing_id = ? AND settlement.id = ?
              AND %s
            """.formatted(PosSqlSupport.scopePredicate("closing", context.scope())) + (lock ? " FOR UPDATE" : ""),
            this::map,
            params.toArray()
        ).stream().findFirst();
    }

    boolean confirm(
            PosContext context,
            CashClosingSettlement settlement,
            java.math.BigDecimal receivedAmount,
            java.math.BigDecimal varianceAmount,
            String status,
            String note) {
        return jdbcTemplate.update(
            """
            UPDATE pos_cash_closing_settlements
            SET pending_amount = 0.0000,
                settled_amount = ?,
                variance_amount = ?,
                status = ?,
                settled_at = CURRENT_TIMESTAMP,
                settled_by_user_id = ?,
                metadata_json = JSON_SET(COALESCE(metadata_json, JSON_OBJECT()), '$.confirmationNote', ?),
                version = version + 1
            WHERE company_id = ? AND id = ? AND status = 'PENDING' AND version = ?
            """,
            receivedAmount, varianceAmount, status, context.userId(), note,
            context.companyId(), settlement.id(), settlement.version()
        ) == 1;
    }

    private String selectSql() {
        return """
            SELECT settlement.*, closing.unit_id, closing.business_id,
                   account.name AS destination_account_name
            FROM pos_cash_closing_settlements settlement
            JOIN pos_cash_closings closing
              ON closing.id = settlement.cash_closing_id
             AND closing.company_id = settlement.company_id
             AND closing.deleted_at IS NULL
            JOIN finance_payment_accounts account
              ON account.id = settlement.destination_payment_account_id
             AND account.company_id = settlement.company_id
             AND account.deleted_at IS NULL
            """;
    }

    private CashClosingSettlement map(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new CashClosingSettlement(
            rs.getLong("id"), rs.getLong("company_id"), rs.getLong("cash_closing_id"),
            rs.getLong("shift_id"), rs.getLong("cash_register_id"),
            PosSqlSupport.nullableLong(rs, "unit_id"), PosSqlSupport.nullableLong(rs, "business_id"),
            rs.getString("payment_method"), rs.getString("currency_code"),
            rs.getBigDecimal("gross_amount"), rs.getBigDecimal("retained_cash_amount"),
            rs.getBigDecimal("transferable_amount"), rs.getLong("destination_payment_account_id"),
            rs.getString("destination_account_name"), rs.getString("settlement_timing"),
            rs.getBigDecimal("pending_amount"), rs.getBigDecimal("settled_amount"),
            rs.getBigDecimal("variance_amount"), rs.getString("status"),
            rs.getString("policy_snapshot_json"), PosSqlSupport.instant(rs, "settled_at"),
            PosSqlSupport.nullableLong(rs, "settled_by_user_id"), rs.getLong("version")
        );
    }
}
