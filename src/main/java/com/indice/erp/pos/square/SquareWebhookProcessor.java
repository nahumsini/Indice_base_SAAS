package com.indice.erp.pos.square;

import org.springframework.stereotype.Component;

@Component
class SquareWebhookProcessor {
    private final SquareMerchantOwnership ownership;
    private final SquareCheckoutWebhookWakeup checkouts;
    private final SquareDeviceWebhookWakeup devices;
    private final SquareRefundWebhookWakeup refunds;
    private final SquareWebhookEventRepository events;
    SquareWebhookProcessor(SquareMerchantOwnership ownership, SquareCheckoutWebhookWakeup checkouts,
            SquareDeviceWebhookWakeup devices, SquareRefundWebhookWakeup refunds,
            SquareWebhookEventRepository events) {
        this.ownership = ownership;
        this.checkouts = checkouts;
        this.devices = devices;
        this.refunds = refunds;
        this.events = events;
    }
    String process(long id, SquareWebhookEventClaims.Lease lease, SquareWebhookPayload payload) {
        Long company = null;
        try {
            company = ownership.company(payload.environment(), payload.merchantId());
            if (company == null) {
                events.markIgnored(id, lease, null, "Square merchant is not connected to an Indice company.");
                return "ignored";
            }
            if ("device.code.paired".equals(payload.eventType())) devices.process(id, lease, company, payload.objectId());
            else if (payload.eventType().startsWith("terminal.checkout.")) checkouts.process(id, lease, company, payload.objectId());
            else if (payload.eventType().startsWith("refund.")) refunds.process(id, lease, company, payload.objectId());
            else {
                events.markIgnored(id, lease, company, "Square event type is not used by POS.");
                return "ignored";
            }
            return "processed";
        } catch (RuntimeException failed) {
            events.markFailed(id, lease, company, "Square webhook verification or processing must be retried.");
            return "failed";
        }
    }
}
