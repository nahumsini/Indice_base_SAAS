package com.indice.erp.finance;

import org.springframework.http.HttpStatus;

public class FinanceApiException extends RuntimeException {

    private final HttpStatus status;

    public FinanceApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }

    public static FinanceApiException badRequest(String message) {
        return new FinanceApiException(HttpStatus.BAD_REQUEST, message);
    }

    public static FinanceApiException unauthorized(String message) {
        return new FinanceApiException(HttpStatus.UNAUTHORIZED, message);
    }

    public static FinanceApiException forbidden(String message) {
        return new FinanceApiException(HttpStatus.FORBIDDEN, message);
    }

    public static FinanceApiException notFound(String message) {
        return new FinanceApiException(HttpStatus.NOT_FOUND, message);
    }

    public static FinanceApiException conflict(String message) {
        return new FinanceApiException(HttpStatus.CONFLICT, message);
    }

    public static FinanceApiException tooManyRequests(String message) {
        return new FinanceApiException(HttpStatus.TOO_MANY_REQUESTS, message);
    }
}
