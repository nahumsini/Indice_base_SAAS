package com.indice.erp.billing.signup;

import org.springframework.http.HttpStatus;

public class BillingSignupEmailVerificationException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public BillingSignupEmailVerificationException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }
}
