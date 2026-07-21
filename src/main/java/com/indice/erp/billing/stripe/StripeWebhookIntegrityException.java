package com.indice.erp.billing.stripe;

public class StripeWebhookIntegrityException extends RuntimeException {

    public StripeWebhookIntegrityException(String message) {
        super(message);
    }
}
