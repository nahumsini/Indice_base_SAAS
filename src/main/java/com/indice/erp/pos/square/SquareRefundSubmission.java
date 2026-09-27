package com.indice.erp.pos.square;

import java.time.Clock;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
class SquareRefundSubmission {
    private final SquareRefundClaims claims; private final SquareRefundQueries queries;
    private final SquareRefundProviderSubmission provider; private final SquareRefundSubmissionTransition transition;
    private final SquareRefundProperties properties; private final Clock clock;
    SquareRefundSubmission(SquareRefundClaims claims, SquareRefundQueries queries,
            SquareRefundProviderSubmission provider, SquareRefundSubmissionTransition transition,
            SquareRefundProperties properties, Clock clock) {
        this.claims=claims; this.queries=queries; this.provider=provider; this.transition=transition;
        this.properties=properties; this.clock=clock;
    }
    SquareRefundRecord submit(SquareRecords.PaymentIntent intent, SquareRefundRecord refund,
            SquareRefundActor actor) {
        var resumable = Set.of("WAITING", "SUBMITTING").contains(refund.status());
        if (!resumable) return refund;
        var lease = UUID.randomUUID().toString();
        if (!claims.submission(refund, lease, clock.instant().plusSeconds(90),
                properties.submissionAttempts())) return reload(refund);
        return transition.apply(refund, lease, provider.submit(intent, refund), actor);
    }
    SquareRefundRecord submitManual(SquareRecords.PaymentIntent intent,
            SquareRefundManualClaim claim, SquareRefundActor actor) {
        return transition.apply(claim.refund(), claim.lease(),
            provider.submit(intent, claim.refund()), actor);
    }
    private SquareRefundRecord reload(SquareRefundRecord value) {
        return queries.byKey(value.companyId(), value.key()).orElseThrow();
    }
}
