package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.checkout.dto.PosCheckoutPaymentRequest;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.status.ShiftStatus;
import java.math.BigDecimal;
import java.util.List;

final class TerminalCheckoutFixtures {
    private TerminalCheckoutFixtures() {}
    static PosContext context() {
        return new PosContext(10L, 1L, "Cashier", "admin", true, PosScope.businessOffice(5L, 6L));
    }
    static PosCheckoutRequest request() {
        return new PosCheckoutRequest(20L, null, null, "MXN", List.of(),
            List.of(new PosCheckoutPaymentRequest("CARD", null, BigDecimal.TEN, "MP PAY1")), null);
    }
    static TerminalCheckoutEvidence evidence(long user, String json) {
        return new TerminalCheckoutEvidence(20L, 40L, user, "admin", "BUSINESS_OFFICE", 5L, 6L,
            BigDecimal.TEN, "MXN", "PAY1", json);
    }
    static ShiftRecord shift(long id) {
        return new ShiftRecord(id, 1L, 5L, 6L, 30L, 20L, "Register", 10L, null, ShiftStatus.OPEN,
            BigDecimal.ZERO, BigDecimal.ZERO, null, null, "MXN", null, null, null, null,
            10L, null, null, null, 0L, null, null);
    }
}
