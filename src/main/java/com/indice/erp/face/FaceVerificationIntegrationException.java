package com.indice.erp.face;

import org.springframework.http.HttpStatusCode;

public class FaceVerificationIntegrationException extends RuntimeException {

    private final HttpStatusCode statusCode;

    public FaceVerificationIntegrationException(HttpStatusCode statusCode, String message, Throwable cause) {
        super(message, cause);
        this.statusCode = statusCode;
    }

    public HttpStatusCode statusCode() {
        return statusCode;
    }
}
