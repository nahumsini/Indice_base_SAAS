package com.indice.erp.pos.settlement;

import java.math.BigDecimal;
import java.time.Instant;

public record CashClosingSettlement(
    long id,
    long companyId,
    long cashClosingId,
    long shiftId,
    long cashRegisterId,
    Long unitId,
    Long businessId,
    String paymentMethod,
    String currencyCode,
    BigDecimal grossAmount,
    BigDecimal retainedCashAmount,
    BigDecimal transferableAmount,
    long destinationPaymentAccountId,
    String destinationPaymentAccountName,
    String settlementTiming,
    BigDecimal pendingAmount,
    BigDecimal settledAmount,
    BigDecimal varianceAmount,
    String status,
    String policySnapshotJson,
    Instant settledAt,
    Long settledByUserId,
    long version
) {
}
