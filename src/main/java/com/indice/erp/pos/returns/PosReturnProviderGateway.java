package com.indice.erp.pos.returns;

import com.indice.erp.pos.PosContext;

interface PosReturnProviderGateway {
    String providerCode();
    void refund(PosContext context, long intentId, PosReturnRefundRequest request);
    void refresh(PosContext context, long intentId);
    void recheck(PosContext context, long intentId, long refundId, PosReturnReviewRequest request);
}
