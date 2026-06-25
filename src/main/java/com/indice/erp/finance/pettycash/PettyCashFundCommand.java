package com.indice.erp.finance.pettycash;

import java.math.BigDecimal;

record PettyCashFundCommand(
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
    String customFieldsJson,
    String metadataJson
) {
}
