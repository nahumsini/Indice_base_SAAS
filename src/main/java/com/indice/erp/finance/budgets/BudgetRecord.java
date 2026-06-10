package com.indice.erp.finance.budgets;

import com.indice.erp.finance.status.BudgetStatus;
import java.time.Instant;
import java.time.LocalDate;

record BudgetRecord(
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
    String customFieldsJson,
    String metadataJson
) {
}
