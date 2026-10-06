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
        List<PaymentMethodSummary> paymentsSummary,
        List<PaymentMethodSummary> refundsSummary) {

    public CashClosingAmounts(BigDecimal opening, BigDecimal cashSales, BigDecimal cashIn,
            BigDecimal cashOut, BigDecimal safeDrop, BigDecimal correction, BigDecimal sales,
            BigDecimal refunds, int count, List<PaymentMethodSummary> payments) {
        this(opening, cashSales, cashIn, cashOut, safeDrop, correction, sales, refunds, count,
            payments, List.of(new PaymentMethodSummary(com.indice.erp.pos.status.PaymentMethod.CARD, refunds, 0L)));
    }

    public BigDecimal refunded(com.indice.erp.pos.status.PaymentMethod method) {
        return refundsSummary.stream().filter(item -> item.paymentMethod() == method)
            .map(PaymentMethodSummary::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal expectedCashAmount() {
        return openingCashAmount
            .add(cashSalesAmount)
            .add(cashInAmount)
            .subtract(cashOutAmount)
            .subtract(safeDropAmount)
            .add(correctionAmount);
    }
}
