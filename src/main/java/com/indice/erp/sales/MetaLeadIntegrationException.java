package com.indice.erp.sales;

import org.springframework.http.HttpStatus;

final class MetaLeadIntegrationException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    MetaLeadIntegrationException(String code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    String code() {
        return code;
    }

    HttpStatus status() {
        return status;
    }
}
