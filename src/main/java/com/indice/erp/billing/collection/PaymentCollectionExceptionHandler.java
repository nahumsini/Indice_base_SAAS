package com.indice.erp.billing.collection;

import com.indice.erp.platformadmin.PlatformAdminForbiddenException;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = {PlatformPaymentCollectionController.class, PaymentCollectionRecoveryController.class})
public class PaymentCollectionExceptionHandler {
    @ExceptionHandler({SecurityException.class, PlatformAdminForbiddenException.class})
    ResponseEntity<?> forbidden(RuntimeException failure) { return response(HttpStatus.FORBIDDEN, "PAYMENT_REQUEST_FORBIDDEN", "You do not have permission for this payment request."); }
    @ExceptionHandler(NoSuchElementException.class)
    ResponseEntity<?> missing(NoSuchElementException failure) { return response(HttpStatus.NOT_FOUND, "PAYMENT_REQUEST_NOT_FOUND", "The requested company or payment request was not found."); }
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<?> invalid(IllegalArgumentException failure) { return response(HttpStatus.BAD_REQUEST, "INVALID_PAYMENT_REQUEST", failure.getMessage()); }
    @ExceptionHandler(PaymentCollectionException.class)
    ResponseEntity<?> conflict(PaymentCollectionException failure) { return response(HttpStatus.CONFLICT, failure.code(), failure.getMessage()); }
    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<?> unavailable(IllegalStateException failure) { return response(HttpStatus.CONFLICT, "PAYMENT_NOT_READY", "Payment is not available yet. Refresh the request or contact Indice."); }
    private ResponseEntity<?> response(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new PaymentCollectionContracts.Failure(code, message));
    }
}
