package com.indice.erp.pos.settlement;

import java.math.BigDecimal;

public record SettlementRuleResponse(
    Long id,
    Long cashRegisterId,
    String paymentMethod,
    String currencyCode,
    Long destinationPaymentAccountId,
    String destinationPaymentAccountName,
    String destinationPaymentAccountType,
    BigDecimal destinationAvailableBalance,
    BigDecimal destinationPendingBalance,
    String settlementTiming,
    boolean enabled,
    String reviewStatus,
    long version
) {
}
