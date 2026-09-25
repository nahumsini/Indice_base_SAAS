package com.indice.erp.pos.square;

import org.springframework.stereotype.Component;

@Component
class SquareRefundLifecycle {
    private final SquareRefundSubmission submission; private final SquareRefundRecovery recovery;
    SquareRefundLifecycle(SquareRefundSubmission submission, SquareRefundRecovery recovery) {
        this.submission=submission; this.recovery=recovery;
    }
    SquareRefundRecord progress(SquareRecords.PaymentIntent intent, SquareRefundRecord refund,
            SquareRefundActor actor) {
        return recover(intent, submission.submit(intent, refund, actor), actor);
    }
    SquareRefundRecord progressManual(SquareRecords.PaymentIntent intent,
            SquareRefundManualClaim claim, SquareRefundActor actor) {
        return recover(intent, submission.submitManual(intent, claim, actor), actor);
    }
    private SquareRefundRecord recover(SquareRecords.PaymentIntent intent,
            SquareRefundRecord current, SquareRefundActor actor) {
        if (current.providerRefundId() != null
                && java.util.Set.of("PENDING", "UNCERTAIN").contains(current.status()))
            current = recovery.check(intent, current, actor, null, false);
        return current;
    }
}
