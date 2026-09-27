package com.indice.erp.pos.returns;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.square.*;
import org.springframework.stereotype.Component;

@Component
public record SquareReturnGateway(SquareRefundService refunds,
        SquareRefundReviewService reviews)
        implements PosReturnProviderGateway {
    public String providerCode() { return "SQUARE"; }
    public void refund(PosContext c, long id, PosReturnRefundRequest r) {
        refunds.refund(c, id, new SquareRefundRequest(r.idempotencyKey(), r.amount(), r.reason()));
    }
    public void refresh(PosContext c, long id) { refunds.refresh(c, id); }
    public void recheck(PosContext c, long id, long refund, PosReturnReviewRequest r) {
        reviews.recheck(c, id, refund, new SquareRefundReviewRequest(r.reason(), r.expectedVersion()));
    }
}
