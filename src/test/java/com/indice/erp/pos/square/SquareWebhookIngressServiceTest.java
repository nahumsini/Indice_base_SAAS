package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;

class SquareWebhookIngressServiceTest {
    @Test void duplicateWithoutRetryLeaseIsAcknowledgedWithoutProcessing() {
        var f=new SquareWebhookIngressFixture();
        when(f.events.ingest(any())).thenReturn(new SquareWebhookEventRepository.IngressResult(10,true));
        var response=f.service.receive(f.payload(),"signature","Sandbox");
        assertThat(response.duplicate()).isTrue(); assertThat(response.status()).isEqualTo("duplicate");
        verifyNoInteractions(f.ownership,f.intents,f.finalizer);
    }
    @Test void approvedCheckoutFinalizesThroughAuthoritativeRead() {
        var f=new SquareWebhookIngressFixture(); when(f.events.ingest(any())).thenReturn(new SquareWebhookEventRepository.IngressResult(10,false));
        when(f.claims.claim(10)).thenReturn(f.lease()); when(f.ownership.company("sandbox","merchant-1")).thenReturn(7L);
        f.checkout(); when(f.intents.findById(any(),eq(91L))).thenReturn(java.util.Optional.of(f.intent(SquareTerminalPaymentStatus.WAITING,null)),
            java.util.Optional.of(f.intent(SquareTerminalPaymentStatus.APPROVED,null)));
        assertThat(f.service.receive(f.payload(),"signature","Sandbox").status()).isEqualTo("processed");
        verify(f.finalizer).finalizeIfApproved(7,91); verify(f.events).markProcessed(10,f.lease(),7L,91L,51L);
    }
}
