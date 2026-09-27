package com.indice.erp.pos.mercadopago;

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MpTerminalFeedTest {
    @Test void duplicateProviderIdentityRejectsWholeFeedBeforeMutation() {
        var terminal = new MpProviderDtos.Terminal("NEWLAND_N950__TEST0001", "store", "pos", "PDV");
        assertThrows(MpGatewayException.class,
            () -> MpTerminalFeed.supported(MpTestFixtures.connection(), List.of(terminal, terminal)));
    }
    @Test void productionFeedExcludesSandboxAndUnsupportedDevices() {
        var sandbox = new MpProviderDtos.Terminal("NEWLAND_N950__SBX0000001", "store", "pos", "PDV");
        var unknown = new MpProviderDtos.Terminal("UNKNOWN__DEVICE", "store", "pos", "PDV");
        assertTrue(MpTerminalFeed.supported(MpTestFixtures.productionConnection("ACTIVE"),
            List.of(sandbox, unknown)).isEmpty());
    }
}
