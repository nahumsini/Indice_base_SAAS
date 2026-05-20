package com.indice.erp.hr.announcements;

import org.springframework.http.HttpStatus;

public class HrAnnouncementApiException extends RuntimeException {

    private final HttpStatus status;

    public HrAnnouncementApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }
}
