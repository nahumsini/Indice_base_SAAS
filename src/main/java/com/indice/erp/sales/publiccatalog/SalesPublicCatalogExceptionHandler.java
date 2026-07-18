package com.indice.erp.sales.publiccatalog;

import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = SalesPublicCatalogController.class)
public class SalesPublicCatalogExceptionHandler {

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<?> notFound(NoSuchElementException failure) {
        return response(HttpStatus.NOT_FOUND, failure.getMessage());
    }

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class})
    public ResponseEntity<?> badRequest(Exception failure) {
        return response(HttpStatus.BAD_REQUEST, failure.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<?> conflict(IllegalStateException failure) {
        return response(HttpStatus.CONFLICT, failure.getMessage());
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<?> forbidden(SecurityException failure) {
        return response(HttpStatus.FORBIDDEN, failure.getMessage());
    }

    private ResponseEntity<?> response(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of(
            "message", message == null || message.isBlank() ? status.getReasonPhrase() : message));
    }
}
