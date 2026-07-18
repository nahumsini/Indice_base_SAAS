package com.indice.erp.kiosk.engine;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class KioskRateLimitExceptionHandler {

    @ExceptionHandler(KioskRateLimitExceededException.class)
    public ResponseEntity<Map<String, Object>> handle(KioskRateLimitExceededException failure) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header("Retry-After", String.valueOf(failure.retryAfterSeconds()))
            .body(Map.of(
                "message", "Too many requests. Try again later.",
                "retry_after_seconds", failure.retryAfterSeconds()
            ));
    }
}
