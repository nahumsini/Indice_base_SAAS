package com.indice.erp.pos.square;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class SquareRefundExhaustion {
    private final SquareRefundWorkStatus statuses; private final SquareRefundAudit audit;
    SquareRefundExhaustion(SquareRefundWorkStatus statuses, SquareRefundAudit audit) {
        this.statuses=statuses; this.audit=audit;
    }
    @Transactional
    public void requireReview(SquareRefundRecord refund) {
        if (statuses.unresolved(refund, "RECONCILIATION_REQUIRED", "SUBMISSION_ATTEMPTS_EXHAUSTED"))
            audit.record(refund, SquareRefundActor.scheduled(), "REFUND_RECONCILIATION_REQUIRED",
                "RECONCILIATION_REQUIRED", "SUBMISSION_ATTEMPTS_EXHAUSTED", refund.version() + 1);
    }
    @Transactional
    public void manualReplayUnknown(SquareRefundRecord refund) {
        var reason="MANUAL_REPLAY_OUTCOME_UNKNOWN";
        if (statuses.unresolved(refund,"RECONCILIATION_REQUIRED",reason))
            audit.record(refund,SquareRefundActor.scheduled(),"REFUND_RECONCILIATION_REQUIRED",
                "RECONCILIATION_REQUIRED",reason,refund.version()+1);
    }
}
