package com.indice.erp.pos.square;

import java.time.Clock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class SquareRefundRecoveryTransition {
    private final SquareRefundWorkStatus statuses; private final SquareRefundAudit audit;
    private final SquareRefundProperties properties; private final Clock clock;
    SquareRefundRecoveryTransition(SquareRefundWorkStatus statuses, SquareRefundAudit audit,
            SquareRefundProperties properties, Clock clock) {
        this.statuses=statuses; this.audit=audit; this.properties=properties; this.clock=clock;
    }
    @Transactional
    public void evidence(SquareRefundRecord refund, String lease, SquareRefundEvidence evidence,
            SquareRefundActor actor, String reason, boolean manual) {
        var exhausted = !manual && refund.recoveryAttempts() + 1 >= properties.recoveryAttempts();
        var status = evidence.status();
        if (status.equals("PENDING") && exhausted) status = "RECONCILIATION_REQUIRED";
        var error = status.equals("PENDING") ? "PROVIDER_CONFIRMATION_PENDING"
            : status.equals("RECONCILIATION_REQUIRED") ? "RECOVERY_ATTEMPTS_EXHAUSTED" : null;
        if (statuses.checked(refund, lease, status, error, evidence.safeJson(),
                clock.instant().plusSeconds(properties.recoveryDelay())))
            audit.record(refund, actor, "REFUND_" + status, status,
                reason == null ? error : reason, refund.version() + 2);
    }
    @Transactional
    public void failure(SquareRefundRecord refund, String lease, SquareRefundActor actor,
            String reason, boolean manual) {
        var exhausted = !manual && refund.recoveryAttempts() + 1 >= properties.recoveryAttempts();
        var status = exhausted ? "DEAD_LETTER" : manual
            && java.util.Set.of("RECONCILIATION_REQUIRED","DEAD_LETTER").contains(refund.status())
                ? refund.status() : "UNCERTAIN";
        if (statuses.checked(refund, lease, status, "PROVIDER_RECHECK_FAILED", refund.evidenceJson(),
                clock.instant().plusSeconds(properties.recoveryDelay())))
            audit.record(refund, actor, "REFUND_" + status, status,
                reason == null ? "PROVIDER_RECHECK_FAILED" : reason, refund.version() + 2);
    }
    @Transactional
    public void mismatch(SquareRefundRecord refund, String lease, SquareRefundActor actor, String reason) {
        var code = "PROVIDER_EVIDENCE_MISMATCH";
        if (statuses.checked(refund, lease, "RECONCILIATION_REQUIRED", code,
                refund.evidenceJson(), clock.instant().plusSeconds(properties.recoveryDelay())))
            audit.record(refund, actor, "REFUND_RECONCILIATION_REQUIRED",
                "RECONCILIATION_REQUIRED", reason == null ? code : reason, refund.version() + 2);
    }
}
