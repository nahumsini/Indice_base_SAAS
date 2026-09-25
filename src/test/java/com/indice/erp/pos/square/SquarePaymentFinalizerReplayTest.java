package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.checkout.PersistedCheckoutReader;
import com.indice.erp.pos.checkout.VerifiedTerminalCheckout;
import com.indice.erp.pos.checkout.TerminalCheckoutResponseFixtures;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.assertThat;

class SquarePaymentFinalizerReplayTest {
    @Test
    void pollingAfterWebhookReturnsPersistedReceiptWithoutAnotherCheckout() {
        var intents = mock(SquarePaymentIntentRepository.class);
        var checkout = mock(VerifiedTerminalCheckout.class);
        var snapshots = mock(SquareFinalizationSnapshot.class);
        var receipts = mock(PersistedCheckoutReader.class);
        var guard = mock(TerminalPaymentGuard.class);
        var context = new PosContext(10L, 1L, "Cashier", "admin", true, PosScope.corporateOffice());
        var intent = new SquareRecords.PaymentIntent(1L, 1L, 20L, 40L, 50L, "loc", "device", "key", "order", "payment",
            SquareTerminalPaymentStatus.APPROVED, BigDecimal.TEN, "MXN", "hash", "{}", null, 100L,
            10L, "admin", "CORPORATE_OFFICE", null, null, null, null, null);
        when(intents.findById(any(), eq(1L))).thenReturn(Optional.of(intent));
        when(intents.lockById(1L, 1L)).thenReturn(Optional.of(intent));
        when(snapshots.context(intent)).thenReturn(context);
        var sale = TerminalCheckoutResponseFixtures.response();
        when(receipts.readCommitted(context, 100L)).thenReturn(sale);
        var finalizer = new SquarePaymentFinalizer(intents, checkout, snapshots, receipts, guard);
        var response = finalizer.finalizeIfApproved(1L, 1L);
        assertThat(response.checkout()).isSameAs(sale);
        assertThat(response.posTicketId()).isEqualTo(100L);
        verify(checkout, never()).checkout(any(), any(), anyString(), anyLong(), anyLong());
        verify(intents, never()).markFinalized(anyLong(), anyLong());
        verify(receipts).readCommitted(context, 100L);
    }
}
