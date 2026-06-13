package com.indice.erp.finance.pettycash.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.finance.pettycash.PettyCashFundStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record CreatePettyCashFundRequest(
    Long unitId,
    Long businessId,
    Long budgetId,
    Long budgetLineId,
    Long paymentAccountId,
    Long fundingSourcePaymentAccountId,
    Long responsibleUserId,
    @NotBlank @Size(max = 180) String name,
    @NotBlank @Size(min = 3, max = 3) String currencyCode,
    @NotNull @DecimalMin("0.00") BigDecimal limitAmount,
    @DecimalMin("0.00") BigDecimal currentBalanceAmount,
    @Min(1) @Max(31) Integer cutOffDay,
    @Size(max = 180) String fundingSourceName,
    List<@Size(max = 80) String> fundingMethods,
    List<@Size(max = 80) String> spendingMethods,
    Boolean kioskEnabled,
    Boolean kioskUsesUniversalPin,
    @Size(max = 255) String kioskAccessUrl,
    @Size(max = 96) String kioskPublicToken,
    PettyCashFundStatus status,
    JsonNode customFields,
    JsonNode metadata
) {
}
