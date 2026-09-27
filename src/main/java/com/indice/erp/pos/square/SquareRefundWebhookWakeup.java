package com.indice.erp.pos.square;

import org.springframework.stereotype.Component;

@Component
record SquareRefundWebhookWakeup(SquareRefundQueries refunds,
        SquarePaymentIntentRepository intents, SquareRefundRecovery recovery,
        SquareWebhookEventRepository events) {
    void process(long eventId, SquareWebhookEventClaims.Lease lease,
            long companyId, String providerRefundId) {
        var refund = refunds.byProvider(companyId, providerRefundId).orElse(null);
        if (refund == null) {
            events.markIgnored(eventId, lease, companyId,
                "Square refund notification has no existing local request.");
            return;
        }
        var intent = intents.findById(companyId, refund.intentId()).orElseThrow();
        recovery.check(intent, refund, SquareRefundActor.webhook(), null, false);
        events.markProcessed(eventId, lease, companyId, intent.id(), intent.terminalId());
    }
}
