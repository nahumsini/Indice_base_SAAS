package com.indice.erp.finance.terminalrefunds;

import com.indice.erp.finance.FinanceApiException;
import org.springframework.stereotype.Component;

@Component
public class TerminalRefundAdjustmentPostingOutcome {
    private final TerminalRefundAdjustmentQuery query;
    private final TerminalRefundAdjustmentTransitions transitions;
    private final TerminalRefundAdjustmentEvents events;
    public TerminalRefundAdjustmentPostingOutcome(TerminalRefundAdjustmentQuery query,
            TerminalRefundAdjustmentTransitions transitions, TerminalRefundAdjustmentEvents events) {
        this.query = query; this.transitions = transitions; this.events = events;
    }
    void posted(TerminalRefundAdjustment value, long movementId, long actor, String balance) {
        events.append(value, "POSTED:" + movementId, "TREASURY_POSTED",
            value.state(), "POSTED", actor, balance);
    }
    TerminalRefundAdjustment failed(TerminalRefundAdjustment value, long actor, FinanceApiException failure) {
        var message = trim(failure.getMessage());
        if (!transitions.failed(value, failure.status().name(), message))
            throw FinanceApiException.conflict("Refund adjustment changed.");
        events.append(value, "FAILED:" + (value.version() + 1), "TREASURY_POST_FAILED",
            value.state(), "FAILED", actor, message);
        return query.get(value.companyId(), value.id());
    }
    TerminalRefundAdjustment reconcile(TerminalRefundAdjustment value, long actor,
            String code, String message) {
        if (!transitions.reconcile(value, code, message))
            throw FinanceApiException.conflict("Refund adjustment changed.");
        events.append(value, "RECONCILE:" + (value.version() + 1), "RECONCILIATION_REQUIRED",
            value.state(), "RECONCILIATION_REQUIRED", actor, message);
        return query.get(value.companyId(), value.id());
    }
    private String trim(String value) {
        var safe = value == null ? "Treasury posting failed." : value;
        return safe.length() <= 500 ? safe : safe.substring(0, 500);
    }
}
