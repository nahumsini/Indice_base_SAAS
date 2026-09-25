package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import org.springframework.stereotype.Component;

@Component
class SquarePaymentCancellation {
    private final SquarePaymentDependencies dependencies;
    private final SquarePaymentResponses responses;
    SquarePaymentCancellation(SquarePaymentDependencies dependencies, SquarePaymentResponses responses) {
        this.dependencies = dependencies;
        this.responses = responses;
    }
    SquareTerminalDtos.PaymentIntentResponse cancel(PosContext context, long id) {
        var intent = responses.require(context, id);
        if (intent.status() == SquareTerminalPaymentStatus.APPROVED || intent.posTicketId() != null)
            throw PosApiException.conflict("Approved Square payment cannot be cancelled from POS.");
        if (intent.squareCheckoutId() == null)
            throw PosApiException.conflict("Square charge outcome is unknown; recover the provider checkout before cancellation.");
        SquareRecords.GatewayStatus status;
        try {
            var checkout = dependencies.tokens().withToken(context,
                token -> dependencies.gateway().cancelCheckout(token, intent.squareCheckoutId()));
            status = dependencies.evidence().verify(context, intent, checkout);
        } catch (SquareGatewayException failed) {
            status = new SquareRecords.GatewayStatus(intent.squareCheckoutId(), null,
                SquareTerminalPaymentStatus.UNCERTAIN, null, "SQUARE_CANCEL", failed.getMessage());
        }
        dependencies.intents().markGatewayStatus(intent.id(), status);
        dependencies.audit().recordIntent(intent, "PAYMENT_CANCELLED", status.status().name(), status.failureMessage());
        return responses.finish(context, id, status.status() == SquareTerminalPaymentStatus.APPROVED);
    }
}
