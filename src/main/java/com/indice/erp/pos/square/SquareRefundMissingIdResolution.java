package com.indice.erp.pos.square;

import org.springframework.stereotype.Component;

@Component
class SquareRefundMissingIdResolution {
    private final SquareRefundMissingIdReview missing; private final SquareRefundLifecycle lifecycle;
    SquareRefundMissingIdResolution(SquareRefundMissingIdReview missing, SquareRefundLifecycle lifecycle) {
        this.missing=missing; this.lifecycle=lifecycle;
    }
    SquareRefundRecord resolve(SquareRecords.PaymentIntent intent, SquareRefundRecord refund,
            SquareRefundActor actor, String reason) {
        return lifecycle.progressManual(intent, missing.claim(refund,actor,reason), actor);
    }
}
