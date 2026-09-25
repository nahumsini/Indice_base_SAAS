package com.indice.erp.platformadmin;

import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice(assignableTypes = PlatformMpActivationController.class)
class PlatformMpActivationAdvice {
    @ExceptionHandler(PlatformAdminForbiddenException.class)
    ResponseEntity<?> forbidden() { return response(HttpStatus.FORBIDDEN, "PLATFORM_ACCESS_DENIED"); }
    @ExceptionHandler(NoSuchElementException.class)
    ResponseEntity<?> missing() { return response(HttpStatus.NOT_FOUND, "MP_CONNECTION_NOT_FOUND"); }
    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<?> conflict() { return response(HttpStatus.CONFLICT, "MP_ACTIVATION_CONFLICT"); }
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<?> invalid(IllegalArgumentException failure) {
        var csrf = "Invalid CSRF token.".equals(failure.getMessage());
        return response(csrf ? HttpStatus.FORBIDDEN : HttpStatus.BAD_REQUEST,
            csrf ? "INVALID_CSRF_TOKEN" : "MP_ACTIVATION_INVALID");
    }
    private ResponseEntity<?> response(HttpStatus status, String code) {
        return ResponseEntity.status(status).body(Map.of("code", code, "message", status.getReasonPhrase()));
    }
}
