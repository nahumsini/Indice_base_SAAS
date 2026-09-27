package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

class MpCompanyActivationTest {
    @Test void stateTimestampsChangeOnlyForActualTransitions() {
        var active = MpCompanyActivation.disabled().transition(MpActivationState.ACTIVE, 9, "pilot", MpTestFixtures.NOW);
        var reasonOnly = active.transition(MpActivationState.ACTIVE, 9, "updated", MpTestFixtures.NOW.plusSeconds(5));
        assertEquals(active.activatedAt(), reasonOnly.activatedAt()); assertNull(reasonOnly.suspendedAt());
        var suspended = reasonOnly.transition(MpActivationState.SUSPENDED, 9, "incident", MpTestFixtures.NOW.plusSeconds(10));
        assertEquals(MpTestFixtures.NOW.plusSeconds(10), suspended.suspendedAt());
    }
}
