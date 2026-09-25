package com.indice.erp.pos.square;

import java.time.Clock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class SquareRefundSubmissionTransition {
    private final SquareRefundWorkStatus statuses; private final SquareRefundQueries queries;
    private final SquareRefundAudit audit; private final SquareRefundProperties properties;
    private final Clock clock;
    SquareRefundSubmissionTransition(SquareRefundWorkStatus statuses, SquareRefundQueries queries,
            SquareRefundAudit audit, SquareRefundProperties properties, Clock clock) {
        this.statuses=statuses; this.queries=queries; this.audit=audit;
        this.properties=properties; this.clock=clock;
    }
    @Transactional
    public SquareRefundRecord apply(SquareRefundRecord refund, String lease,
            SquareRefundSubmissionOutcome outcome, SquareRefundActor actor) {
        var changed = statuses.submitted(refund, lease, outcome,
            clock.instant().plusSeconds(properties.recoveryDelay()));
        var current = queries.byKey(refund.companyId(), refund.key()).orElseThrow();
        if (changed) audit.record(current, actor, "REFUND_" + outcome.status(),
            outcome.status(), outcome.error(), current.version());
        return current;
    }
}
