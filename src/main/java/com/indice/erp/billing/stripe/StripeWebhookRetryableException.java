package com.indice.erp.billing.stripe;

class StripeWebhookRetryableException extends IllegalStateException {

    private final String subscriptionId;

    StripeWebhookRetryableException(String subscriptionId) {
        super("Stripe subscription " + display(subscriptionId) + " is not locally available yet.");
        this.subscriptionId = display(subscriptionId);
    }

    String subscriptionId() {
        return subscriptionId;
    }

    private static String display(String value) {
        var cleaned = value == null ? "" : value.trim();
        return cleaned.isBlank() ? "unknown" : cleaned;
    }
}
