package com.indice.erp.finance.budgets;

import com.indice.erp.finance.status.BudgetStatus;
import java.time.LocalDate;

record BudgetCommand(
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
    String customFieldsJson,
    String metadataJson
) {
}
