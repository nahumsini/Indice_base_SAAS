package com.indice.erp.pos.settlement;

import com.indice.erp.finance.treasury.TreasuryMovementCommand;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import java.time.Instant;
import java.util.Map;

class SettlementConfirmation {
    private final CashClosingSettlementRepository repository;
    private final TreasuryService treasury;
    private final TerminalRefundAdjustmentBalance refunds;
    SettlementConfirmation(CashClosingSettlementRepository repository, TreasuryService treasury,
            TerminalRefundAdjustmentBalance refunds) {
        this.repository = repository;
        this.treasury = treasury;
        this.refunds = refunds;
    }
    CashClosingSettlement confirm(PosContext context, long closingId, long id, ConfirmSettlementRequest request) {
        var settlement = repository.lockById(context, closingId, id)
            .orElseThrow(() -> PosApiException.notFound("Cash closing settlement not found."));
        var received = ClosingSettlementTransfer.money(request.receivedAmount());
        if (!"PENDING".equals(settlement.status())) {
            if (("SETTLED".equals(settlement.status()) || "RECONCILIATION_REQUIRED".equals(settlement.status()))
                    && settlement.settledAmount().compareTo(received) == 0) return settlement;
            throw PosApiException.conflict("Cash closing settlement is not pending.");
        }
        var refund = refunds == null ? ClosingSettlementTransfer.ZERO
            : refunds.postedPending(context.companyId(), settlement.id());
        var pending = ClosingSettlementTransfer.money(settlement.pendingAmount().subtract(refund));
        if (pending.signum() < 0) throw PosApiException.conflict("Posted refunds exceed the pending settlement.");
        var variance = ClosingSettlementTransfer.money(received.subtract(pending));
        var note = request.note() == null ? "" : request.note().trim();
        if (variance.signum() != 0 && note.length() < 8)
            throw PosApiException.badRequest("A settlement difference requires a note of at least 8 characters.");
        var status = variance.signum() == 0 ? "SETTLED" : "RECONCILIATION_REQUIRED";
        treasury.post(new TreasuryMovementCommand(context.companyId(), settlement.destinationPaymentAccountId(), settlement.unitId(),
            settlement.businessId(), settlement.currencyCode(), "POS", "CASH_CLOSING_CONFIRMATION", String.valueOf(settlement.id()),
            "POS_CLOSE:" + closingId + ":" + settlement.paymentMethod() + ":CONFIRM", received, pending.negate(),
            "Confirmación de liquidación POS · " + settlement.paymentMethod(), Instant.now(), context.userId(), null,
            PosJsonSupport.toJson(Map.of("note", note, "variance", variance))));
        if (!repository.confirm(context, settlement, received, variance, status, note))
            throw PosApiException.conflict("Cash closing settlement changed while it was being confirmed.");
        return repository.lockById(context, closingId, id).orElseThrow();
    }
}
