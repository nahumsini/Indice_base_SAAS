package com.indice.erp.pos.checkout;

import com.indice.erp.pos.checkout.dto.PosCheckoutResponse;
import com.indice.erp.pos.ticket.dto.PosTicketResponse;
import com.indice.erp.pos.status.TicketStatus;
import java.math.BigDecimal;
import java.util.List;

public final class TerminalCheckoutResponseFixtures {
    private TerminalCheckoutResponseFixtures() {}
    public static PosCheckoutResponse response() {
        var ticket = new PosTicketResponse(100L, 1L, 5L, 6L, 30L, 20L, 40L, null, 500L,
            "POS-100", TicketStatus.COMPLETED, "POS", "MXN", BigDecimal.TEN, BigDecimal.ZERO,
            BigDecimal.ZERO, BigDecimal.TEN, BigDecimal.TEN, BigDecimal.ZERO, "Customer", null,
            null, null, 10L, null, null, null, 0L, null, null);
        return new PosCheckoutResponse(ticket, List.of(), List.of(), null);
    }
}
