package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MpPointActionRequiredRecoveryTest {
    private final MpPointGateway gateway = mock(MpPointGateway.class);
    private final MpActionRequiredRecovery service = new MpActionRequiredRecovery(gateway,
        new MpOrderOwnership(), MpPaymentTestFixtures.JSON);
    private ObjectNode generic() {
        return MpPaymentTestFixtures.JSON.read("""
            {"id":"987","collector_id":"12345","currency_id":"MXN","status":"approved",
             "status_detail":"accredited","transaction_amount":"70.00",
             "transaction_amount_refunded":"0.00","live_mode":false}
            """, ObjectNode.class);
    }
    private MpEvidence recover(ObjectNode generic, ObjectNode order, MpIntent intent) {
        when(gateway.getPayment("synthetic-token", "987")).thenReturn(generic);
        return service.verify(intent, order, "synthetic-token", MpPaymentTestFixtures.verifier().verify(intent, order));
    }
    @Test void authoritativeGenericPaymentCanRecoverPointPaymentWithoutReplacingPAYIdentity() {
        var order = MpPaymentTestFixtures.order().put("status", "action_required");
        var result = recover(generic(), order, MpPaymentTestFixtures.intent());
        assertEquals("APPROVED", result.status()); assertEquals("PAYtest", result.paymentId());
    }
    @ParameterizedTest @CsvSource({"id,988", "collector_id,foreign", "currency_id,USD",
        "status,refunded", "status_detail,review", "transaction_amount,70.01", "transaction_amount_refunded,1.00"})
    void invalidOrRefundedGenericPaymentCannotPromoteApproval(String field, String value) {
        var order = MpPaymentTestFixtures.order().put("status", "action_required");
        assertEquals("UNCERTAIN", recover(generic().put(field, value), order, MpPaymentTestFixtures.intent()).status());
    }
    @Test void wrongModeOrRefundHintNeverApproves() {
        var order = MpPaymentTestFixtures.order().put("status", "action_required");
        assertEquals("UNCERTAIN", recover(generic().put("live_mode", true), order, MpPaymentTestFixtures.intent()).status());
        order.put("status_detail", "partially_refunded");
        assertEquals("UNCERTAIN", recover(generic(), order, MpPaymentTestFixtures.intent()).status());
    }
    @Test void malformedPointPaymentIdentityCannotBePromotedByGenericFallback() {
        var intent = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "paymentId", null);
        var order = MpPaymentTestFixtures.order().put("status", "action_required");
        MpPaymentTestFixtures.transaction(order).put("id", "bad-point-payment");
        assertEquals("UNCERTAIN", recover(generic(), order, intent).status());
    }
}
