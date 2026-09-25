package com.indice.erp.pos.mercadopago;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpTerminalSyncTest {
    @Test void failedOrPartialProviderReadNeverDemotesMissingTerminals() {
        var tokens = mock(MpMerchantTokens.class);
        var gateway = mock(MpMerchantGateway.class);
        var synchronization = mock(MpTerminalSynchronizationStore.class);
        var terminals = mock(MpTerminalStore.class);
        var audit = mock(MpPaymentAudit.class);
        when(tokens.connection(42)).thenReturn(MpTestFixtures.connection());
        when(tokens.withToken(any(), any())).thenThrow(new MpGatewayException(503, true));
        var service = new MpTerminalSync(tokens, gateway, synchronization, terminals, audit);
        assertThrows(MpGatewayException.class, () -> service.sync(MpTestFixtures.context()));
        verifyNoInteractions(synchronization, terminals, audit);
    }
}
