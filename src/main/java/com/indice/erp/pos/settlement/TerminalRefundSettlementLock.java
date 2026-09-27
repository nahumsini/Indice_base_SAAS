package com.indice.erp.pos.settlement;

import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TerminalRefundSettlementLock {
    private final JdbcTemplate jdbc;
    public TerminalRefundSettlementLock(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<TerminalRefundSettlement> lock(long companyId, long settlementId) {
        return jdbc.query("""
            SELECT pending_amount,status FROM pos_cash_closing_settlements
            WHERE company_id=? AND id=? FOR UPDATE
            """, (rs, row) -> new TerminalRefundSettlement(
                rs.getBigDecimal("pending_amount"), rs.getString("status")),
            companyId, settlementId).stream().findFirst();
    }
}
