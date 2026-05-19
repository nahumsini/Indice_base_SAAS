package com.indice.erp.hr.permissions;

import com.indice.erp.storage.ObjectStorageDisabledException;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = {
    HrPermissionManagementApiController.class,
    HrMyPermissionApiController.class
})
public class HrPermissionApiExceptionHandler {

    @ExceptionHandler(HrPermissionApiException.class)
    public ResponseEntity<?> handleApi(HrPermissionApiException ex) {
        return ResponseEntity.status(ex.status()).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<?> handleNotFound(NoSuchElementException ex) {
        return ResponseEntity.status(404).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(ObjectStorageDisabledException.class)
    public ResponseEntity<?> handleStorage(ObjectStorageDisabledException ex) {
        return ResponseEntity.status(503).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }
}
