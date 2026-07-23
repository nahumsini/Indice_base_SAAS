package com.indice.erp.billing.stripe;

import java.time.Instant;

public final class StripeIdempotencyKeys {

    private StripeIdempotencyKeys() {
    }

    public static String signupCustomer(long intentId) {
        return "indice.signup_intent." + intentId + ".customer.create";
    }

    public static String signupCheckoutSession(long intentId) {
        return "indice.signup_intent." + intentId + ".checkout_session.create";
    }

    public static String subscriptionAction(long companyId, String subscriptionId, String action, Instant updatedAt) {
        return "indice.company." + companyId
            + ".subscription." + sanitize(subscriptionId)
            + "." + sanitize(action)
            + "." + updatedAtToken(updatedAt);
    }

    private static String updatedAtToken(Instant updatedAt) {
        return updatedAt == null ? "not_updated" : Long.toString(updatedAt.toEpochMilli());
    }

    private static String sanitize(String value) {
        var cleaned = value == null ? "" : value.trim();
        if (cleaned.isBlank()) {
            return "missing";
        }
        return cleaned.replaceAll("[^A-Za-z0-9_.-]", "_");
    }
}
