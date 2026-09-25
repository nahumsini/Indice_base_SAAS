package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

@Component
class SquarePaymentEvidencePolicy {
    void require(SquareRecords.PaymentIntent intent, SquareTerminalGateway.Checkout checkout, JsonNode payment) {
        try {
            SquareCheckoutIdentityPolicy.check(checkout.paymentId().equals(payment.path("id").asText()));
            if (intent.squarePaymentId() != null && !intent.squarePaymentId().isBlank())
                SquareCheckoutIdentityPolicy.check(intent.squarePaymentId().equals(checkout.paymentId()));
            SquareCheckoutIdentityPolicy.check("COMPLETED".equals(payment.path("status").asText()));
            SquareCheckoutIdentityPolicy.money(payment.path("amount_money"), intent);
            SquareCheckoutIdentityPolicy.check(intent.squareLocationId().equals(payment.path("location_id").asText()));
            if (payment.hasNonNull("terminal_checkout_id"))
                SquareCheckoutIdentityPolicy.check(checkout.id().equals(payment.path("terminal_checkout_id").asText()));
            if (payment.path("device_details").hasNonNull("device_id"))
                SquareCheckoutIdentityPolicy.check(intent.squareDeviceId().equals(payment.path("device_details").path("device_id").asText()));
            zero(payment.path("tip_money"));
            zero(payment.path("refunded_money"));
            SquareCheckoutIdentityPolicy.check(!payment.path("refund_ids").isArray() || payment.path("refund_ids").isEmpty());
            if (payment.hasNonNull("total_money")) SquareCheckoutIdentityPolicy.money(payment.path("total_money"), intent);
        } catch (Exception invalid) {
            throw new SquareGatewayException("Square payment does not match its POS attempt.", true, invalid);
        }
    }
    private void zero(JsonNode money) {
        if (!money.isMissingNode() && !money.isNull())
            SquareCheckoutIdentityPolicy.check(money.path("amount").isIntegralNumber() && money.path("amount").longValue() == 0);
    }
}
