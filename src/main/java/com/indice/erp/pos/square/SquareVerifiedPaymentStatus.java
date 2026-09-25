package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import org.springframework.stereotype.Component;

@Component
class SquareVerifiedPaymentStatus {
    private final SquareConnectionTokenService tokens;
    private final SquarePaymentEvidenceGateway gateway;
    private final SquareCheckoutEvidencePolicy checkouts;
    private final SquarePaymentEvidencePolicy payments;
    private final SquareCheckoutStatusMapper statuses;
    SquareVerifiedPaymentStatus(SquareConnectionTokenService tokens, SquarePaymentEvidenceGateway gateway,
            SquareCheckoutEvidencePolicy checkouts, SquarePaymentEvidencePolicy payments, SquareCheckoutStatusMapper statuses) {
        this.tokens = tokens;
        this.gateway = gateway;
        this.checkouts = checkouts;
        this.payments = payments;
        this.statuses = statuses;
    }
    SquareRecords.GatewayStatus verify(PosContext context, SquareRecords.PaymentIntent intent, SquareTerminalGateway.Checkout checkout) {
        var status = statuses.map(checkout);
        if (status.status() != SquareTerminalPaymentStatus.APPROVED) return status;
        checkouts.require(intent, checkout);
        var payment = context == null
            ? tokens.withCompanyToken(intent.companyId(), token -> gateway.payment(token, checkout.paymentId()))
            : tokens.withToken(context, token -> gateway.payment(token, checkout.paymentId()));
        payments.require(intent, checkout, payment);
        return status;
    }
}
