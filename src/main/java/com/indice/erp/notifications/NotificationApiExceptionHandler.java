package com.indice.erp.notifications;

import com.indice.erp.hr.announcements.HrAnnouncementApiException;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = NotificationApiController.class)
public class NotificationApiExceptionHandler {

    @ExceptionHandler(HrAnnouncementApiException.class)
    public ResponseEntity<?> handleApi(HrAnnouncementApiException ex) {
        return ResponseEntity.status(ex.status()).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<?> handleNotFound(NoSuchElementException ex) {
        return ResponseEntity.status(404).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<?> handleStatus(org.springframework.web.server.ResponseStatusException ex) {
        var code = ex.getReason() == null ? "notification_request_failed" : ex.getReason();
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("code", code, "message", code));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }
}
