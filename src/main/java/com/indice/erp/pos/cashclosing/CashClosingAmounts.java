package com.indice.erp.pos.cashclosing;

import com.indice.erp.pos.cashclosing.dto.PaymentMethodSummary;
import java.math.BigDecimal;
import java.util.List;

public record CashClosingAmounts(
        BigDecimal openingCashAmount,
        BigDecimal cashSalesAmount,
        BigDecimal cashInAmount,
        BigDecimal cashOutAmount,
        BigDecimal safeDropAmount,
        BigDecimal correctionAmount,
        BigDecimal totalSalesAmount,
        BigDecimal totalRefundsAmount,
        int ticketsCount,
        List<PaymentMethodSummary> paymentsSummary) {

    public BigDecimal expectedCashAmount() {
        return openingCashAmount
            .add(cashSalesAmount)
            .add(cashInAmount)
            .subtract(cashOutAmount)
            .subtract(safeDropAmount)
            .add(correctionAmount);
    }
}
