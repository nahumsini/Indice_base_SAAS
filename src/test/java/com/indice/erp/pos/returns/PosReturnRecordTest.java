package com.indice.erp.pos.returns;

import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PosReturnRecordTest {
    private PosReturnRecord sale(String status) {
        var refund = new PosReturnRefundState(4, "key", new BigDecimal("20.00"), status, "reason", Instant.now(), 3);
        return new PosReturnRecord(8, "POS-TEST", "COMPLETED", Instant.now(), new BigDecimal("70.00"),
            "MXN", "MERCADO_PAGO", 19L, "PARTIALLY_REFUNDED", new BigDecimal("70.00"), new BigDecimal("20.00"), refund);
    }

    @Test void manualReconciliationBlocksDuplicatesWhileDefiniteNonSubmissionAllowsANewRequest() {
        assertFalse(sale("RECONCILIATION_REQUIRED").summary().refundAvailable());
        assertFalse(sale("DEAD_LETTER").summary().refundAvailable());
        assertTrue(sale("NOT_SUBMITTED").summary().refundAvailable());
        assertTrue(sale("REJECTED").summary().refundAvailable());
        assertTrue(sale("FAILED").summary().refundAvailable());
    }
}
