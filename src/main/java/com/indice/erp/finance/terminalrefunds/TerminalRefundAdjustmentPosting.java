package com.indice.erp.finance.terminalrefunds;

import com.indice.erp.finance.shared.FinanceContext;
import org.springframework.stereotype.Service;

@Service
public class TerminalRefundAdjustmentPosting {
    private final TerminalRefundPostingOperation attempt;
    private final TerminalRefundAdjustmentFailureRecorder failures;
    public TerminalRefundAdjustmentPosting(TerminalRefundPostingOperation attempt,
            TerminalRefundAdjustmentFailureRecorder failures) {
        this.attempt = attempt; this.failures = failures;
    }
    public TerminalRefundAdjustment post(FinanceContext context, long id, long version) {
        try {
            return attempt.post(context, id, version);
        } catch (TerminalRefundPostingFailure failure) {
            return failures.record(context, id, version, failure.cause());
        }
    }
}
