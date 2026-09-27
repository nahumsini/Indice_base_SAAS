package com.indice.erp.pos.mercadopago;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.junit.jupiter.api.Assertions.*;

class MpPointPaidAmountPolicyTest {
    @ParameterizedTest @CsvSource({"paid_amount,69.99", "paid_amount,70.01", "tip_amount,1.00",
        "status,processing", "status_detail,pending"})
    void nonAuthoritativeOrDifferentPaymentCannotApprove(String field, String value) {
        var order = MpPaymentTestFixtures.order();
        MpPaymentTestFixtures.transaction(order).put(field, value);
        assertEquals("UNCERTAIN", MpPaymentTestFixtures.verifier().verify(MpPaymentTestFixtures.intent(), order).status());
    }
    @Test void localOrderTimeoutDoesNotChangeAuthoritativeWaitingState() {
        var expiredLocal = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "expiresAt", MpTestFixtures.NOW.minusSeconds(1));
        for (var state : new String[] {"created", "at_terminal"}) {
            var order = MpPaymentTestFixtures.order().put("status", state);
            assertEquals("WAITING", MpPaymentTestFixtures.verifier().verify(expiredLocal, order).status());
        }
    }
}
