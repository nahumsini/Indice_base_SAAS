package com.indice.erp.billing.stripe;

public class StripeGatewayException extends RuntimeException {

    public StripeGatewayException(String message, Throwable cause) {
        super(message, cause);
    }
}
