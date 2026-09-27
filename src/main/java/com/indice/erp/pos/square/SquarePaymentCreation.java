package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import org.springframework.stereotype.Component;

@Component
class SquarePaymentCreation {
    private final SquarePaymentDependencies dependencies;
    private final SquarePaymentReservation reservations;
    private final SquarePaymentResponses responses;
    private final SquarePaymentRecovery recovery;
    private final SquareLiveActivationPolicy activation;
    private final SquarePaymentSubmission submission;
    SquarePaymentCreation(SquarePaymentDependencies dependencies, SquarePaymentReservation reservations,
            SquarePaymentResponses responses, SquarePaymentRecovery recovery, SquareLiveActivationPolicy activation,
            SquarePaymentSubmission submission) {
        this.dependencies=dependencies; this.reservations=reservations; this.responses=responses;
        this.recovery=recovery; this.activation=activation; this.submission=submission;
    }
    SquareTerminalDtos.PaymentIntentResponse create(PosContext context,SquareTerminalDtos.CreatePaymentRequest request) {
        dependencies.secrets().requireEnabled();
        activation.require(context.companyId());
        var intent=reservations.reserve(context,request);
        if (intent.squareCheckoutId()!=null) return recovery.recover(context,intent.id());
        if (intent.status()!=SquareTerminalPaymentStatus.WAITING) return responses.status(context,intent.id());
        return submission.submit(context,intent);
    }
}
