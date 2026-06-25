package com.indice.erp.finance.paymentaccounts.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.finance.paymentaccounts.PaymentAccountStatus;
import com.indice.erp.finance.paymentaccounts.PaymentAccountType;
import java.math.BigDecimal;
import java.time.Instant;

public record PaymentAccountResponse(
    Long id,
    Long companyId,
    Long unitId,
    Long businessId,
    String name,
    PaymentAccountType type,
    String currencyCode,
    BigDecimal openingBalance,
    BigDecimal currentBalance,
    PaymentAccountStatus status,
    String description,
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
