package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MpPaymentDispatchAdmissionTest {
    private final MpDispatchStore dispatch = mock(MpDispatchStore.class);
    private final MpMerchantTokens tokens = mock(MpMerchantTokens.class);
    private final MpTerminalStore terminals = mock(MpTerminalStore.class);
    private final MpTerminalVerification verification = mock(MpTerminalVerification.class);
    private final MpPaymentDispatchAdmission admission = new MpPaymentDispatchAdmission(dispatch,
        tokens, new MpLiveActivationPolicy(true), terminals, verification);
    @Test void dispatchRefreshesProofBeforeFinalAdmission() {
        var intent = MpPaymentTestFixtures.intent();
        when(dispatch.owns(intent, "lease")).thenReturn(true);
        when(tokens.connection(42)).thenReturn(MpTestFixtures.connection());
        when(terminals.require(intent.context(), 5, false)).thenReturn(MpTestFixtures.terminal("READY", 9L));
        assertDoesNotThrow(() -> admission.require(intent, "lease"));
        verify(verification).verify(intent.context(), intent.cashRegisterId());
        verify(dispatch, times(2)).owns(intent, "lease");
    }
    @Test void changedTerminalBindingFailsBeforeProviderSubmission() {
        var intent = MpPaymentTestFixtures.intent();
        when(dispatch.owns(intent, "lease")).thenReturn(true);
        when(tokens.connection(42)).thenReturn(MpTestFixtures.connection());
        when(terminals.require(intent.context(), 5, false)).thenReturn(MpTestFixtures.terminal("READY", 8L));
        assertThrows(PosApiException.class, () -> admission.require(intent, "lease"));
    }
    @Test void failedProviderRefreshStopsFinalAdmission() {
        var intent = MpPaymentTestFixtures.intent();
        when(dispatch.owns(intent, "lease")).thenReturn(true);
        when(verification.verify(intent.context(), intent.cashRegisterId()))
            .thenThrow(PosApiException.serviceUnavailable("provider unavailable"));
        assertThrows(PosApiException.class, () -> admission.require(intent, "lease"));
        verifyNoInteractions(tokens, terminals);
        verify(dispatch).owns(intent, "lease");
    }
    @Test void expiredDispatchLeaseAfterRefreshStopsFinalAdmission() {
        var intent = MpPaymentTestFixtures.intent();
        when(dispatch.owns(intent, "lease")).thenReturn(true, false);
        assertThrows(PosApiException.class, () -> admission.require(intent, "lease"));
        verify(verification).verify(intent.context(), intent.cashRegisterId());
        verifyNoInteractions(tokens, terminals);
    }
}
