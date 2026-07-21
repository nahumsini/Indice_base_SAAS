package com.indice.erp.billing.stripe;

public class StripeWebhookSignatureException extends RuntimeException {

    public StripeWebhookSignatureException(String message, Throwable cause) {
        super(message, cause);
    }
}
