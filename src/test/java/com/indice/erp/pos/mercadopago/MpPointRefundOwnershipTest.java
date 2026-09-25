package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MpPointRefundOwnershipTest {
    private final MpOrderVerifier verifier = MpPaymentTestFixtures.verifier();
    @Test void rejectsRefundForAnotherPaymentAndInvalidRefundIdentity() {
        var order = MpPaymentTestFixtures.order();
        MpPointRefundStateTest.addRefund(order, "REFtest", "processed", "20.00");
        ((ObjectNode) order.path("transactions").path("refunds").get(0)).put("transaction_id", "PAYforeign");
        assertThrows(PosApiException.class, () -> verifier.verify(MpPaymentTestFixtures.intent(), order));
        ((ObjectNode) order.path("transactions").path("refunds").get(0))
            .put("transaction_id", "PAYtest").put("id", "not-a-refund");
        assertThrows(PosApiException.class, () -> verifier.verify(MpPaymentTestFixtures.intent(), order));
    }
    @Test void rejectsOverRefundAndNegativeConfirmedMoney() {
        var over = MpPaymentTestFixtures.order();
        MpPointRefundStateTest.addRefund(over, "REFover", "processed", "70.01");
        assertThrows(PosApiException.class, () -> verifier.verify(MpPaymentTestFixtures.intent(), over));
        var negative = MpPaymentTestFixtures.order();
        MpPointRefundStateTest.addRefund(negative, "REFnegative", "processed", "-1.00");
        assertThrows(PosApiException.class, () -> verifier.verify(MpPaymentTestFixtures.intent(), negative));
    }
    @Test void duplicateRefundIdentityCannotInflateConfirmedCumulativeAmount() {
        var order = MpPaymentTestFixtures.order();
        MpPointRefundStateTest.addRefund(order, "REFsame", "processed", "35.00");
        MpPointRefundStateTest.addRefund(order, "REFsame", "processed", "35.00");
        assertThrows(PosApiException.class, () -> verifier.verify(MpPaymentTestFixtures.intent(), order));
    }
}
