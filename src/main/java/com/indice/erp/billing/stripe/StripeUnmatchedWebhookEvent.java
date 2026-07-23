package com.indice.erp.billing.stripe;

record StripeUnmatchedWebhookEvent(
    long id,
    String stripeEventId,
    String eventType,
    String stripeSubscriptionId,
    String payloadSha256
) {
}
