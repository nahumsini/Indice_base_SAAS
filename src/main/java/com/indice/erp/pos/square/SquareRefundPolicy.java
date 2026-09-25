package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import org.springframework.stereotype.Component;

@Component
class SquareRefundPolicy {
    private final SquareRefundProperties refunds; private final SquareTerminalProperties square;
    SquareRefundPolicy(SquareRefundProperties refunds, SquareTerminalProperties square) {
        this.refunds=refunds; this.square=square;
    }
    void requireEnabled() {
        if (!square.isEnabled() || !refunds.isEnabled()) throw PosApiException.conflict(
            "Square refunds require approved Treasury reconciliation procedures.");
    }
    boolean enabled() { return square.isEnabled() && refunds.isEnabled(); }
}
