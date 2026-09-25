package com.indice.erp.pos.square;

import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;

class SquareRefundWebhookWakeupTest {
    @Test void unknownProviderRefundCannotCreateOrAuthorizeLocalMoney() {
        var refunds = mock(SquareRefundQueries.class); var intents = mock(SquarePaymentIntentRepository.class);
        var recovery = mock(SquareRefundRecovery.class); var events = mock(SquareWebhookEventRepository.class);
        var lease = new SquareWebhookEventClaims.Lease("lease-1");
        when(refunds.byProvider(7L, "refund-unknown")).thenReturn(java.util.Optional.empty());
        new SquareRefundWebhookWakeup(refunds, intents, recovery, events)
            .process(10L, lease, 7L, "refund-unknown");
        verify(events).markIgnored(eq(10L), eq(lease), eq(7L), anyString());
        verifyNoInteractions(intents, recovery);
    }
}
