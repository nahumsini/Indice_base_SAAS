package com.indice.erp.billing.signup;

import com.indice.erp.billing.stripe.StripeGatewayException;
import com.indice.erp.billing.stripe.StripePhaseTwoUnavailableException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackageClasses = BillingSignupController.class)
public class BillingSignupExceptionHandler {

    @ExceptionHandler(BillingSignupConflictException.class)
    public ResponseEntity<?> conflict(BillingSignupConflictException exception) {
        return response(HttpStatus.CONFLICT, "SIGNUP_IDEMPOTENCY_CONFLICT", exception.getMessage());
    }

    @ExceptionHandler(BillingSignupEmailVerificationException.class)
    public ResponseEntity<?> emailVerification(BillingSignupEmailVerificationException exception) {
        return response(exception.status(), exception.code(), exception.getMessage());
    }

    @ExceptionHandler(StripePhaseTwoUnavailableException.class)
    public ResponseEntity<?> unavailable(StripePhaseTwoUnavailableException exception) {
        return response(HttpStatus.SERVICE_UNAVAILABLE, "BILLING_CHECKOUT_UNAVAILABLE", exception.getMessage());
    }

    @ExceptionHandler(StripeGatewayException.class)
    public ResponseEntity<?> stripeFailure(StripeGatewayException exception) {
        return response(HttpStatus.BAD_GATEWAY, "BILLING_PROVIDER_ERROR", "The billing provider could not complete the request.");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> invalid(IllegalArgumentException exception) {
        var status = "Invalid CSRF token.".equals(exception.getMessage()) ? HttpStatus.FORBIDDEN : HttpStatus.BAD_REQUEST;
        return response(status, "INVALID_BILLING_REQUEST", exception.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<?> invalidConfiguration(IllegalStateException exception) {
        return response(HttpStatus.SERVICE_UNAVAILABLE, "BILLING_CONFIGURATION_INCOMPLETE", exception.getMessage());
    }

    private ResponseEntity<?> response(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(Map.of("code", code, "message", message));
    }
}
