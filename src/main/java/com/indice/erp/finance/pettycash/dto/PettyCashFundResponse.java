package com.indice.erp.finance.pettycash.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.finance.pettycash.PettyCashFundStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record PettyCashFundResponse(
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
    List<String> fundingMethods,
    List<String> spendingMethods,
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
    JsonNode customFields,
    JsonNode metadata
) {
}
