package com.indice.erp.pos.returns;

import java.math.BigDecimal;
import java.time.Instant;

public record PosReturnRefundState(
        long refundId,
        String requestKey,
        BigDecimal amount,
        String status,
        String reason,
        Instant updatedAt,
        long version) {
}
