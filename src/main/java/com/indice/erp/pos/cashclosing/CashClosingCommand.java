package com.indice.erp.pos.cashclosing;

import java.math.BigDecimal;

public record CashClosingCommand(
        BigDecimal countedCashAmount,
        BigDecimal overShortAmount,
        String notes,
        String paymentsSummaryJson,
        String metadataJson) {
}
