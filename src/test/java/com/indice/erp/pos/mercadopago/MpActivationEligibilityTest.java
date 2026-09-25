package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

class MpActivationEligibilityTest {
    private final MpActivationEligibility policy = new MpActivationEligibility();
    @Test void enablingRequiresVerifiedProductionConnection() {
        assertDoesNotThrow(() -> policy.require(MpTestFixtures.productionConnection("DISABLED"), MpActivationState.ACTIVE));
        assertThrows(IllegalStateException.class,
            () -> policy.require(MpTestFixtures.connection(), MpActivationState.ACTIVE));
        var disconnected = MpActivationTestFixtures.connection("DISABLED", "RECONNECT_REQUIRED", "12345");
        assertThrows(IllegalStateException.class, () -> policy.require(disconnected, MpActivationState.PILOT));
        var wrongMerchant = MpActivationTestFixtures.connection("DISABLED", "CONNECTED", "different");
        assertThrows(IllegalStateException.class, () -> policy.require(wrongMerchant, MpActivationState.ACTIVE));
    }
    @Test void safetyStatesRemainAvailableWhenConnectionNeedsRepair() {
        var broken = MpActivationTestFixtures.connection("ACTIVE", "RECONNECT_REQUIRED", "different");
        assertDoesNotThrow(() -> policy.require(broken, MpActivationState.SUSPENDED));
        assertDoesNotThrow(() -> policy.require(broken, MpActivationState.DISABLED));
    }
}
