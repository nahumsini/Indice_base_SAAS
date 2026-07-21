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
    Instant checkoutExpiresAt,
    String provisioningStatus,
    Long companyId,
    Long ownerUserId,
    Long ownerUserCompanyId
) {

    public BillingSignupIntent(
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
        this(
            id, publicReference, idempotencyHash, requestFingerprint, status,
            stripeCustomerId, stripeCheckoutSessionId, stripeSubscriptionId,
            checkoutUrl, checkoutExpiresAt, "NOT_STARTED", null, null, null
        );
    }

    public boolean provisioned() {
        return "PROVISIONED".equals(provisioningStatus) && companyId != null;
    }
}
