package com.indice.erp.pos.mercadopago;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = {MpPaymentCreationController.class, MpPaymentRequestQueryController.class})
public class MpPaymentSubmissionAdvice {
    @ExceptionHandler(MpPaymentNotSubmittedException.class)
    public ResponseEntity<MpPaymentSubmissionError> rejected(MpPaymentNotSubmittedException exception) {
        return ResponseEntity.status(exception.status()).body(MpPaymentSubmissionError.from(exception));
    }
}
