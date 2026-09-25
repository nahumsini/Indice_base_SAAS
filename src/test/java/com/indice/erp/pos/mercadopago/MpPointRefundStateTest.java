package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MpPointRefundStateTest {
    private final MpOrderVerifier verifier = MpPaymentTestFixtures.verifier();
    @Test void partialRefundHintWithoutConfirmedRefundNeverApproves() {
        var order = MpPaymentTestFixtures.order().put("status_detail", "partially_refunded");
        var evidence = verifier.verify(MpPaymentTestFixtures.intent(), order);
        assertEquals("UNCERTAIN", evidence.status());
        assertTrue(evidence.blocksFinalization());
        assertEquals(0, evidence.refundedAmount().signum());
    }
    @Test void processingRefundDoesNotCreateConfirmedRefundOrApprove() {
        var order = MpPaymentTestFixtures.order();
        addRefund(order, "REFtest", "processing", "20.00");
        var evidence = verifier.verify(MpPaymentTestFixtures.intent(), order);
        assertEquals("UNCERTAIN", evidence.status());
        assertEquals(0, evidence.refundedAmount().signum());
        assertTrue(evidence.blocksFinalization());
    }
    @Test void confirmedPartialAndFullRefundsBlockSaleCompletion() {
        var partial = MpPaymentTestFixtures.order();
        addRefund(partial, "REFpartial", "processed", "20.00");
        var evidence = verifier.verify(MpPaymentTestFixtures.intent(), partial);
        assertEquals("PARTIALLY_REFUNDED", evidence.status());
        assertEquals("20.00", evidence.refundedAmount().toPlainString());
        assertTrue(evidence.blocksFinalization());
        var full = MpPaymentTestFixtures.order().put("status", "refunded");
        addRefund(full, "REFfull", "processed", "70.00");
        assertEquals("REFUNDED", verifier.verify(MpPaymentTestFixtures.intent(), full).status());
    }
    @Test void orderRefundedWithoutConfirmedEvidenceRemainsUncertain() {
        var order = MpPaymentTestFixtures.order().put("status", "refunded");
        assertEquals("UNCERTAIN", verifier.verify(MpPaymentTestFixtures.intent(), order).status());
    }
    static void addRefund(ObjectNode order, String id, String status, String amount) {
        ((ObjectNode) order.path("transactions")).withArray("refunds").addObject()
            .put("id", id).put("status", status).put("amount", amount).put("transaction_id", "PAYtest");
    }
}
