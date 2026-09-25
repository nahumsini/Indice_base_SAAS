package com.indice.erp.pos.mercadopago;

import java.math.BigDecimal;
import java.util.Locale;

public record MpRefundResponse(long refundId, long intentId, String requestKey,
        BigDecimal amount, String status, long version) {
    public static MpRefundResponse from(MpRefundRecord refund) {
        return new MpRefundResponse(refund.id(), refund.intentId(), refund.key(),
            refund.amount(), refund.status().toLowerCase(Locale.ROOT), refund.version());
    }
}
