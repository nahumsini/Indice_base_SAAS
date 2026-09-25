package com.indice.erp.pos.settlement;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashclosing.CashClosingAmounts;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.status.PaymentMethod;
import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.List;

class ClosingSettlementCreation {
    private final CashClosingSettlementRepository repository;
    private final SettlementPolicyService policy;
    private final ClosingSettlementWriter writer;
    ClosingSettlementCreation(CashClosingSettlementRepository repository, SettlementPolicyService policy, ClosingSettlementWriter writer) {
        this.repository = repository;
        this.policy = policy;
        this.writer = writer;
    }
    List<CashClosingSettlement> create(PosContext context, long closingId, ShiftRecord shift,
            CashRegisterRecord register, CashClosingAmounts amounts, BigDecimal countedCash) {
        var rules = new EnumMap<PaymentMethod, SettlementRuleResponse>(PaymentMethod.class);
        policy.ensureCompatibilityPolicy(context, register, shift.currencyCode())
            .forEach(rule -> rules.put(PaymentMethod.valueOf(rule.paymentMethod()), rule));
        var byMethod = new EnumMap<PaymentMethod, BigDecimal>(PaymentMethod.class);
        amounts.paymentsSummary().forEach(payment -> byMethod.put(payment.paymentMethod(), payment.amount()));
        for (var method : List.of(PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.TRANSFER, PaymentMethod.WALLET)) {
            var transfer = ClosingSettlementTransfer.calculate(method, byMethod.get(method), register, amounts, countedCash);
            if (method != PaymentMethod.CASH && transfer.gross().signum() <= 0) continue;
            var rule = rules.get(method);
            if (rule == null || !rule.enabled() || rule.destinationPaymentAccountId() == null)
                throw PosApiException.conflict("Cash register settlement policy is incomplete.");
            if (transfer.transferable().signum() > 0) writer.write(context, closingId, shift, register, rule, transfer);
        }
        return repository.findByClosing(context, closingId);
    }
}
