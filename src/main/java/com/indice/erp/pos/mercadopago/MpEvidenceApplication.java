package com.indice.erp.pos.mercadopago;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MpEvidenceApplication {
    private final MpFinancialEvidenceLock locks;
    private final MpIntentStore intents;
    private final MpIntentWriter writer;
    private final MpRefundEvidence refunds;
    private final MpPaymentAudit audit;
    public boolean apply(MpIntent observed, MpVerifiedOrder verified) {
        return apply(observed, verified, MpAuditActor.system());
    }
    public boolean apply(MpIntent observed, MpVerifiedOrder verified, MpAuditActor actor) {
        return apply(observed, verified, actor, null);
    }
    public boolean applyReview(MpIntent observed, MpVerifiedOrder verified, MpAuditActor actor, String reason) {
        return apply(observed, verified, actor, reason);
    }
    private boolean apply(MpIntent observed, MpVerifiedOrder verified, MpAuditActor actor, String reason) {
        return locks.apply(observed, () -> {
            var current = intents.lock(observed.companyId(), observed.id());
            if (current.version() != observed.version()) return false;
            return applyLocked(current, verified, actor, reason);
        });
    }
    boolean applyLocked(MpIntent current, MpVerifiedOrder verified, MpAuditActor actor) {
        return applyLocked(current, verified, actor, null);
    }
    private boolean applyLocked(MpIntent current, MpVerifiedOrder verified, MpAuditActor actor, String reason) {
        if (!writer.evidence(current, verified.evidence())) return false;
        var changed=refunds.record(current, verified.order(), verified.evidence());
        if (changed || !current.status().equals(verified.evidence().status())
                || !java.util.Objects.equals(current.paymentId(), verified.evidence().paymentId()))
            audit.recordAs(current, actor, "ORDER_VERIFIED", verified.evidence().status());
        if (reason != null) audit.review(current, actor, "MERCHANT_REVIEW_EVIDENCE",
            verified.evidence().status(), reason, current.version());
        return true;
    }
}
