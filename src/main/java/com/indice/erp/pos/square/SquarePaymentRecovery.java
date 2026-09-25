package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import org.springframework.stereotype.Component;

@Component
class SquarePaymentRecovery {
    private final SquarePaymentDependencies dependencies;
    private final SquarePaymentResponses responses;
    private final SquareCheckoutSearchRecovery search;
    SquarePaymentRecovery(SquarePaymentDependencies dependencies, SquarePaymentResponses responses,
            SquareCheckoutSearchRecovery search) {
        this.dependencies = dependencies;
        this.responses = responses;
        this.search = search;
    }
    SquareTerminalDtos.PaymentIntentResponse recover(PosContext context, long id) {
        var intent = responses.require(context, id);
        if (intent.squareCheckoutId() == null) {
            var checkout = search.find(context, intent);
            if (checkout == null) return dependencies.finalizer().response(intent, null);
            dependencies.intents().markSquareCreated(intent.id(), checkout.id(), null, checkout.rawJson());
            dependencies.audit().recordIntent(intent, "PAYMENT_CHECKOUT_RECOVERED", "WAITING",
                "Square checkout linked from authoritative search evidence.");
            intent = responses.require(context, id);
        }
        return responses.finish(context, id, refresh(context, intent));
    }
    boolean refresh(PosContext context, SquareRecords.PaymentIntent intent) {
        try {
            var checkout = context == null
                ? dependencies.tokens().withCompanyToken(intent.companyId(), token -> dependencies.gateway().getCheckout(token, intent.squareCheckoutId()))
                : dependencies.tokens().withToken(context, token -> dependencies.gateway().getCheckout(token, intent.squareCheckoutId()));
            var status = dependencies.evidence().verify(context, intent, checkout);
            dependencies.intents().markGatewayStatus(intent.id(), status);
            dependencies.audit().recordIntent(intent, "PAYMENT_RECOVERED", status.status().name(), status.failureMessage());
            return status.status() == SquareTerminalPaymentStatus.APPROVED;
        } catch (SquareGatewayException failed) {
            dependencies.intents().markGatewayStatus(intent.id(), new SquareRecords.GatewayStatus(intent.squareCheckoutId(), null,
                SquareTerminalPaymentStatus.UNCERTAIN, null, "SQUARE_GATEWAY", failed.getMessage()));
            dependencies.audit().recordIntent(intent, "PAYMENT_RECOVERY_FAILED", "UNCERTAIN", failed.getMessage());
            return false;
        }
    }
}
