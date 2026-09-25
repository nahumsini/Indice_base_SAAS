package com.indice.erp.pos.returns;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;

record PosReturnRecord(long ticketId, String ticketNumber, String ticketStatus,
        Instant completedAt, BigDecimal saleAmount, String currencyCode,
        String providerCode, Long intentId, String providerStatus, BigDecimal paymentAmount,
        BigDecimal refundedAmount, PosReturnRefundState latestRefund) {
    private static final Set<String> ACTIVE = Set.of("WAITING", "SUBMITTING", "PENDING", "UNCERTAIN",
        "RECONCILIATION_REQUIRED", "DEAD_LETTER");
    private static final Set<String> REFUNDABLE = Set.of("APPROVED", "PARTIALLY_REFUNDED");

    BigDecimal remaining() {
        return paymentAmount.subtract(refundedAmount).max(BigDecimal.ZERO);
    }

    PosReturnSummary summary() {
        var available = "COMPLETED".equals(ticketStatus) && intentId != null
            && REFUNDABLE.contains(providerStatus) && remaining().signum() > 0
            && (latestRefund == null || !ACTIVE.contains(latestRefund.status()));
        return new PosReturnSummary(ticketId, ticketNumber, ticketStatus, completedAt,
            saleAmount, currencyCode, intentId == null ? null : providerCode,
            providerStatus, paymentAmount, refundedAmount, remaining(), available, latestRefund);
    }
}
