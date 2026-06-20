package com.indice.erp.pos;

import org.springframework.http.HttpStatus;

public class PosApiException extends RuntimeException {

    private final HttpStatus status;

    public PosApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }

    public static PosApiException badRequest(String message) {
        return new PosApiException(HttpStatus.BAD_REQUEST, message);
    }

    public static PosApiException forbidden(String message) {
        return new PosApiException(HttpStatus.FORBIDDEN, message);
    }

    public static PosApiException notFound(String message) {
        return new PosApiException(HttpStatus.NOT_FOUND, message);
    }

    public static PosApiException conflict(String message) {
        return new PosApiException(HttpStatus.CONFLICT, message);
    }
}
