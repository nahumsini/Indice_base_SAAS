package com.indice.erp.pos.square;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
record SquareRefundRecoveryJob(SquareRefundPolicy policy, SquareRefundProperties properties,
        SquareRefundQueries refunds, SquarePaymentIntentRepository intents,
        SquareRefundSubmission submission, SquareRefundRecovery recovery,
        SquareRefundExhaustion exhaustion) {
    @Scheduled(fixedDelayString = "#{@squareRefundProperties.recoveryJobDelay()}")
    public void recover() {
        if (!policy.enabled()) return;
        for (var refund : refunds.due(25)) {
            try { handle(refund); }
            catch (RuntimeException failure) {
                org.slf4j.LoggerFactory.getLogger(SquareRefundRecoveryJob.class).warn(
                    "Square refund recovery failed for company {} request {}", refund.companyId(), refund.id());
            }
        }
    }
    private void handle(SquareRefundRecord refund) {
        var intent = intents.findById(refund.companyId(), refund.intentId()).orElseThrow();
        if (refund.providerRefundId() == null && refund.manualReplayAttempts() > 0) {
            exhaustion.manualReplayUnknown(refund); return;
        }
        if (refund.providerRefundId() == null && refund.status().equals("UNCERTAIN")) {
            exhaustion.requireReview(refund); return;
        }
        if (refund.providerRefundId() == null
                && java.util.Set.of("WAITING","SUBMITTING").contains(refund.status())) {
            if (refund.submissionAttempts() >= properties.submissionAttempts()) exhaustion.requireReview(refund);
            else submission.submit(intent, refund, SquareRefundActor.scheduled());
            return;
        }
        recovery.check(intent, refund, SquareRefundActor.scheduled(), null, false);
    }
}
