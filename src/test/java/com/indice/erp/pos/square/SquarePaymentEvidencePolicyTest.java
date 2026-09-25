package com.indice.erp.pos.square;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class SquarePaymentEvidencePolicyTest {
    private final SquarePaymentEvidencePolicy policy = new SquarePaymentEvidencePolicy();
    @Test
    void acceptsCompletedExactPaymentWithoutOptionalBetaCheckoutField() throws Exception {
        var payment = SquareEvidenceFixtures.payment(1050L, "loc-1");
        assertThatCode(() -> policy.require(SquareEvidenceFixtures.intent(), SquareEvidenceFixtures.checkout(1050L, "device-1"), payment))
            .doesNotThrowAnyException();
    }
    @Test
    void wrongProviderAmountOrLocationCannotFinalizeStoredSale() throws Exception {
        var wrongAmount = SquareEvidenceFixtures.payment(1000L, "loc-1");
        var wrongLocation = SquareEvidenceFixtures.payment(1050L, "loc-2");
        var checkout = SquareEvidenceFixtures.checkout(1050L, "device-1");
        assertThatThrownBy(() -> policy.require(SquareEvidenceFixtures.intent(), checkout, wrongAmount)).isInstanceOf(SquareGatewayException.class);
        assertThatThrownBy(() -> policy.require(SquareEvidenceFixtures.intent(), checkout, wrongLocation)).isInstanceOf(SquareGatewayException.class);
    }
    @Test
    void refundedPaymentCannotCreateFreshPaidPosTicket() throws Exception {
        var payment = (com.fasterxml.jackson.databind.node.ObjectNode) SquareEvidenceFixtures.payment(1050L, "loc-1");
        payment.putObject("refunded_money").put("amount", 1050L).put("currency", "CAD");
        assertThatThrownBy(() -> policy.require(SquareEvidenceFixtures.intent(), SquareEvidenceFixtures.checkout(1050L, "device-1"), payment))
            .isInstanceOf(SquareGatewayException.class);
    }
}
