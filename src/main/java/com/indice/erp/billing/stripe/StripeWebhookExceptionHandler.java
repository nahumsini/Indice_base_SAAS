package com.indice.erp.billing.stripe;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackageClasses = StripeWebhookController.class)
public class StripeWebhookExceptionHandler {

    @ExceptionHandler(StripeWebhookSignatureException.class)
    public ResponseEntity<?> invalidSignature(StripeWebhookSignatureException exception) {
        return response(HttpStatus.BAD_REQUEST, "INVALID_STRIPE_SIGNATURE", exception.getMessage());
    }

    @ExceptionHandler(StripeWebhookIntegrityException.class)
    public ResponseEntity<?> invalidEvent(StripeWebhookIntegrityException exception) {
        return response(HttpStatus.CONFLICT, "STRIPE_EVENT_INTEGRITY_ERROR", exception.getMessage());
    }

    @ExceptionHandler(StripePhaseTwoUnavailableException.class)
    public ResponseEntity<?> unavailable(StripePhaseTwoUnavailableException exception) {
        return response(HttpStatus.SERVICE_UNAVAILABLE, "STRIPE_WEBHOOK_UNAVAILABLE", exception.getMessage());
    }

    private ResponseEntity<?> response(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(Map.of("code", code, "message", message));
    }
}
