package com.indice.erp.billing.stripe;

public class StripeEventProcessingException extends RuntimeException {

    private final String code;

    public StripeEventProcessingException(String code, String message) {
        super(message);
        this.code = code;
    }

    public StripeEventProcessingException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
