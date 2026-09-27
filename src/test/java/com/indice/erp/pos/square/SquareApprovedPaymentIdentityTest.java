package com.indice.erp.pos.square;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SquareApprovedPaymentIdentityTest {
    @Test
    void mismatchingHistoricalPaymentIdentityKeepsApprovalHeldAndCannotFinalize() throws Exception {
        var f = new SquareApprovedRecoveryFixture("historical-payment");
        when(f.terminal.getCheckout("synthetic-token", "co-1")).thenReturn(SquareEvidenceFixtures.checkout(1050L, "device-1"));
        when(f.payments.payment("synthetic-token", "pay-1")).thenReturn(SquareEvidenceFixtures.payment(1050L, "loc-1"));
        f.recovery.recover(f.context, 91L);
        verify(f.finalizer, never()).finalizeIfApproved(anyLong(), anyLong());
        verify(f.finalizer).response(f.held, null);
        var status = ArgumentCaptor.forClass(SquareRecords.GatewayStatus.class);
        verify(f.intents).markGatewayStatus(eq(91L), status.capture());
        assertThat(status.getValue().status()).isEqualTo(SquareTerminalPaymentStatus.UNCERTAIN);
        assertThat(f.held.status()).isEqualTo(SquareTerminalPaymentStatus.APPROVED);
        assertThat(f.held.squarePaymentId()).isEqualTo("historical-payment");
    }
}
