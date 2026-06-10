package com.indice.erp.finance.budgets.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.finance.status.BudgetStatus;
import java.time.Instant;
import java.time.LocalDate;

public record BudgetResponse(
    Long id,
    Long companyId,
    Long unitId,
    Long businessId,
    String name,
    String description,
    LocalDate periodStart,
    LocalDate periodEnd,
    String currencyCode,
    BudgetStatus status,
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
