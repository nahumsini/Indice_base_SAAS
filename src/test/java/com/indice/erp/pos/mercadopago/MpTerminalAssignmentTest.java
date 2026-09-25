package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpTerminalAssignmentTest {
    private final TerminalPaymentGuard guard = mock(TerminalPaymentGuard.class);
    private final CashRegisterService registers = mock(CashRegisterService.class);
    private final MpTerminalStore terminals = mock(MpTerminalStore.class);
    private final MpTerminalWriter writer = mock(MpTerminalWriter.class);
    private final MpTerminalAssignment service = new MpTerminalAssignment(guard, registers, terminals, writer,
        mock(MpMerchantTokens.class), mock(MpPaymentAudit.class), mock(MpSecrets.class));
    @Test void pendingOtherProviderBlocksAssignmentBeforeMutation() {
        doThrow(PosApiException.conflict("Recover payment.")).when(guard)
            .assertAssignmentAllowed(MpTestFixtures.context(), 9, "MERCADO_PAGO", 5L);
        assertThrows(PosApiException.class, () -> service.assign(MpTestFixtures.context(), 9, 5));
        verifyNoInteractions(terminals, writer);
        verify(guard).lockRegister(MpTestFixtures.context(), 9);
    }
    @Test void foreignRegisterAndPendingPaymentBlockUnassignment() {
        doThrow(PosApiException.notFound("Unavailable.")).when(guard).lockRegister(MpTestFixtures.context(), 9);
        assertThrows(PosApiException.class, () -> service.unassign(MpTestFixtures.context(), 9));
        verifyNoInteractions(writer, registers);
        reset(guard);
        doThrow(PosApiException.conflict("Recover payment.")).when(guard).assertNoPending(MpTestFixtures.context(), 9);
        assertThrows(PosApiException.class, () -> service.unassign(MpTestFixtures.context(), 9));
        verifyNoInteractions(writer);
    }
    @Test void configuringTerminalCannotBeAssignedOrMovedImplicitly() {
        when(terminals.require(MpTestFixtures.context(), 5, true)).thenReturn(MpTestFixtures.terminal("CONFIGURING", null));
        assertThrows(PosApiException.class, () -> service.assign(MpTestFixtures.context(), 9, 5));
        when(terminals.require(MpTestFixtures.context(), 5, true)).thenReturn(MpTestFixtures.terminal("READY", 8L));
        assertThrows(PosApiException.class, () -> service.assign(MpTestFixtures.context(), 9, 5));
        verifyNoInteractions(writer);
    }
}
