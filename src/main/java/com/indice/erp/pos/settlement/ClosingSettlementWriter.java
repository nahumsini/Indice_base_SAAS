package com.indice.erp.pos.settlement;

import com.indice.erp.finance.treasury.TreasuryMovementCommand;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.shift.ShiftRecord;
import java.time.Instant;
import java.util.Map;

class ClosingSettlementWriter {
    private final CashClosingSettlementRepository repository;
    private final TreasuryService treasury;
    ClosingSettlementWriter(CashClosingSettlementRepository repository, TreasuryService treasury) {
        this.repository = repository;
        this.treasury = treasury;
    }
    void write(PosContext context, long closingId, ShiftRecord shift, CashRegisterRecord register,
            SettlementRuleResponse rule, ClosingSettlementTransfer transfer) {
        var deferred = "DEFERRED".equals(rule.settlementTiming());
        var zero = ClosingSettlementTransfer.ZERO;
        var settlement = repository.insert(context, closingId, shift.id(), register.id(), register.unitId(), register.businessId(),
            rule, transfer.gross(), transfer.retained(), transfer.transferable(), deferred ? transfer.transferable() : zero,
            deferred ? zero : transfer.transferable(), deferred ? "PENDING" : "SETTLED", PosJsonSupport.toJson(Map.of(
                "paymentMethod", rule.paymentMethod(), "currencyCode", rule.currencyCode(),
                "destinationPaymentAccountId", rule.destinationPaymentAccountId(), "settlementTiming", rule.settlementTiming(),
                "reviewStatus", rule.reviewStatus(), "verifiedRefundAmount",
                "CARD".equals(rule.paymentMethod()) ? transfer.gross().subtract(transfer.transferable()) : zero)));
        treasury.post(new TreasuryMovementCommand(context.companyId(), settlement.destinationPaymentAccountId(),
            register.unitId(), register.businessId(), settlement.currencyCode(), "POS", "CASH_CLOSING_SETTLEMENT", String.valueOf(settlement.id()),
            "POS_CLOSE:" + closingId + ":" + settlement.paymentMethod() + ":INITIAL",
            deferred ? zero : transfer.transferable(), deferred ? transfer.transferable() : zero,
            "Liquidación de corte POS · " + settlement.paymentMethod(), Instant.now(), context.userId(), null,
            "{\"cashClosingId\":" + closingId + "}"));
    }
}
