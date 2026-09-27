package com.indice.erp.pos.mercadopago;

import java.time.Clock;
import java.util.UUID;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public record MpRefundRecoveryJob(MpProperties properties, MpRefundPolicy policy,
        MpRefundRecoveryQueue queue, MpRefundWorkClaims claims, MpRefundRecoveryOutcome outcomes,
        MpRefundRequestStore requests, MpIntentStore intents, MpRefundSubmission submission,
        MpPaymentRecovery recovery, Clock clock) {
    @Scheduled(fixedDelayString = "${app.pos.mercado-pago.refund-recovery-delay-ms:30000}")
    public void recover() {
        if (!properties.isEnabled() || !policy.enabled()) return;
        for (var refund : queue.due(25)) {
            try { handle(refund); }
            catch (RuntimeException failure) {
                org.slf4j.LoggerFactory.getLogger(MpRefundRecoveryJob.class).warn(
                    "Point refund recovery failed for company {} request {}", refund.companyId(), refund.id());
            }
        }
    }
    private void handle(MpRefundRecord refund) {
        var intent = intents.find(refund.companyId(), refund.intentId()).orElseThrow();
        if (java.util.Set.of("WAITING", "SUBMITTING").contains(refund.status())) {
            if (refund.submissionAttempts() >= properties.refundSubmissionAttempts()) {
                outcomes.unresolved(refund, "RECONCILIATION_REQUIRED", "SUBMISSION_ATTEMPTS_EXHAUSTED");
            } else submission.submit(intent, refund, MpAuditActor.scheduled());
            return;
        }
        var lease = UUID.randomUUID().toString();
        if (!claims.recovery(refund, lease, clock.instant().plusSeconds(90))) return;
        try {
            recovery.recoverEvidence(intent, MpAuditActor.scheduled());
            var current = requests.byKey(refund.companyId(), refund.key()).orElseThrow();
            if (current.status().equals("CONFIRMED")) return;
            outcomes.checked(refund, lease, false);
        } catch (RuntimeException failure) {
            outcomes.checked(refund, lease, true);
        }
    }
}
