package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.checkout.PersistedCheckoutReader;
import com.indice.erp.pos.checkout.dto.PosCheckoutResponse;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MpPointReceiptReplayTest {
    @Test void webhookCompletedReplayAlwaysReturnsPersistedReceiptAndNeverEnablesRetry() {
        var receipt = MpPaymentTestFixtures.JSON.read("{\"ticket\":{\"id\":81}}", PosCheckoutResponse.class);
        var checkout = mock(PersistedCheckoutReader.class);
        var approved = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "status", "APPROVED");
        var completed = MpPaymentTestFixtures.change(approved, "posTicketId", 81L);
        when(checkout.read(completed.context(), 81)).thenReturn(receipt);
        var response = new MpPaymentResult(null, checkout).response(completed);
        assertSame(receipt, response.checkout());
        assertEquals(81L, response.posTicketId());
        assertEquals("completed", response.saleState());
        assertFalse(response.canRetry()); assertFalse(response.canCancel());
        verify(checkout).read(completed.context(), 81);
    }
    @Test void paidButUnfinalizedIntentRequiresRecoveryAndKeepsRetryDisabled() {
        var approved = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "status", "APPROVED");
        var checkout = mock(PersistedCheckoutReader.class);
        var response = new MpPaymentResult(null, checkout).response(approved);
        assertEquals("approved", response.status());
        assertEquals("recovery_required", response.saleState());
        assertNull(response.checkout()); assertFalse(response.canRetry());
        verifyNoInteractions(checkout);
    }
}
