package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MpPointProductionGateTest {
    @Test void productionChargeRequiresExplicitPhysicalPilotApproval() {
        var gate = new MpLiveActivationPolicy(false);
        assertThrows(PosApiException.class, () -> gate.requireChargeAllowed(MpTestFixtures.productionConnection("ACTIVE")));
        assertDoesNotThrow(() -> gate.requireChargeAllowed(MpTestFixtures.connection()));
        var approved = new MpLiveActivationPolicy(true);
        assertThrows(PosApiException.class, () -> approved.requireChargeAllowed(MpTestFixtures.productionConnection("DISABLED")));
        assertDoesNotThrow(() -> approved.requireChargeAllowed(MpTestFixtures.productionConnection("PILOT")));
        assertDoesNotThrow(() -> approved.requireChargeAllowed(MpTestFixtures.productionConnection("ACTIVE")));
    }
    @Test void refundFeatureRequiresSeparateTreasuryApproval() {
        assertThrows(PosApiException.class, () -> new MpRefundPolicy(false).requireEnabled());
        assertDoesNotThrow(() -> new MpRefundPolicy(true).requireEnabled());
    }
}
