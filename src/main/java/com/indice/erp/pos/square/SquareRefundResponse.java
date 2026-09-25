package com.indice.erp.pos.square;

import java.math.BigDecimal;
import java.util.Locale;

public record SquareRefundResponse(long refundId, long intentId, String requestKey,
        BigDecimal amount, String currencyCode, String providerRefundId,
        String status, long version) {
    static SquareRefundResponse from(SquareRefundRecord value) {
        return new SquareRefundResponse(value.id(), value.intentId(), value.key(), value.amount(),
            value.currencyCode(), value.providerRefundId(), value.status().toLowerCase(Locale.ROOT), value.version());
    }
}
