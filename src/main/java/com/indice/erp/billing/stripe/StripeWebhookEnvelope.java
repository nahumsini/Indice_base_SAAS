package com.indice.erp.billing.stripe;

import java.time.Instant;

public record StripeWebhookEnvelope(
    String eventId,
    String eventType,
    boolean livemode,
    String apiVersion,
    String objectId,
    String objectType,
    String payloadSha256,
    String rawPayload,
    Instant eventCreatedAt,
    Instant payloadRetentionUntil
) {
}
