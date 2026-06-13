package com.indice.erp.finance.pettycash;

import java.math.BigDecimal;
import java.time.Instant;

record PettyCashFundRecord(
    Long id,
    Long companyId,
    Long unitId,
    Long businessId,
    Long budgetId,
    Long budgetLineId,
    Long paymentAccountId,
    Long fundingSourcePaymentAccountId,
    Long responsibleUserId,
    String name,
    String currencyCode,
    BigDecimal limitAmount,
    BigDecimal currentBalanceAmount,
    Integer cutOffDay,
    String fundingSourceName,
    String fundingMethodsJson,
    String spendingMethodsJson,
    Boolean kioskEnabled,
    Boolean kioskUsesUniversalPin,
    String kioskAccessUrl,
    String kioskPublicToken,
    PettyCashFundStatus status,
    Long createdByUserId,
    Long updatedByUserId,
    Instant createdAt,
    Instant updatedAt,
    Instant deletedAt,
    Long version,
    String customFieldsJson,
    String metadataJson
) {
}
