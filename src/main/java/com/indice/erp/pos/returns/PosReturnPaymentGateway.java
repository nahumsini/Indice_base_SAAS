package com.indice.erp.pos.returns;

import com.indice.erp.pos.PosContext;

public interface PosReturnPaymentGateway {
    void refund(PosContext context, String provider, long intentId, PosReturnRefundRequest request);
    void refresh(PosContext context, String provider, long intentId);
    void recheck(PosContext context, String provider, long intentId, long refundId,
        PosReturnReviewRequest request);
}
