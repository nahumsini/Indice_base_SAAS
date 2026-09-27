package com.indice.erp.finance.terminalrefunds;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.*;
import com.indice.erp.finance.treasury.*;
import com.indice.erp.pos.settlement.*;
import java.math.BigDecimal;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service public class TerminalRefundAdjustmentPostingAttempt implements TerminalRefundPostingOperation {
    private final TerminalRefundAdjustmentQuery query; private final TerminalRefundAdjustmentTransitions transitions;
    private final TerminalRefundAdjustmentPostingOutcome outcomes; private final TerminalRefundAdjustmentBalance balances;
    private final TerminalRefundSettlementLock settlements; private final TreasuryService treasury;
    public TerminalRefundAdjustmentPostingAttempt(TerminalRefundAdjustmentQuery query,
            TerminalRefundAdjustmentTransitions transitions, TerminalRefundAdjustmentPostingOutcome outcomes, TerminalRefundAdjustmentBalance balances,
            TerminalRefundSettlementLock settlements, TreasuryService treasury) {
        this.query=query; this.transitions=transitions; this.outcomes=outcomes; this.balances=balances; this.settlements=settlements; this.treasury=treasury;
    }
    @Transactional @Override public TerminalRefundAdjustment post(FinanceContext context, long id, long version) {
        var value = query.lock(context.companyId(), id);
        if ("POSTED".equals(value.state())) return value;
        if (value.version() != version) throw FinanceApiException.conflict("Refund adjustment changed. Reload it.");
        if (!("APPROVED".equals(value.state()) || "FAILED".equals(value.state())))
            throw FinanceApiException.conflict("Approve the refund adjustment before posting it.");
        if (value.paymentAccountId() == null || value.settlementId() == null)
            return outcomes.reconcile(value, context.userId(), "ACCOUNT_LINK_MISSING", "Resolve the original settlement account link.");
        var settlement=settlements.lock(value.companyId(), value.settlementId()).orElse(null); var balance=settlement==null?null:settlement.postingBalance();
        if (balance == null) return outcomes.reconcile(value, context.userId(),
            "SETTLEMENT_STATE_INVALID", "Review the closing settlement state.");
        if ("PENDING".equals(balance) && settlement.pendingAmount()
                .subtract(balances.postedPending(value.companyId(), value.settlementId())).compareTo(value.amount()) < 0)
            return outcomes.reconcile(value, context.userId(), "PENDING_AMOUNT_MISMATCH",
                "Refund exceeds the remaining pending settlement.");
        var zero = BigDecimal.ZERO.setScale(4);
        var command = new TreasuryMovementCommand(value.companyId(), value.paymentAccountId(), value.unitId(),
            value.businessId(), value.currencyCode(), "POS", "TERMINAL_REFUND_ADJUSTMENT", String.valueOf(value.id()),
            "POS_REFUND_ADJUSTMENT:" + value.id(), "AVAILABLE".equals(balance) ? value.amount().negate() : zero,
            "PENDING".equals(balance) ? value.amount().negate() : zero, "Ajuste por reembolso de terminal",
            Instant.now(), context.userId(), null, FinanceJsonSupport.toJson(java.util.Map.of(
                "cashClosingId",value.closingId(),"providerRefundId",value.providerRefundId())));
        final TreasuryMovementResult movement;
        try { movement = treasury.post(command); }
        catch (FinanceApiException failure) { throw new TerminalRefundPostingFailure(failure); }
        if (!transitions.posted(value, movement.movementId(), balance))
            throw FinanceApiException.conflict("Refund adjustment changed.");
        outcomes.posted(value, movement.movementId(), context.userId(), balance);
        return query.get(value.companyId(), value.id());
    }
}
