package com.indice.erp.pos.square;

import com.indice.erp.pos.settlement.*;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SquareRefundConfirmationTest {
    @Test void pendingEvidenceNeverCreatesMoneyAuthority() {
        var refunds = mock(SquareRefundQueries.class); var intents = mock(SquarePaymentIntentRepository.class);
        var reversals = mock(TerminalRefundStore.class); var store = mock(SquareRefundConfirmationStore.class);
        var statuses = mock(SquareRefundIntentStatus.class); var audit = mock(SquareRefundAudit.class);
        var observed = SquareRefundFixtures.refund("PENDING", "refund-1", null);
        var refund = SquareRefundFixtures.refund("PENDING", "refund-1", "lease-1", 0, 0, 1, 5L);
        when(refunds.find(7L, 71L, true)).thenReturn(java.util.Optional.of(refund));
        when(intents.lockById(7L, 91L)).thenReturn(java.util.Optional.of(SquareRefundFixtures.intent()));
        var subject = new SquareRefundConfirmation(refunds, intents, reversals, store, statuses, audit);
        var evidence = new SquareRefundEvidence("refund-1", "payment-1", "PENDING",
            new BigDecimal("2.50"), "CAD", "{}");
        assertThatThrownBy(() -> subject.confirm(observed, "lease-1", evidence,
            SquareRefundActor.system(), null)).isInstanceOf(SquareRefundEvidenceException.class);
        verifyNoInteractions(reversals, store, statuses, audit);
    }
    @Test void exactCompletedEvidenceCreatesOneSharedSquareReversal() {
        var refunds = mock(SquareRefundQueries.class); var intents = mock(SquarePaymentIntentRepository.class);
        var reversals = mock(TerminalRefundStore.class); var store = mock(SquareRefundConfirmationStore.class);
        var statuses = mock(SquareRefundIntentStatus.class); var audit = mock(SquareRefundAudit.class);
        var observed = SquareRefundFixtures.refund("PENDING", "refund-1", null);
        var refund = SquareRefundFixtures.refund("PENDING", "refund-1", "lease-1", 0, 0, 1, 5L);
        when(refunds.find(7L, 71L, true)).thenReturn(java.util.Optional.of(refund));
        when(intents.lockById(7L, 91L)).thenReturn(java.util.Optional.of(SquareRefundFixtures.intent()));
        when(reversals.confirmed(7L, "SQUARE", 91L)).thenReturn(BigDecimal.ZERO);
        when(store.confirm(refund, "lease-1", "{}")).thenReturn(true);
        var confirmed = SquareRefundFixtures.refund("CONFIRMED", "refund-1", null, 1, 0, 1, 5L);
        when(refunds.find(7L, 71L, false)).thenReturn(java.util.Optional.of(confirmed));
        var evidence = new SquareRefundEvidence("refund-1", "payment-1", "COMPLETED",
            new BigDecimal("2.50"), "CAD", "{}");
        new SquareRefundConfirmation(refunds, intents, reversals, store, statuses, audit)
            .confirm(observed, "lease-1", evidence, SquareRefundActor.system(), null);
        var saved = org.mockito.ArgumentCaptor.forClass(TerminalRefundRecord.class);
        verify(reversals).record(saved.capture());
        assertThat(saved.getValue().providerCode()).isEqualTo("SQUARE");
        verify(statuses).apply(any(), eq(new BigDecimal("2.50")));
        verify(audit).record(confirmed, SquareRefundActor.system(), "REFUND_CONFIRMED",
            "CONFIRMED", null, 5L);
    }
}
