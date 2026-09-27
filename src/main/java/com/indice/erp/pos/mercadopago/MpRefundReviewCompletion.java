package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
class MpRefundReviewCompletion {
    private final MpEvidenceApplication evidence;
    private final MpRefundRequestStore requests;
    private final MpRefundReviewLease leases;
    private final MpRefundWorkStatus statuses;
    private final MpPaymentAudit audit;
    private final MpFinancialEvidenceLock locks;
    private final MpIntentStore intents;
    private final MpProperties properties;
    private final Clock clock;
    @Transactional public MpRefundRecord complete(PosContext context, MpIntent intent, MpRefundRecord refund,
            String lease, MpRefundReviewRequest request, MpVerifiedOrder verified) {
        return locks.apply(intent, () -> completeLocked(context, intent, refund, lease, request, verified));
    }
    private MpRefundRecord completeLocked(PosContext context, MpIntent intent, MpRefundRecord refund,
            String lease, MpRefundReviewRequest request, MpVerifiedOrder verified) {
        var actor = MpAuditActor.user(context.userId());
        var currentIntent=intents.lock(intent.companyId(),intent.id());
        if (currentIntent.version()!=intent.version()) throw PosApiException.conflict(
            "Payment changed during refund review; reload it.");
        var claimed = leases.lockOwned(refund, lease, clock.instant()).orElseThrow(() ->
            PosApiException.conflict("Refund review changed concurrently; reload it."));
        if (verified != null && !evidence.applyLocked(currentIntent, verified, actor)) {
            throw PosApiException.conflict("Payment changed during refund review; reload it.");
        }
        var current = requests.find(context.companyId(), refund.id()).orElseThrow();
        if (!current.status().equals("CONFIRMED")) {
            if (!statuses.checked(claimed, lease, "RECONCILIATION_REQUIRED", "MANUAL_RECHECK_UNRESOLVED",
                    clock.instant().plusSeconds(properties.refundRecoveryDelaySeconds()))) {
                throw PosApiException.conflict("Refund review changed concurrently; reload it.");
            }
            current = requests.find(context.companyId(), refund.id()).orElseThrow();
        }
        audit.review(currentIntent, actor, "REFUND_RECHECK", current.status(), request.reason().trim(), current.version());
        return current;
    }
}
