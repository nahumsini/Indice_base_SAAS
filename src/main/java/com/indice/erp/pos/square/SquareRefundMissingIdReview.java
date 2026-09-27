package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class SquareRefundMissingIdReview {
    private final SquareRefundMissingIdStore store; private final SquareRefundQueries queries;
    private final SquareRefundAudit audit; private final Clock clock;
    SquareRefundMissingIdReview(SquareRefundMissingIdStore store, SquareRefundQueries queries,
            SquareRefundAudit audit, Clock clock) {
        this.store=store; this.queries=queries; this.audit=audit; this.clock=clock;
    }
    @Transactional
    public SquareRefundManualClaim claim(SquareRefundRecord refund, SquareRefundActor actor, String reason) {
        var lease = UUID.randomUUID().toString();
        if (!store.claim(refund, lease, clock.instant().plusSeconds(90)))
            throw PosApiException.conflict("Square refund changed during review; reload it.");
        var claimed = queries.find(refund.companyId(), refund.id(), false).orElseThrow();
        audit.record(claimed, actor, "REFUND_EXACT_KEY_REPLAY_AUTHORIZED",
            claimed.status(), reason, claimed.version());
        return new SquareRefundManualClaim(claimed, lease);
    }
}
