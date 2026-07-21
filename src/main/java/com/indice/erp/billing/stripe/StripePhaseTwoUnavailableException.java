package com.indice.erp.billing.stripe;

public class StripePhaseTwoUnavailableException extends RuntimeException {

    public StripePhaseTwoUnavailableException(String message) {
        super(message);
    }

    public StripePhaseTwoUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
