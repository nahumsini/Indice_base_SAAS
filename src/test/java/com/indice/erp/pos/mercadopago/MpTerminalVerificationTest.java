package com.indice.erp.pos.mercadopago;

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpTerminalVerificationTest {
    private final MpTerminalStore terminals = mock(MpTerminalStore.class);
    private final MpTerminalVerificationLeaseStore leases = mock(MpTerminalVerificationLeaseStore.class);
    private final MpMerchantTokens tokens = mock(MpMerchantTokens.class);
    private final MpMerchantGateway gateway = mock(MpMerchantGateway.class);
    private final MpTerminalSynchronizationStore synchronization = mock(MpTerminalSynchronizationStore.class);
    private final MpTerminalVerification service = new MpTerminalVerification(terminals, leases, tokens, gateway, synchronization);
    @Test void freshMatchingTerminalNeedsNoProviderCall() {
        when(terminals.requireBinding(MpTestFixtures.context(), 9)).thenReturn(MpTestFixtures.terminal("READY", 9L));
        assertEquals(5, service.verify(MpTestFixtures.context(), 9).terminalId());
        verifyNoInteractions(leases, tokens, gateway, synchronization);
    }
    @Test void staleTerminalUsesAuthenticatedFullFeedBeforeReturningProof() {
        var stale = stale(); var fresh = MpTestFixtures.terminal("READY", 9L);
        var claim = new MpTerminalVerificationClaim(stale, "lease");
        when(terminals.requireBinding(any(), eq(9L))).thenReturn(stale, fresh);
        when(leases.claim(any(), eq(stale))).thenReturn(claim);
        when(tokens.connection(42)).thenReturn(MpTestFixtures.connection());
        var feed = List.of(new MpProviderDtos.Terminal(stale.providerTerminalId(), "store1", "pos1", "PDV"));
        when(tokens.withToken(any(), any())).thenReturn(feed);
        assertEquals(7, service.verify(MpTestFixtures.context(), 9).version());
        verify(synchronization).complete(MpTestFixtures.connection(), feed);
        verify(leases).complete(claim);
    }
    @Test void providerFailureMarksStaleWithoutApplyingPartialFeed() {
        var stale = stale(); var claim = new MpTerminalVerificationClaim(stale, "lease");
        when(terminals.requireBinding(any(), eq(9L))).thenReturn(stale);
        when(leases.claim(any(), eq(stale))).thenReturn(claim);
        when(tokens.connection(42)).thenReturn(MpTestFixtures.connection());
        when(tokens.withToken(any(), any())).thenThrow(new MpGatewayException(503, true));
        assertThrows(RuntimeException.class, () -> service.verify(MpTestFixtures.context(), 9));
        verify(leases).failed(claim); verifyNoInteractions(synchronization);
    }
    private MpTerminal stale() {
        var base = MpTestFixtures.terminal("READY", 9L);
        return new MpTerminal(base.id(),base.companyId(),base.connectionId(),base.providerTerminalId(),base.storeId(),
            base.posId(),base.name(),base.status(),base.operatingMode(),9L,base.providerLastSeenAt(),base.providerVerifiedAt(),
            "STALE",null,base.version(),null,null);
    }
}
