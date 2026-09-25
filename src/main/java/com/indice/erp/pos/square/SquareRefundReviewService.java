package com.indice.erp.pos.square;

import com.indice.erp.pos.*;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class SquareRefundReviewService {
    private final SquareRefundPolicy policy; private final SquarePaymentIntentRepository intents;
    private final SquarePaymentAccess access; private final SquareRefundQueries refunds;
    private final SquareRefundRecovery recovery; private final SquareRefundMissingIdResolution missing;
    public SquareRefundReviewService(SquareRefundPolicy policy, SquarePaymentIntentRepository intents,
            SquarePaymentAccess access, SquareRefundQueries refunds, SquareRefundRecovery recovery,
            SquareRefundMissingIdResolution missing) {
        this.policy=policy; this.intents=intents; this.access=access; this.refunds=refunds;
        this.recovery=recovery; this.missing=missing;
    }
    public SquareRefundRecord recheck(PosContext context, long intentId, long refundId,
            SquareRefundReviewRequest request) {
        policy.requireEnabled();
        var intent = intents.findById(context, intentId)
            .orElseThrow(() -> PosApiException.notFound("Square payment intent was not found."));
        access.require(context, intent);
        var refund = refunds.find(context.companyId(), refundId, false)
            .orElseThrow(() -> PosApiException.notFound("Square refund request was not found."));
        requireReviewable(intent, refund, request);
        var actor = SquareRefundActor.user(context.userId()); var reason = request.reason().trim();
        if (refund.providerRefundId() == null) {
            if (!Set.of("UNCERTAIN","RECONCILIATION_REQUIRED","DEAD_LETTER").contains(refund.status()))
                throw PosApiException.conflict("Square refund changed during review; reload it.");
            return missing.resolve(intent,refund,actor,reason);
        }
        return recovery.check(intent, refund, actor, reason, true);
    }
    private void requireReviewable(SquareRecords.PaymentIntent intent, SquareRefundRecord refund,
            SquareRefundReviewRequest request) {
        var reason = request == null || request.reason() == null ? "" : request.reason().trim();
        if (reason.length() < 8 || reason.length() > 500)
            throw PosApiException.badRequest("Square refund review reason is invalid.");
        if (request == null || refund.intentId() != intent.id()
                || request.expectedVersion() == null || request.expectedVersion() != refund.version()
                || !Set.of("PENDING","UNCERTAIN","RECONCILIATION_REQUIRED","DEAD_LETTER").contains(refund.status()))
            throw PosApiException.conflict("Square refund changed during review; reload it.");
    }
}
