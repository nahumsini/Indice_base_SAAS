package com.indice.erp.finance.terminalrefunds;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TerminalRefundAdjustmentFailureRecorder {
    private final TerminalRefundAdjustmentQuery query;
    private final TerminalRefundAdjustmentPostingOutcome outcomes;
    public TerminalRefundAdjustmentFailureRecorder(TerminalRefundAdjustmentQuery query,
            TerminalRefundAdjustmentPostingOutcome outcomes) {
        this.query = query; this.outcomes = outcomes;
    }
    @Transactional
    public TerminalRefundAdjustment record(FinanceContext context, long id, long version,
            FinanceApiException failure) {
        var value = query.lock(context.companyId(), id);
        if (value.version() != version)
            throw FinanceApiException.conflict("Refund adjustment changed. Reload it.");
        if (!("APPROVED".equals(value.state()) || "FAILED".equals(value.state())))
            throw FinanceApiException.conflict("Refund adjustment is no longer ready to post.");
        return outcomes.failed(value, context.userId(), failure);
    }
}
