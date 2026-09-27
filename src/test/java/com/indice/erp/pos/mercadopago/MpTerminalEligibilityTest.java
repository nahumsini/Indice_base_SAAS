package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MpTerminalEligibilityTest {
    @Test void providerReadyRequiresSupportedIdentityStorePosAndPdv() {
        assertTrue(MpTerminalEligibility.ready(provider("store", "pos", "PDV")));
        assertFalse(MpTerminalEligibility.ready(provider(" ", "pos", "PDV")));
        assertFalse(MpTerminalEligibility.ready(provider("store", "", "PDV")));
        assertFalse(MpTerminalEligibility.ready(provider("store", "pos", "STANDALONE")));
    }
    @Test void staleLocalEvidenceCannotAuthorizeCharge() {
        assertThrows(PosApiException.class, () -> MpTerminalEligibility.requireReady(terminal("STALE", 7), 9));
        assertThrows(PosApiException.class, () -> MpTerminalEligibility.requireReady(terminal("READY", 7), 8));
    }
    @Test void bindingVersionChangeInvalidatesProviderProof() {
        var proof = MpTerminalEligibility.requireReady(terminal("READY", 7), 9);
        assertThrows(PosApiException.class, () -> proof.requireSame(terminal("READY", 8)));
    }
    private MpProviderDtos.Terminal provider(String store, String pos, String mode) {
        return new MpProviderDtos.Terminal("NEWLAND_N950__TEST0001", store, pos, mode);
    }
    private MpTerminal terminal(String verification, long version) {
        return new MpTerminal(5, 42, 3, "NEWLAND_N950__TEST0001", "store", "pos", "Terminal", "READY",
            "PDV", 9L, MpTestFixtures.NOW, MpTestFixtures.NOW, verification, null, version, null, null);
    }
}
