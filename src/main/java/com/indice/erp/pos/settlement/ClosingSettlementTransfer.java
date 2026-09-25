package com.indice.erp.pos.settlement;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.cashclosing.CashClosingAmounts;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.status.PaymentMethod;
import java.math.BigDecimal;
import java.math.RoundingMode;

record ClosingSettlementTransfer(BigDecimal gross, BigDecimal retained, BigDecimal transferable) {
    static final BigDecimal ZERO = new BigDecimal("0.0000");
    static ClosingSettlementTransfer calculate(PaymentMethod method, BigDecimal grossValue,
            CashRegisterRecord register, CashClosingAmounts amounts, BigDecimal countedCash) {
        var gross = money(grossValue);
        var retained = method == PaymentMethod.CASH ? money(register.retainedCashAmount()).min(money(countedCash)) : ZERO;
        var transferable = method == PaymentMethod.CASH
            ? money(amounts.safeDropAmount().add(countedCash.subtract(retained).max(BigDecimal.ZERO))) : gross;
        if (method == PaymentMethod.CARD) {
            var refunded = money(amounts.totalRefundsAmount());
            if (refunded.signum() < 0 || refunded.compareTo(gross) > 0)
                throw PosApiException.conflict("Verified card refunds exceed the shift's card collections.");
            transferable = gross.subtract(refunded);
        }
        return new ClosingSettlementTransfer(gross, retained, transferable);
    }
    static BigDecimal money(BigDecimal value) {
        return (value == null ? ZERO : value).setScale(4, RoundingMode.HALF_UP);
    }
}
