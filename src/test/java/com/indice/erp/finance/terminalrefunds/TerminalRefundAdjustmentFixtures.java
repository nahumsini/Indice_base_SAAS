package com.indice.erp.finance.terminalrefunds;

import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.math.BigDecimal;
import java.time.Instant;

final class TerminalRefundAdjustmentFixtures {
    private TerminalRefundAdjustmentFixtures() {}
    static final FinanceContext OWNER = new FinanceContext(5L, 7L, "Owner", "owner", true,
        FinanceScope.corporateOffice());
    static TerminalRefundAdjustment adjustment(String state, String settlement, long version) {
        return adjustment(state,settlement,version,"REFtest");
    }
    static TerminalRefundAdjustment adjustment(String state, String settlement, long version, String refundId) {
        return new TerminalRefundAdjustment(41, 7, 31, "MERCADO_PAGO", 17, "PAYtest",
            refundId, 21, "T-21", 22L, 23, 24, 25L, settlement, 26L, "Terminal bank",
            2L, 3L, new BigDecimal("20.0000"), "MXN", state,
            state.equals("PENDING_REVIEW") ? null : "Approved refund", null, null,
            null, null, Instant.parse("2026-09-22T00:00:00Z"),
            state.equals("PENDING_REVIEW") ? null : Instant.parse("2026-09-22T00:01:00Z"), null, version);
    }
}
