package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SquareWebhookIngressServiceTest {

    @Mock private SquareWebhookSignatureVerifier verifier;
    @Mock private SquareWebhookEventRepository events;
    @Mock private SquareConnectionRepository connections;
    @Mock private SquareTerminalRepository terminals;
    @Mock private SquarePaymentIntentRepository intents;
    @Mock private SquarePaymentFinalizer finalizer;
    @Mock private SquareAuditService audit;

    private SquareWebhookIngressService service;

    @BeforeEach
    void setUp() {
        service = new SquareWebhookIngressService(new SquareTerminalProperties(), verifier, events,
            connections, terminals, intents, new SquareCheckoutStatusMapper(), finalizer, audit, new ObjectMapper());
    }

    @Test
    void duplicateWebhookIsAcknowledgedWithoutReprocessingPayment() {
        given(events.ingest(org.mockito.ArgumentMatchers.any()))
            .willReturn(new SquareWebhookEventRepository.IngressResult(10L, true));

        var response = service.receive(payload(), "signature", "Sandbox");

        assertThat(response.duplicate()).isTrue();
        assertThat(response.status()).isEqualTo("duplicate");
        verifyNoInteractions(connections, terminals, intents, finalizer);
    }

    @Test
    void approvedCheckoutWebhookFinalizesThroughBackendOnce() {
        given(events.ingest(org.mockito.ArgumentMatchers.any()))
            .willReturn(new SquareWebhookEventRepository.IngressResult(10L, false));
        given(connections.findCompanyIdByMerchant("sandbox", "merchant-1")).willReturn(Optional.of(7L));
        given(intents.findByCheckout(7L, "co-1"))
            .willReturn(Optional.of(intent(SquareTerminalPaymentStatus.WAITING, null)),
                Optional.of(intent(SquareTerminalPaymentStatus.APPROVED, null)));

        var response = service.receive(payload(), "signature", "Sandbox");

        assertThat(response.status()).isEqualTo("processed");
        verify(intents).markGatewayStatus(org.mockito.ArgumentMatchers.eq(91L), org.mockito.ArgumentMatchers.any());
        verify(finalizer).finalizeIfApproved(7L, 91L);
        verify(events).markProcessed(10L, 7L, 91L, 51L);
    }

    @Test
    void alreadyFinalizedCheckoutWebhookDoesNotFinalizeAgain() {
        given(events.ingest(org.mockito.ArgumentMatchers.any()))
            .willReturn(new SquareWebhookEventRepository.IngressResult(10L, false));
        given(connections.findCompanyIdByMerchant("sandbox", "merchant-1")).willReturn(Optional.of(7L));
        given(intents.findByCheckout(7L, "co-1"))
            .willReturn(Optional.of(intent(SquareTerminalPaymentStatus.APPROVED, 500L)),
                Optional.of(intent(SquareTerminalPaymentStatus.APPROVED, 500L)));

        service.receive(payload(), "signature", "Sandbox");

        verify(finalizer, never()).finalizeIfApproved(7L, 91L);
    }

    private String payload() {
        return """
            {"event_id":"event-1","type":"terminal.checkout.updated","merchant_id":"merchant-1",
             "data":{"object":{"checkout":{"id":"co-1","status":"COMPLETED","payment_ids":["pay-1"]}}}}
            """;
    }

    private SquareRecords.PaymentIntent intent(SquareTerminalPaymentStatus status, Long ticketId) {
        return new SquareRecords.PaymentIntent(91L, 7L, 31L, 41L, 51L, "loc-1", "device-1",
            "key-1", "co-1", "pay-1", status, new BigDecimal("10.50"), "CAD", "hash", "{}",
            null, ticketId, 11L, "admin", "CORPORATE_OFFICE", null, null,
            Instant.parse("2026-08-28T20:00:00Z"), Instant.parse("2026-08-28T20:00:00Z"),
            Instant.parse("2026-08-28T20:05:00Z"));
    }
}
