package com.indice.erp.pos.settlement;

import java.math.BigDecimal;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TerminalRefundAdjustmentBalance {
    private final JdbcTemplate jdbc;
    public TerminalRefundAdjustmentBalance(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public BigDecimal postedPending(long companyId, long settlementId) {
        return jdbc.queryForObject("""
            SELECT COALESCE(SUM(amount),0) FROM pos_terminal_refund_adjustments
            WHERE company_id=? AND cash_closing_settlement_id=? AND state='POSTED'
              AND posting_balance='PENDING'
            """, BigDecimal.class, companyId, settlementId);
    }

    public BigDecimal remainingPending(long companyId, long settlementId) {
        return jdbc.queryForObject("""
            SELECT settlement.pending_amount-COALESCE(SUM(adjustment.amount),0)
            FROM pos_cash_closing_settlements settlement
            LEFT JOIN pos_terminal_refund_adjustments adjustment
              ON adjustment.company_id=settlement.company_id
              AND adjustment.cash_closing_settlement_id=settlement.id
              AND adjustment.state='POSTED' AND adjustment.posting_balance='PENDING'
            WHERE settlement.company_id=? AND settlement.id=? GROUP BY settlement.id
            """, BigDecimal.class, companyId, settlementId);
    }
}
