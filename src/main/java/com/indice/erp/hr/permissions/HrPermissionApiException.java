package com.indice.erp.hr.permissions;

import org.springframework.http.HttpStatus;

public class HrPermissionApiException extends RuntimeException {

    private final HttpStatus status;

    public HrPermissionApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }
}
