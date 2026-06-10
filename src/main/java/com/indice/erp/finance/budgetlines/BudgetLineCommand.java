package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.status.BudgetHealthStatus;
import com.indice.erp.finance.status.BudgetStatus;
import java.math.BigDecimal;

record BudgetLineCommand(
    Long unitId,
    Long businessId,
    Long budgetId,
    String name,
    String categoryKey,
    BigDecimal plannedAmount,
    BigDecimal committedAmount,
    BigDecimal actualExpenseAmount,
    BigDecimal pettyCashIssuedAmount,
    BigDecimal pettyCashSettledAmount,
    BigDecimal availableAmount,
    BudgetHealthStatus healthStatus,
    String currencyCode,
    BudgetStatus status,
    String description,
    Long createdByUserId,
    Long updatedByUserId,
    String customFieldsJson,
    String metadataJson
) {
}
