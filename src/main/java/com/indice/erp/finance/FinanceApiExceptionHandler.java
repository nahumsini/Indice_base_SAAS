package com.indice.erp.finance;

import java.util.Map;
import java.util.NoSuchElementException;
import com.indice.erp.kiosk.engine.KioskUnavailableException;
import com.indice.erp.face.FaceVerificationIntegrationException;
import com.indice.erp.storage.ObjectStorageDisabledException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "com.indice.erp.finance")
public class FinanceApiExceptionHandler {

    @ExceptionHandler(FinanceApiException.class)
    public ResponseEntity<?> handleFinanceApi(FinanceApiException ex) {
        return ResponseEntity.status(ex.status()).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<?> handleNotFound(NoSuchElementException ex) {
        return ResponseEntity.status(404).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(KioskUnavailableException.class)
    public ResponseEntity<?> handleKioskUnavailable(KioskUnavailableException ex) {
        return ResponseEntity.status(404).body(Map.of("message", "Kiosk not found."));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<?> handleKioskSecurity(SecurityException ex) {
        var message = ex.getMessage() == null ? "Kiosk action is not allowed." : ex.getMessage();
        var status = message.toLowerCase().contains("authentication")
            || message.toLowerCase().contains("session") ? 401 : 403;
        return ResponseEntity.status(status).body(Map.of("message", message));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<?> handleStateConflict(IllegalStateException ex) {
        return ResponseEntity.status(409).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(FaceVerificationIntegrationException.class)
    public ResponseEntity<?> handleFaceIntegration(FaceVerificationIntegrationException ex) {
        return ResponseEntity.status(ex.statusCode()).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(ObjectStorageDisabledException.class)
    public ResponseEntity<?> handleStorageUnavailable(ObjectStorageDisabledException ex) {
        return ResponseEntity.status(503).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<?> handleUnsupported(UnsupportedOperationException ex) {
        return ResponseEntity.status(503).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", "Invalid request."));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<?> handleUnreadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", "Invalid request body."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> handleDataIntegrity(DataIntegrityViolationException ex) {
        return ResponseEntity.status(409).body(Map.of("message", "Finance record conflicts with existing data."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleUnexpected(Exception ex) {
        return ResponseEntity.status(500).body(Map.of("message", "Internal server error."));
    }
}
