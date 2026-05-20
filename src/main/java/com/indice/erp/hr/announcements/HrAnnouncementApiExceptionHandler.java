package com.indice.erp.hr.announcements;

import com.indice.erp.storage.ObjectStorageDisabledException;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = HrAnnouncementApiController.class)
public class HrAnnouncementApiExceptionHandler {

    @ExceptionHandler(HrAnnouncementApiException.class)
    public ResponseEntity<?> handleApi(HrAnnouncementApiException ex) {
        return ResponseEntity.status(ex.status()).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<?> handleNotFound(NoSuchElementException ex) {
        return ResponseEntity.status(404).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(ObjectStorageDisabledException.class)
    public ResponseEntity<?> handleStorage(ObjectStorageDisabledException ex) {
        return ResponseEntity.status(503).body(Map.of("message", ex.getMessage()));
    }
}
