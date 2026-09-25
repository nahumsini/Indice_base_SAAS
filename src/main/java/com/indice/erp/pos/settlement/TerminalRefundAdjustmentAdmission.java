package com.indice.erp.pos.settlement;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TerminalRefundAdjustmentAdmission {
    private final JdbcTemplate jdbc;
    private final TerminalRefundAdjustmentInsert adjustments;
    private final TerminalRefundAdjustmentEventInsert events;
    public TerminalRefundAdjustmentAdmission(JdbcTemplate jdbc) {
        this.jdbc = jdbc; this.adjustments = new TerminalRefundAdjustmentInsert(jdbc);
        this.events = new TerminalRefundAdjustmentEventInsert(jdbc);
    }
    public void lockShift(long companyId, long shiftId) {
        if (jdbc.queryForList("SELECT id FROM pos_shifts WHERE company_id=? AND id=? FOR UPDATE",
                Long.class, companyId, shiftId).isEmpty()) throw new IllegalStateException("Refund shift is unavailable.");
    }
    public void admit(long companyId, String provider, String refundId) {
        adjustments.insert(companyId, provider, refundId);
        events.insert(companyId, provider, refundId);
    }
}
