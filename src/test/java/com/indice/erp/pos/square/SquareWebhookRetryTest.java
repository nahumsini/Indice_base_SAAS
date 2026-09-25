package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;

class SquareWebhookRetryTest {
    @Test void duplicateWithRetryLeaseRechecksProvider() {
        var f=ready(true); f.checkout();
        when(f.intents.findById(any(),eq(91L))).thenReturn(java.util.Optional.of(f.intent(SquareTerminalPaymentStatus.WAITING,null)),
            java.util.Optional.of(f.intent(SquareTerminalPaymentStatus.APPROVED,null)));
        assertThat(f.service.receive(f.payload(),"signature","Sandbox").status()).isEqualTo("processed");
        verify(f.gateway).getCheckout("token","co-1");
    }
    @Test void providerReadFailureCannotFinalizeSignedNotification() {
        var f=ready(false);
        when(f.tokens.withCompanyToken(eq(7L),any())).thenThrow(new SquareGatewayException("unavailable",true,null));
        assertThat(f.service.receive(f.payload(),"signature","Sandbox").status()).isEqualTo("failed");
        verify(f.events).markFailed(eq(10L),eq(f.lease()),eq(7L),anyString()); verifyNoInteractions(f.finalizer);
    }
    private SquareWebhookIngressFixture ready(boolean duplicate) {
        var f=new SquareWebhookIngressFixture();
        when(f.events.ingest(any())).thenReturn(new SquareWebhookEventRepository.IngressResult(10,duplicate));
        when(f.claims.claim(10)).thenReturn(f.lease()); when(f.ownership.company("sandbox","merchant-1")).thenReturn(7L);
        return f;
    }
}
