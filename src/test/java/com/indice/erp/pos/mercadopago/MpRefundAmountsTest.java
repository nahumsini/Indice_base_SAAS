package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;

class MpRefundAmountsTest {
    private final MpRefundAmounts amounts = new MpRefundAmounts();

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "20.01", "1.001"})
    void rejectsNonpositiveExcessAndFractionalCentAmounts(String value) {
        assertThrows(PosApiException.class, () -> amounts.requested(
            new MpRefundRequest("refund_key", new BigDecimal(value), "synthetic"), new BigDecimal("20.00")));
    }

    @Test void fullRefundUsesExactConfirmedRemainingBalance() {
        assertEquals(new BigDecimal("20.00"), amounts.requested(
            new MpRefundRequest("refund_key", null, "synthetic"), new BigDecimal("20.0000")));
    }
}
