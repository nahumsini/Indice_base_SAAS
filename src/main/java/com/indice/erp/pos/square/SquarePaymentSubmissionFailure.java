package com.indice.erp.pos.square;

import org.springframework.stereotype.Component;

@Component
class SquarePaymentSubmissionFailure {
    private final SquarePaymentDependencies d;
    SquarePaymentSubmissionFailure(SquarePaymentDependencies d) { this.d=d; }
    void record(SquareRecords.PaymentIntent intent,boolean started,RuntimeException failure) {
        var state=started?SquareTerminalPaymentStatus.UNCERTAIN:SquareTerminalPaymentStatus.CANCELLED;
        var code=started?"SQUARE_SUBMISSION_UNVERIFIED":"SQUARE_NOT_SUBMITTED";
        var message=started?"Square checkout submission is uncertain. Recover this payment before retrying."
            :"Square checkout was not submitted.";
        try {
            d.intents().markGatewayStatus(intent.id(),new SquareRecords.GatewayStatus(
                intent.squareCheckoutId(),null,state,null,code,message));
            d.audit().recordIntent(intent,"PAYMENT_REQUEST_FAILED",state.name(),message);
        } catch (RuntimeException persistenceFailure) { failure.addSuppressed(persistenceFailure); }
    }
}
