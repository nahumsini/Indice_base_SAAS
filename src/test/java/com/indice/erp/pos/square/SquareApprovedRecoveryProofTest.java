package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SquareApprovedRecoveryProofTest {
    @Test
    void failedAuthoritativeGetRetainsApprovedHoldWithoutFinalizing() {
        var f = new SquareApprovedRecoveryFixture();
        when(f.terminal.getCheckout("synthetic-token", "co-1")).thenThrow(new SquareGatewayException("unavailable", true, null));
        f.recovery.recover(f.context, 91L);
        verify(f.finalizer, never()).finalizeIfApproved(anyLong(), anyLong());
        verify(f.finalizer).response(f.held, null);
        assertThat(f.held.status()).isEqualTo(SquareTerminalPaymentStatus.APPROVED);
    }
    @Test
    void refundedAuthoritativePaymentNeverFinalizesStaleApproval() throws Exception {
        var f = new SquareApprovedRecoveryFixture();
        when(f.terminal.getCheckout("synthetic-token", "co-1")).thenReturn(SquareEvidenceFixtures.checkout(1050L, "device-1"));
        var payment = (ObjectNode) SquareEvidenceFixtures.payment(1050L, "loc-1");
        payment.putObject("refunded_money").put("amount", 1050L).put("currency", "CAD");
        when(f.payments.payment("synthetic-token", "pay-1")).thenReturn(payment);
        f.recovery.recover(f.context, 91L);
        verify(f.finalizer, never()).finalizeIfApproved(anyLong(), anyLong());
        var status = ArgumentCaptor.forClass(SquareRecords.GatewayStatus.class);
        verify(f.intents).markGatewayStatus(eq(91L), status.capture());
        assertThat(status.getValue().status()).isEqualTo(SquareTerminalPaymentStatus.UNCERTAIN);
        verify(f.finalizer).response(f.held, null);
    }
    @Test
    void freshExactCheckoutAndCapturedPaymentMayFinalizeHeldApproval() throws Exception {
        var f = new SquareApprovedRecoveryFixture();
        when(f.terminal.getCheckout("synthetic-token", "co-1")).thenReturn(SquareEvidenceFixtures.checkout(1050L, "device-1"));
        when(f.payments.payment("synthetic-token", "pay-1")).thenReturn(SquareEvidenceFixtures.payment(1050L, "loc-1"));
        f.recovery.recover(f.context, 91L);
        verify(f.finalizer).finalizeIfApproved(7L, 91L);
    }
}
