package com.indice.erp.pos.square;

import com.indice.erp.pos.*;
import org.springframework.stereotype.Service;

@Service
public class SquareRefundService {
    private final SquareRefundPolicy policy; private final SquareRefundReservation reservation;
    private final SquarePaymentIntentRepository intents; private final SquarePaymentAccess access;
    private final SquareRefundLifecycle lifecycle; private final SquareRefundQueries refunds;
    private final SquareRefundRecovery recovery;
    public SquareRefundService(SquareRefundPolicy policy, SquareRefundReservation reservation,
            SquarePaymentIntentRepository intents, SquarePaymentAccess access, SquareRefundLifecycle lifecycle,
            SquareRefundQueries refunds, SquareRefundRecovery recovery) {
        this.policy=policy; this.reservation=reservation; this.intents=intents; this.access=access;
        this.lifecycle=lifecycle; this.refunds=refunds; this.recovery=recovery;
    }
    public SquareRefundRecord refund(PosContext context, long intentId, SquareRefundRequest request) {
        policy.requireEnabled();
        if (request == null) throw PosApiException.badRequest("Square refund request is required.");
        var reserved = reservation.reserve(context, intentId, request);
        var intent = intents.findById(context, intentId)
            .orElseThrow(() -> PosApiException.notFound("Square payment intent was not found."));
        access.require(context, intent);
        return lifecycle.progress(intent, reserved, SquareRefundActor.user(context.userId()));
    }
    public SquareRefundRecord refresh(PosContext context, long intentId) {
        policy.requireEnabled();
        var intent=intents.findById(context,intentId)
            .orElseThrow(()->PosApiException.notFound("Square payment intent was not found."));
        access.require(context,intent);
        var refund=refunds.latest(context.companyId(),intentId)
            .orElseThrow(()->PosApiException.conflict("No Square refund requires refresh."));
        if (!java.util.Set.of("PENDING","UNCERTAIN").contains(refund.status())) return refund;
        return recovery.check(intent,refund,SquareRefundActor.user(context.userId()),null,false);
    }
}
