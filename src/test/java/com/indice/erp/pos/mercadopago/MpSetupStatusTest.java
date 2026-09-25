package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class MpSetupStatusTest {
    @Test void disabledFeatureCannotAdvertiseChargeReadinessOrReadCredentials() {
        var properties = new MpProperties();
        var store = mock(MpConnectionStore.class);
        var status = new MpSetupStatus(properties, store, new MpLiveActivationPolicy(true)).get(MpTestFixtures.context());
        assertFalse(status.enabled());
        assertFalse(status.connected());
        assertFalse(status.liveChargeAllowed());
        verifyNoInteractions(store);
    }
    @Test void connectedProductionRequiresSeparateApprovedPilotWhileSandboxCanProceed() {
        var properties = new MpProperties();
        properties.setEnabled(true);
        var store = mock(MpConnectionStore.class);
        when(store.find(42, "sandbox")).thenReturn(Optional.of(MpTestFixtures.connection()));
        assertTrue(new MpSetupStatus(properties, store, new MpLiveActivationPolicy(false)).get(MpTestFixtures.context()).liveChargeAllowed());
        properties.setEnvironment("production");
        var live = MpTestFixtures.productionConnection("ACTIVE");
        when(store.find(42,"production")).thenReturn(Optional.of(live));
        var blocked = new MpSetupStatus(properties, store, new MpLiveActivationPolicy(false)).get(MpTestFixtures.context());
        assertTrue(blocked.connected());
        assertEquals("ACTIVE", blocked.activationState());
        assertFalse(blocked.liveChargeAllowed());
        assertTrue(new MpSetupStatus(properties, store, new MpLiveActivationPolicy(true)).get(MpTestFixtures.context()).liveChargeAllowed());
        assertFalse(new MpLiveActivationPolicy(true).allows("unknown", "ACTIVE"));
    }
}
