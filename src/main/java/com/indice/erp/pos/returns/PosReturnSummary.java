package com.indice.erp.pos.returns;

import java.math.BigDecimal;
import java.time.Instant;

public record PosReturnSummary(
        long ticketId,
        String ticketNumber,
        String ticketStatus,
        Instant completedAt,
        BigDecimal saleAmount,
        String currencyCode,
        String providerCode,
        String providerStatus,
        BigDecimal paymentAmount,
        BigDecimal refundedAmount,
        BigDecimal refundableAmount,
        boolean refundAvailable,
        PosReturnRefundState latestRefund) {
}
