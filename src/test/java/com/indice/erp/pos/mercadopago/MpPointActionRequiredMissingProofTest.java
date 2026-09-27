package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MpPointActionRequiredMissingProofTest {
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
    @ParameterizedTest @ValueSource(strings={"live_mode", "transaction_amount_refunded", "status_detail"})
    void omittedCriticalGenericPaymentEvidenceCannotApprove(String field) {
        var order = MpPaymentTestFixtures.order().put("status", "action_required");
        var generic = generic(); generic.remove(field);
        when(gateway.getPayment("synthetic-token", "987")).thenReturn(generic);
        var initial = MpPaymentTestFixtures.verifier().verify(MpPaymentTestFixtures.intent(), order);
        assertSame(initial, service.verify(MpPaymentTestFixtures.intent(), order, "synthetic-token", initial));
    }
    @Test void nonNumericReferenceCannotReachGenericPaymentApi() {
        var order = MpPaymentTestFixtures.order().put("status", "action_required");
        MpPaymentTestFixtures.transaction(order).put("reference_id", "not-numeric");
        var initial = MpPaymentTestFixtures.verifier().verify(MpPaymentTestFixtures.intent(), order);
        assertSame(initial, service.verify(MpPaymentTestFixtures.intent(), order, "synthetic-token", initial));
        verifyNoInteractions(gateway);
    }
}
