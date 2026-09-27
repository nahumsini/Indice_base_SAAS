package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.junit.jupiter.api.Assertions.*;

class MpPointOrderOwnershipTest {
    private final MpOrderVerifier verifier = MpPaymentTestFixtures.verifier();
    @Test void onlyVerifiedMerchantTerminalSaleAndPaymentCanApprove() {
        var evidence = verifier.verify(MpPaymentTestFixtures.intent(), MpPaymentTestFixtures.order());
        assertEquals("APPROVED", evidence.status());
        assertEquals("PAYtest", evidence.paymentId());
        assertFalse(evidence.blocksFinalization());
        assertFalse(evidence.sanitizedJson().contains("reference_id"));
    }
    @ParameterizedTest @CsvSource({"user_id,foreign", "country_code,US", "type,online",
        "external_reference,another-sale", "id,ORDanother", "currency_id,USD"})
    void rejectsWrongProviderOwnership(String field, String value) {
        var order = MpPaymentTestFixtures.order().put(field, value);
        assertThrows(PosApiException.class, () -> verifier.verify(MpPaymentTestFixtures.intent(), order));
    }
    @Test void rejectsForeignDeviceAndEnvironment() {
        var order = MpPaymentTestFixtures.order();
        ((ObjectNode) order.path("config").path("point")).put("terminal_id", "NEWLAND_N950__FOREIGN");
        assertThrows(PosApiException.class, () -> verifier.verify(MpPaymentTestFixtures.intent(), order));
        var live = MpPaymentTestFixtures.order().put("live_mode", true);
        assertThrows(PosApiException.class, () -> verifier.verify(MpPaymentTestFixtures.intent(), live));
    }
    @Test void rejectsAmountAndPersistedPaymentSwap() {
        var wrongAmount = MpPaymentTestFixtures.order();
        MpPaymentTestFixtures.transaction(wrongAmount).put("amount", "70.01");
        assertThrows(PosApiException.class, () -> verifier.verify(MpPaymentTestFixtures.intent(), wrongAmount));
        var swapped = MpPaymentTestFixtures.order();
        MpPaymentTestFixtures.transaction(swapped).put("id", "PAYanother");
        assertThrows(PosApiException.class, () -> verifier.verify(MpPaymentTestFixtures.intent(), swapped));
    }
    @Test void rejectsMultipleTransactionsInsteadOfPickingOnePayment() {
        var order = MpPaymentTestFixtures.order();
        ((ObjectNode) order.path("transactions")).withArray("payments").addObject().put("id", "PAYanother");
        assertThrows(PosApiException.class, () -> verifier.verify(MpPaymentTestFixtures.intent(), order));
    }
}
