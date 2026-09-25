package com.indice.erp.pos.settlement;

import java.math.BigDecimal;

public record TerminalRefundSettlement(BigDecimal pendingAmount, String status) {
    public String postingBalance() {
        if ("PENDING".equals(status)) return "PENDING";
        return "SETTLED".equals(status) || "RECONCILIATION_REQUIRED".equals(status)
            ? "AVAILABLE" : null;
    }

    public boolean ready() { return postingBalance() != null; }
}
