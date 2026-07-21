package com.indice.erp.billing.signup;

import java.time.Instant;

public record BillingSignupIntent(
    long id,
    String publicReference,
    String idempotencyHash,
    String requestFingerprint,
    String status,
    String stripeCustomerId,
    String stripeCheckoutSessionId,
    String stripeSubscriptionId,
    String checkoutUrl,
    Instant checkoutExpiresAt
) {
}
