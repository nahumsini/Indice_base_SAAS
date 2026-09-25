package com.indice.erp.pos.mercadopago;

import java.util.function.Function;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpRefundProviderRecheckTest {
    @Test void recheckUsesAuthenticatedReadsAndNeverSubmitsRefund() {
        var tokens = mock(MpMerchantTokens.class); var gateway = mock(MpPointGateway.class);
        var verifier = mock(MpOrderVerifier.class); var action = mock(MpActionRequiredRecovery.class);
        var intent = MpPaymentTestFixtures.intent();
        var order = MpPaymentTestFixtures.JSON.read("{\"id\":\"ORD1\"}", com.fasterxml.jackson.databind.JsonNode.class);
        var initial = new MpEvidence("ORD1","PAY1","UNCERTAIN","processing",null,"{}",
            java.math.BigDecimal.ZERO,true);
        var finalEvidence = new MpEvidence("ORD1","PAY1","APPROVED","processed",null,"{}",
            java.math.BigDecimal.ZERO,false);
        when(tokens.connection(42)).thenReturn(MpTestFixtures.connection());
        when(tokens.withCompanyToken(eq(42L), any())).thenAnswer(call ->
            ((Function<String, ?>) call.getArgument(1)).apply("token"));
        when(gateway.getOrder("token", intent.orderId())).thenReturn(order);
        when(verifier.verify(intent, order)).thenReturn(initial);
        when(action.verify(intent, order, "token", initial)).thenReturn(finalEvidence);
        var result = new MpRefundProviderRecheck(tokens, gateway, verifier, action).read(intent);
        assertSame(finalEvidence, result.evidence());
        verify(gateway, never()).refundOrder(anyString(), anyString(), anyString(), anyString());
        verify(gateway, never()).createOrder(anyString(), anyString(), anyString());
    }
}
