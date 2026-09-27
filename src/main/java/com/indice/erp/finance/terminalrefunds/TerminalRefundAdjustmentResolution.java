package com.indice.erp.finance.terminalrefunds;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.pos.settlement.TerminalRefundAdjustmentBalance;
import com.indice.erp.pos.settlement.TerminalRefundSettlementLock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TerminalRefundAdjustmentResolution {
    private final TerminalRefundAdjustmentQuery query; private final TerminalRefundAdjustmentEvidence evidence;
    private final TerminalRefundAdjustmentTransitions transitions; private final TerminalRefundAdjustmentEvents events;
    private final TerminalRefundAdjustmentBalance balances; private final TerminalRefundSettlementLock settlements;
    public TerminalRefundAdjustmentResolution(TerminalRefundAdjustmentQuery query, TerminalRefundAdjustmentEvidence evidence,
            TerminalRefundAdjustmentTransitions transitions, TerminalRefundAdjustmentEvents events,
            TerminalRefundAdjustmentBalance balances, TerminalRefundSettlementLock settlements) {
        this.query=query; this.evidence=evidence; this.transitions=transitions; this.events=events;
        this.balances=balances; this.settlements=settlements;
    }
    @Transactional
    public TerminalRefundAdjustment resolve(FinanceContext context, long id, String reason, long version) {
        var value = query.lock(context.companyId(), id);
        var note = reason == null ? "" : reason.trim();
        if (note.length() < 8 || note.length() > 500)
            throw FinanceApiException.badRequest("A resolution reason of 8 to 500 characters is required.");
        if (value.version() != version) throw FinanceApiException.conflict("Refund adjustment changed. Reload it.");
        if (!"RECONCILIATION_REQUIRED".equals(value.state()))
            throw FinanceApiException.conflict("Only an adjustment requiring reconciliation can be resolved.");
        var proof = evidence.load(value.companyId(), value.id());
        if (!proof.linked()) throw FinanceApiException.conflict("The original payment and settlement account still do not match.");
        var settlement = settlements.lock(value.companyId(), proof.settlementId()).orElseThrow(
            () -> FinanceApiException.conflict("The closing settlement is not ready for refund review."));
        if (!settlement.ready()) throw FinanceApiException.conflict("The closing settlement is not ready for refund review.");
        if ("PENDING".equals(settlement.status()) && settlement.pendingAmount()
                .subtract(balances.postedPending(value.companyId(), proof.settlementId())).compareTo(value.amount()) < 0)
            throw FinanceApiException.conflict("The refund exceeds the remaining pending settlement amount.");
        if (!transitions.resolved(value, proof)) throw FinanceApiException.conflict("Refund adjustment changed.");
        events.append(value, "RESOLVED:" + (version + 1), "RECONCILIATION_RESOLVED",
            value.state(), "PENDING_REVIEW", context.userId(), note);
        return query.get(value.companyId(), value.id());
    }
}
