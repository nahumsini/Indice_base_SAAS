package com.indice.erp.pos.mercadopago;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MpPointResponseFlagsTest {
    @Test void cancellationRequiresCreatedProviderStateAndKnownOrderIdentity() {
        var created = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "providerState", "created");
        var result = new MpPaymentResult(null, null);
        assertTrue(result.response(created).canCancel());
        assertFalse(result.response(MpPaymentTestFixtures.intent()).canCancel());
        assertFalse(result.response(MpPaymentTestFixtures.change(created, "orderId", null)).canCancel());
    }
    @Test void onlyDefinitiveUnpaidFailurePermitsRetry() {
        var result = new MpPaymentResult(null, null);
        for (var status : new String[] {"DECLINED", "CANCELLED", "EXPIRED", "REFUNDED"}) {
            assertTrue(result.response(MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "status", status)).canRetry());
        }
        for (var status : new String[] {"WAITING", "UNCERTAIN", "APPROVED", "PARTIALLY_REFUNDED"}) {
            assertFalse(result.response(MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "status", status)).canRetry());
        }
    }
}
