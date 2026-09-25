package com.indice.erp.pos.checkout;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class TerminalCheckoutScopeTest {
    private final TerminalPaymentGuard guard = mock(TerminalPaymentGuard.class);
    private final TerminalCheckoutEvidenceRepository evidence = mock(TerminalCheckoutEvidenceRepository.class);
    private final ShiftRepository shifts = mock(ShiftRepository.class);
    private final CheckoutService checkout = mock(CheckoutService.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private final VerifiedTerminalCheckout bridge = new VerifiedTerminalCheckout(guard, evidence,
        new TerminalCheckoutSnapshotPolicy(mapper), shifts, checkout);
    @Test
    void neverMovesApprovedChargeToAnotherCashierShift() throws Exception {
        var context = TerminalCheckoutFixtures.context();
        var request = TerminalCheckoutFixtures.request();
        when(evidence.requireApproved(context, "MERCADO_PAGO", 1L))
            .thenReturn(TerminalCheckoutFixtures.evidence(10L, mapper.writeValueAsString(request)));
        when(shifts.findOpenByUserAndRegister(context, 20L)).thenReturn(Optional.of(TerminalCheckoutFixtures.shift(41L)));
        assertThatThrownBy(() -> bridge.checkout(context, request, "MERCADO_PAGO", 1L, 40L))
            .isInstanceOf(PosApiException.class).hasMessageContaining("original open shift");
        verify(checkout, never()).complete(any(), any());
    }
    @Test
    void rejectsAnotherActorsApprovedAttemptBeforeSaleMutation() throws Exception {
        var context = TerminalCheckoutFixtures.context();
        var request = TerminalCheckoutFixtures.request();
        when(evidence.requireApproved(context, "MERCADO_PAGO", 1L))
            .thenReturn(TerminalCheckoutFixtures.evidence(999L, mapper.writeValueAsString(request)));
        assertThatThrownBy(() -> bridge.checkout(context, request, "MERCADO_PAGO", 1L, 40L))
            .isInstanceOf(PosApiException.class).hasMessageContaining("scope changed");
        verify(checkout, never()).complete(any(), any());
    }
}
